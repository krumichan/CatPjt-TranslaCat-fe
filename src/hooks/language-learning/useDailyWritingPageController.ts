"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
    getLanguageLearningErrorCode,
    LANGUAGE_LEARNING_ERROR_CODES,
} from "@/hooks/language-learning/languageLearningErrorMapper";
import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useQuery } from "@/hooks/useQuery";
import { dailyWritingService } from "@/services/language-learning/dailyWritingService";
import type {
    AnswerResult,
    DailyWritingItem,
} from "@/types/language-learning/daily";

export function useDailyWritingPageController() {
    const entry = useLanguageLearningEntryState();
    const canLoadDaily =
        entry.setting?.configured === true &&
        entry.levelStatus?.profileState !== "LEVEL_TEST_REQUIRED";

    const dailyQuery = useQuery({
        keys: canLoadDaily ? (["daily-writing-today"] as const) : null,
        fetcher: () => dailyWritingService.getToday(),
        enabled: canLoadDaily,
        config: { revalidateOnMount: true },
    });

    const [drafts, setDrafts] = useState<Record<number, string>>({});
    const [submittingItemId, setSubmittingItemId] = useState<number | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [actionError, setActionError] = useState(false);
    const [lastAnswerResult, setLastAnswerResult] =
        useState<AnswerResult | null>(null);

    const dailyErrorCode = getLanguageLearningErrorCode(dailyQuery.isError);
    const isDailyGenerating =
        dailyErrorCode === LANGUAGE_LEARNING_ERROR_CODES.DAILY_SET_GENERATING;

    useEffect(() => {
        if (!isDailyGenerating) return;

        const timer = window.setTimeout(() => {
            void dailyQuery.mutate(undefined, true);
        }, 1200);

        return () => window.clearTimeout(timer);
    }, [dailyQuery, isDailyGenerating]);

    const updateDraft = useCallback((itemId: number, value: string) => {
        setDrafts((current) => ({ ...current, [itemId]: value }));
        setActionError(false);
    }, []);

    const submitAnswer = useCallback(
        async (item: DailyWritingItem) => {
            const answer = drafts[item.itemId]?.trim() ?? "";
            if (!answer || submittingItemId !== null || !item.canSubmit) {
                return false;
            }

            setSubmittingItemId(item.itemId);
            setActionError(false);
            try {
                const result = await dailyWritingService.submitAnswer(
                    item.itemId,
                    { answer },
                );
                setLastAnswerResult(result);
                setDrafts((current) => ({ ...current, [item.itemId]: "" }));
                await dailyQuery.mutate(undefined, true);
                await entry.mutateLevelStatus(undefined, true);
                return true;
            } catch (error) {
                console.error("Failed to submit daily writing answer.", error);
                setActionError(true);
                return false;
            } finally {
                setSubmittingItemId(null);
            }
        },
        [drafts, entry, dailyQuery, submittingItemId],
    );

    const regenerate = useCallback(async () => {
        if (!dailyQuery.data || isRegenerating) return false;

        setIsRegenerating(true);
        setActionError(false);
        try {
            const updated = await dailyWritingService.regenerateUnanswered(
                dailyQuery.data.dailySetId,
            );
            await dailyQuery.mutate(updated, false);
            return true;
        } catch (error) {
            console.error("Failed to regenerate daily writing items.", error);
            setActionError(true);
            return false;
        } finally {
            setIsRegenerating(false);
        }
    }, [dailyQuery, isRegenerating]);

    const completedCount = useMemo(() => {
        return dailyQuery.data?.items.filter((item) => item.answered).length ?? 0;
    }, [dailyQuery.data]);

    const remainingRegenerations = Math.max(
        0,
        3 - (dailyQuery.data?.regenerationCount ?? 0),
    );

    return {
        entry,
        dailySet: dailyQuery.data ?? null,
        isLoadingDaily: canLoadDaily && dailyQuery.isLoading,
        dailyLoadError: dailyQuery.isError && !isDailyGenerating,
        isDailyGenerating,
        drafts,
        submittingItemId,
        isRegenerating,
        actionError,
        lastAnswerResult,
        completedCount,
        remainingRegenerations,
        updateDraft,
        submitAnswer,
        regenerate,
        reloadDaily: async () => {
            await dailyQuery.mutate(undefined, true);
        },
    };
}

export type DailyWritingPageController = ReturnType<
    typeof useDailyWritingPageController
>;
