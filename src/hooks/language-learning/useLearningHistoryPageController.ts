"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { dailyWritingService } from "@/services/language-learning/dailyWritingService";
import { languageLearningDashboardService } from "@/services/language-learning/languageLearningDashboardService";
import type { DailyWritingItem } from "@/types/language-learning/daily";

export function useLearningHistoryPageController() {
    const dashboardQuery = useQuery({
        keys: ["language-learning-history-index"] as const,
        fetcher: () => languageLearningDashboardService.get(),
        config: { revalidateOnMount: true },
    });
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [reviewDrafts, setReviewDrafts] = useState<Record<number, string>>({});
    const [submittingItemId, setSubmittingItemId] = useState<number | null>(null);
    const [actionError, setActionError] = useState(false);

    const availableDates = useMemo(
        () =>
            dashboardQuery.data?.recentLearningHistory.map(
                (item) => item.learningDate,
            ) ?? [],
        [dashboardQuery.data?.recentLearningHistory],
    );

    useEffect(() => {
        if (!selectedDate && availableDates.length > 0) {
            setSelectedDate(availableDates[0]);
        }
    }, [availableDates, selectedDate]);

    const historyQuery = useQuery({
        keys: selectedDate
            ? (["language-learning-history", selectedDate] as const)
            : null,
        fetcher: (_key, date) => dailyWritingService.getHistory(date),
        enabled: selectedDate !== null,
        config: { revalidateOnMount: true },
    });

    const updateReviewDraft = useCallback((itemId: number, value: string) => {
        setReviewDrafts((current) => ({
            ...current,
            [itemId]: value,
        }));
        setActionError(false);
    }, []);

    const submitReviewAnswer = useCallback(
        async (item: DailyWritingItem) => {
            const answer = reviewDrafts[item.itemId]?.trim() ?? "";
            if (!answer || !item.canSubmit || submittingItemId !== null) {
                return false;
            }

            setSubmittingItemId(item.itemId);
            setActionError(false);

            try {
                await dailyWritingService.submitAnswer(item.itemId, { answer });
                setReviewDrafts((current) => ({
                    ...current,
                    [item.itemId]: "",
                }));

                await Promise.all([
                    historyQuery.mutate(undefined, true),
                    dashboardQuery.mutate(undefined, true),
                ]);
                return true;
            } catch (error) {
                console.error(
                    "Failed to submit language learning review answer.",
                    error,
                );
                setActionError(true);
                return false;
            } finally {
                setSubmittingItemId(null);
            }
        },
        [
            dashboardQuery,
            historyQuery,
            reviewDrafts,
            submittingItemId,
        ],
    );

    const changeSelectedDate = useCallback((date: string) => {
        setSelectedDate(date);
        setActionError(false);
        setReviewDrafts({});
    }, []);

    return {
        summaries: dashboardQuery.data?.recentLearningHistory ?? [],
        selectedDate,
        history: historyQuery.data ?? null,
        isLoading: dashboardQuery.isLoading,
        historyLoading: selectedDate !== null && historyQuery.isLoading,
        loadError: dashboardQuery.isError,
        historyError: historyQuery.isError,
        reviewDrafts,
        submittingItemId,
        actionError,
        setSelectedDate: changeSelectedDate,
        updateReviewDraft,
        submitReviewAnswer,
        reload: async () => {
            await Promise.all([
                dashboardQuery.mutate(undefined, true),
                historyQuery.mutate(undefined, true),
            ]);
        },
    };
}

export type LearningHistoryPageController = ReturnType<
    typeof useLearningHistoryPageController
>;
