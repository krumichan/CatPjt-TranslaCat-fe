"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { shouldPollSpeakingEvaluation, shouldPollSpeakingSession } from "@/features/language-learning/speaking/evaluationState";
import { speakingReadAloudService } from "@/services/language-learning/speakingReadAloudService";
import { useQuery } from "@/hooks/useQuery";
import { speakingEvaluationService } from "@/services/language-learning/speakingEvaluationService";
import { speakingSessionService } from "@/services/language-learning/speakingSessionService";
import type { SpeakingEvaluation, SpeakingSessionDetail } from "@/types/language-learning/speaking";

export function useSpeakingEvaluationController(sessionId: number) {
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryError, setRetryError] = useState(false);
    const [retryingProblems, setRetryingProblems] = useState<Set<number>>(new Set());
    const [problemRetryErrors, setProblemRetryErrors] = useState<Set<number>>(new Set());
    const problemRetryInFlight = useRef(new Set<number>());

    // Stable function identities keep unrelated renders from restarting SWR's polling timers.
    const sessionRefreshInterval = useCallback((data: SpeakingSessionDetail | undefined) =>
        shouldPollSpeakingSession(data) ? 3_000 : 0, []);

    const sessionQuery = useQuery({
        keys: ["speaking-evaluation-session", sessionId] as const,
        fetcher: (_key, id) => speakingSessionService.get(id),
        config: {
            revalidateOnMount: true,
            refreshInterval: sessionRefreshInterval,
        },
    });
    const evaluationRefreshInterval = useCallback((data: SpeakingEvaluation | null | undefined) =>
        shouldPollSpeakingEvaluation(data, sessionQuery.data) ? 3_000 : 0, [sessionQuery.data]);
    const evaluationQuery = useQuery({
        keys: ["speaking-evaluation", sessionId] as const,
        fetcher: (_key, id) => speakingEvaluationService.get(id),
        config: {
            revalidateOnMount: true,
            refreshInterval: evaluationRefreshInterval,
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

    const refreshSession = sessionQuery.mutate;
    const refreshEvaluation = evaluationQuery.mutate;

    const retryProblem = useCallback(async (problemIndex: number) => {
        if (problemRetryInFlight.current.has(problemIndex)) return false;
        problemRetryInFlight.current.add(problemIndex);
        setRetryingProblems((previous) => new Set(previous).add(problemIndex));
        setProblemRetryErrors((previous) => {
            const next = new Set(previous);
            next.delete(problemIndex);
            return next;
        });
        try {
            const accepted = await speakingReadAloudService.retryProblem(sessionId, problemIndex);
            // Show the accepted persisted PENDING immediately, then reconcile with the server.
            await refreshSession((current) => current ? {
                ...current,
                readAloudProblemEvaluations: current.readAloudProblemEvaluations.map(
                    (item) => item.problemIndex === problemIndex ? accepted : item,
                ),
            } : current, false);
            await refreshSession(undefined, true);
            return true;
        } catch (error) {
            console.error("Failed to retry Read Aloud problem evaluation.", error);
            setProblemRetryErrors((previous) => new Set(previous).add(problemIndex));
            return false;
        } finally {
            problemRetryInFlight.current.delete(problemIndex);
            setRetryingProblems((previous) => {
                const next = new Set(previous);
                next.delete(problemIndex);
                return next;
            });
        }
    }, [refreshSession, sessionId]);

    const retry = useCallback(async () => {
        if (isRetrying) return false;
        setIsRetrying(true);
        setRetryError(false);
        try {
            await speakingEvaluationService.retry(sessionId);
            await Promise.all([
                refreshEvaluation(undefined, true),
                refreshSession(undefined, true),
            ]);
            return true;
        } catch (error) {
            console.error("Failed to retry speaking evaluation.", error);
            setRetryError(true);
            return false;
        } finally {
            setIsRetrying(false);
        }
    }, [refreshEvaluation, isRetrying, sessionId, refreshSession]);

    return {
        session: sessionQuery.data ?? null,
        evaluation: evaluationQuery.data ?? null,
        isLoading: sessionQuery.isLoading || evaluationQuery.isLoading,
        loadError: Boolean(sessionQuery.isError || evaluationQuery.isError),
        isPending,
        isRetrying,
        retryError,
        retryingProblems,
        problemRetryErrors,
        retryProblem,
        retry,
        reload: async () => {
            await Promise.all([
                refreshSession(undefined, true),
                refreshEvaluation(undefined, true),
            ]);
        },
    };
}

export type SpeakingEvaluationController = ReturnType<
    typeof useSpeakingEvaluationController
>;
