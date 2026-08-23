"use client";

import { useCallback, useState } from "react";

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
        config: { revalidateOnMount: true, shouldRetryOnError: false },
    });

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
            await resultQuery.mutate(undefined, true);
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
        isLoading: resultQuery.isLoading,
        loadError: resultQuery.isError,
        busyKey,
        errorCode,
        retryEvaluation,
        startPractice,
        report,
        reload: () => resultQuery.mutate(undefined, true),
    };
}

export type ListeningResultController = ReturnType<typeof useListeningResultController>;
