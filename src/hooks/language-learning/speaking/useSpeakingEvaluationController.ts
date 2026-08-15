"use client";

import { useCallback, useMemo, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { speakingEvaluationService } from "@/services/language-learning/speakingEvaluationService";
import { speakingSessionService } from "@/services/language-learning/speakingSessionService";

export function useSpeakingEvaluationController(sessionId: number) {
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryError, setRetryError] = useState(false);

    const sessionQuery = useQuery({
        keys: ["speaking-evaluation-session", sessionId] as const,
        fetcher: (_key, id) => speakingSessionService.get(id),
        config: { revalidateOnMount: true, refreshInterval: 5_000 },
    });
    const evaluationQuery = useQuery({
        keys: ["speaking-evaluation", sessionId] as const,
        fetcher: (_key, id) => speakingEvaluationService.get(id),
        config: {
            revalidateOnMount: true,
            refreshInterval: (data) => {
                const status = data?.status;
                return !status || status === "PENDING" || status === "EVALUATING"
                    ? 3_000
                    : 0;
            },
            shouldRetryOnError: false,
        },
    });

    const isPending = useMemo(() => {
        const status =
            evaluationQuery.data?.status ??
            sessionQuery.data?.session.evaluationStatus;
        return status === "PENDING" || status === "EVALUATING";
    }, [
        evaluationQuery.data?.status,
        sessionQuery.data?.session.evaluationStatus,
    ]);

    const retry = useCallback(async () => {
        if (isRetrying) return false;
        setIsRetrying(true);
        setRetryError(false);
        try {
            await speakingEvaluationService.retry(sessionId);
            await Promise.all([
                evaluationQuery.mutate(undefined, true),
                sessionQuery.mutate(undefined, true),
            ]);
            return true;
        } catch (error) {
            console.error("Failed to retry speaking evaluation.", error);
            setRetryError(true);
            return false;
        } finally {
            setIsRetrying(false);
        }
    }, [evaluationQuery, isRetrying, sessionId, sessionQuery]);

    return {
        session: sessionQuery.data ?? null,
        evaluation: evaluationQuery.data ?? null,
        isLoading: sessionQuery.isLoading || evaluationQuery.isLoading,
        loadError: Boolean(sessionQuery.isError || evaluationQuery.isError),
        isPending,
        isRetrying,
        retryError,
        retry,
        reload: async () => {
            await Promise.all([
                sessionQuery.mutate(undefined, true),
                evaluationQuery.mutate(undefined, true),
            ]);
        },
    };
}

export type SpeakingEvaluationController = ReturnType<
    typeof useSpeakingEvaluationController
>;
