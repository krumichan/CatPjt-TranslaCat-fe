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
        const submitted = official.filter((attempt) =>
            ["SUBMITTED", "EVALUATING", "EVALUATED", "NOT_EVALUABLE", "SKIPPED"].includes(attempt.status)
        );
        const terminal = official.filter((attempt) =>
            ["EVALUATED", "NOT_EVALUABLE", "SKIPPED"].includes(attempt.status)
        );
        const fullyEvaluated = official.filter((attempt) =>
            attempt.overallScore !== null
            && attempt.coverage >= 1
            && attempt.tasks
                .filter((task) => task.status !== "NOT_SELECTED")
                .every((task) => task.status === "EVALUATED")
        );
        return {
            officialCount: official.length,
            submittedCount: submitted.length,
            terminalCount: terminal.length,
            fullyEvaluatedCount: fullyEvaluated.length,
            allSettled: official.length > 0 && terminal.length === official.length,
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
        startPractice,
        report,
        reload: () => resultQuery.mutate((current) => current, true),
    };
}

export type ListeningResultController = ReturnType<typeof useListeningResultController>;
