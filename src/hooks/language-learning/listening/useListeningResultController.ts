"use client";

import { useCallback, useMemo, useState } from "react";

import { createIdempotencyKey } from "@/features/language-learning/listening/idempotency";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/navigation";
import { ApiResponseError } from "@/services/common/responseParser";
import { listeningService } from "@/services/language-learning/listeningService";
import type {
    ListeningEvaluationReportReason,
    ListeningTaskType,
} from "@/types/language-learning/listening";

export function useListeningResultController(sessionId: number) {
    const router = useRouter();
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);

    const resultQuery = useQuery({
        keys: ["listening-result", sessionId] as const,
        fetcher: (_key, id) => listeningService.getResult(id),
        config: {
            revalidateOnMount: true,
            shouldRetryOnError: false,
            refreshInterval: (data) =>
                data?.attempts.some((attempt) =>
                    attempt.tasks.some((task) =>
                        ["SUBMITTED", "EVALUATING"].includes(task.status),
                    ),
                )
                    ? 2_000
                    : 0,
        },
    });


    const evaluationState = useMemo(() => {
        const result = resultQuery.data;
        const official = result?.attempts.filter((attempt) =>
            attempt.evaluationPurpose === "OFFICIAL"
        ) ?? [];
        const selectedTasks = (attempt: (typeof official)[number]) =>
            attempt.tasks.filter((task) => task.status !== "NOT_SELECTED");
        const fullyEvaluated = official.filter((attempt) => {
            const tasks = selectedTasks(attempt);
            return attempt.overallScore !== null
                && attempt.coverage >= 1
                && tasks.length > 0
                && tasks.every((task) => task.status === "EVALUATED");
        });
        const evaluating = official.filter((attempt) =>
            selectedTasks(attempt).some((task) => ["SUBMITTED", "EVALUATING"].includes(task.status))
        );
        const evaluatingIds = new Set(evaluating.map((attempt) => attempt.attemptId));
        const failed = official.filter((attempt) =>
            !evaluatingIds.has(attempt.attemptId)
            && selectedTasks(attempt).some((task) => task.status === "EVALUATION_FAILED")
        );
        const failedTaskCount = official.reduce(
            (count, attempt) => count + selectedTasks(attempt).filter((task) => task.status === "EVALUATION_FAILED").length,
            0,
        );

        return {
            officialCount: official.length,
            evaluatedItemCount: fullyEvaluated.length,
            failedItemCount: failed.length,
            failedTaskCount,
            evaluatingItemCount: evaluating.length,
            hasInFlightEvaluation: evaluating.length > 0,
        };
    }, [resultQuery.data]);

    const retryEvaluation = useCallback(async (attemptId: number, taskType: ListeningTaskType) => {
        const key = `retry-${attemptId}-${taskType}`;
        if (busyKey) return false;
        setBusyKey(key);
        setErrorCode(null);
        try {
            await listeningService.retryEvaluation(attemptId, {
                taskType,
                idempotencyKey: createIdempotencyKey("listening-retry"),
            });
            await resultQuery.mutate((current) => current, true);
            return true;
        } catch (error) {
            setErrorCode(error instanceof ApiResponseError ? error.errorCode : "UNKNOWN");
            return false;
        } finally {
            setBusyKey(null);
        }
    }, [busyKey, resultQuery]);

    const retryFailedEvaluations = useCallback(async () => {
        if (busyKey) return false;
        setBusyKey(`retry-all-${sessionId}`);
        setErrorCode(null);
        try {
            await listeningService.retryFailedEvaluations(sessionId);
            await resultQuery.mutate((current) => current, true);
            return true;
        } catch (error) {
            setErrorCode(error instanceof ApiResponseError ? error.errorCode : "UNKNOWN");
            return false;
        } finally {
            setBusyKey(null);
        }
    }, [busyKey, resultQuery, sessionId]);

    const startPractice = useCallback(async (itemId: number, selectedTaskTypes: ListeningTaskType[]) => {
        if (busyKey) return false;
        setBusyKey(`practice-${itemId}`);
        setErrorCode(null);
        try {
            await listeningService.createPractice(sessionId, itemId, {
                idempotencyKey: createIdempotencyKey("listening-practice"),
                selectedTaskTypes,
            });
            router.push(`/language-learning/listening/session/${sessionId}`);
            return true;
        } catch (error) {
            setErrorCode(error instanceof ApiResponseError ? error.errorCode : "UNKNOWN");
            return false;
        } finally {
            setBusyKey(null);
        }
    }, [busyKey, router, sessionId]);

    const report = useCallback(async (
        taskResponseId: number,
        reasonCode: ListeningEvaluationReportReason,
        comment: string,
        consentToRetainAudio: boolean,
    ) => {
        if (busyKey) return false;
        setBusyKey(`report-${taskResponseId}`);
        setErrorCode(null);
        try {
            await listeningService.report(taskResponseId, {
                reasonCode,
                comment: comment.trim() || null,
                consentToRetainAudio,
                idempotencyKey: createIdempotencyKey("listening-report"),
            });
            return true;
        } catch (error) {
            setErrorCode(error instanceof ApiResponseError ? error.errorCode : "UNKNOWN");
            return false;
        } finally {
            setBusyKey(null);
        }
    }, [busyKey]);

    return {
        result: resultQuery.data ?? null,
        isLoading: resultQuery.data == null && resultQuery.isLoading,
        loadError: resultQuery.isError,
        busyKey,
        errorCode,
        evaluationState,
        retryEvaluation,
        retryFailedEvaluations,
        startPractice,
        report,
        reload: () => resultQuery.mutate((current) => current, true),
    };
}

export type ListeningResultController = ReturnType<typeof useListeningResultController>;
