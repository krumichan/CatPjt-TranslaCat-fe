"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { languageLearningLevelService } from "@/services/language-learning/languageLearningLevelService";
import type { LevelTestSessionType } from "@/types/language-learning/common";
import type {
    LevelTestAnswerResult,
    LevelTestQuestion,
} from "@/types/language-learning/level";

export function useLanguageLearningLevelTestController() {
    const statusQuery = useQuery({
        keys: ["language-learning-level-status"] as const,
        fetcher: () => languageLearningLevelService.getStatus(),
        config: { revalidateOnMount: true },
    });

    const activeSessionId = statusQuery.data?.activeSessionId ?? null;
    const currentQuestionQuery = useQuery({
        keys: activeSessionId
            ? (["language-learning-level-current", activeSessionId] as const)
            : null,
        fetcher: (_key, sessionId) =>
            languageLearningLevelService.getCurrent(sessionId),
        enabled: activeSessionId !== null,
        config: { revalidateOnMount: true },
    });

    const [question, setQuestion] = useState<LevelTestQuestion | null>(null);
    const [answer, setAnswer] = useState("");
    const [lastResult, setLastResult] =
        useState<LevelTestAnswerResult | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionError, setActionError] = useState(false);

    useEffect(() => {
        if (currentQuestionQuery.data) {
            setQuestion(currentQuestionQuery.data);
        }
    }, [currentQuestionQuery.data]);

    const defaultSessionType: LevelTestSessionType = useMemo(() => {
        return statusQuery.data?.initialLevelTestCompleted
            ? "RECHECK"
            : "INITIAL";
    }, [statusQuery.data?.initialLevelTestCompleted]);

    const start = useCallback(
        async (type: LevelTestSessionType = defaultSessionType) => {
            if (isStarting || isSubmitting) return false;

            setIsStarting(true);
            setActionError(false);
            setLastResult(null);
            try {
                const next = await languageLearningLevelService.start(type);
                setQuestion(next);
                setAnswer("");
                await statusQuery.mutate(undefined, true);
                return true;
            } catch (error) {
                console.error("Failed to start language learning level test.", error);
                setActionError(true);
                return false;
            } finally {
                setIsStarting(false);
            }
        },
        [defaultSessionType, isStarting, isSubmitting, statusQuery],
    );

    const submit = useCallback(async () => {
        if (!question || !answer.trim() || isSubmitting || isStarting) {
            return false;
        }

        setIsSubmitting(true);
        setActionError(false);
        try {
            const result = await languageLearningLevelService.submitAnswer(
                question.sessionId,
                { answer: answer.trim() },
            );
            setLastResult(result);
            setAnswer("");

            if (result.completed) {
                setQuestion(null);
                await Promise.all([
                    statusQuery.mutate(undefined, true),
                    currentQuestionQuery.mutate(undefined, false),
                ]);
            } else if (result.nextQuestion) {
                setQuestion(result.nextQuestion);
            }

            return true;
        } catch (error) {
            console.error("Failed to submit language learning level answer.", error);
            setActionError(true);
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, [
        answer,
        currentQuestionQuery,
        isStarting,
        isSubmitting,
        question,
        statusQuery,
    ]);

    return {
        status: statusQuery.data ?? null,
        question,
        answer,
        lastResult,
        isLoading:
            statusQuery.isLoading ||
            (activeSessionId !== null && currentQuestionQuery.isLoading),
        loadError: statusQuery.isError || currentQuestionQuery.isError,
        actionError,
        isStarting,
        isSubmitting,
        defaultSessionType,
        setAnswer,
        start,
        submit,
        reload: async () => {
            await Promise.all([
                statusQuery.mutate(undefined, true),
                currentQuestionQuery.mutate(undefined, true),
            ]);
        },
    };
}

export type LanguageLearningLevelTestController = ReturnType<
    typeof useLanguageLearningLevelTestController
>;
