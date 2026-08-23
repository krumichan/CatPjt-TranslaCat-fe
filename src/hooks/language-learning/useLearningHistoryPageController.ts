"use client";

import { useCallback, useEffect, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { dailyWritingService } from "@/services/language-learning/dailyWritingService";
import { learningHistoryService } from "@/services/language-learning/learningHistoryService";
import type { DailyWritingItem } from "@/types/language-learning/daily";
import type { LearningHistorySourceFilter } from "@/types/language-learning/history";
import type { ListeningTaskType } from "@/types/language-learning/listening";

export function useLearningHistoryPageController() {
    const [source, setSource] =
        useState<LearningHistorySourceFilter>("ALL");
    const [period, setPeriod] = useState("30d");
    const [taskType, setTaskType] = useState<ListeningTaskType | null>(null);
    const [selectedActivityId, setSelectedActivityId] =
        useState<string | null>(null);
    const [reviewDrafts, setReviewDrafts] =
        useState<Record<number, string>>({});
    const [submittingItemId, setSubmittingItemId] =
        useState<number | null>(null);
    const [actionError, setActionError] = useState(false);

    const listQuery = useQuery({
        keys: ["language-learning-history", source, period, taskType ?? "ALL_TASKS"] as const,
        fetcher: (_key, sourceFilter, historyPeriod) =>
            learningHistoryService.getAll({
                source: sourceFilter,
                period: historyPeriod,
                taskType,
            }),
        config: { revalidateOnMount: true },
    });

    useEffect(() => {
        const items = listQuery.data ?? [];

        if (items.length === 0) {
            setSelectedActivityId(null);
            return;
        }

        const selectedExists =
            selectedActivityId !== null &&
            items.some((item) => item.activityId === selectedActivityId);

        if (!selectedExists) {
            setSelectedActivityId(items[0].activityId);
        }
    }, [listQuery.data, selectedActivityId]);

    const detailQuery = useQuery({
        keys: selectedActivityId
            ? ([
                  "language-learning-history-detail",
                  selectedActivityId,
              ] as const)
            : null,
        fetcher: (_key, activityId) =>
            learningHistoryService.getDetail(activityId),
        enabled: selectedActivityId !== null,
        config: { revalidateOnMount: true },
    });

    const updateReviewDraft = useCallback(
        (itemId: number, value: string) => {
            setReviewDrafts((current) => ({
                ...current,
                [itemId]: value,
            }));
            setActionError(false);
        },
        [],
    );

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
                    detailQuery.mutate(undefined, true),
                    listQuery.mutate(undefined, true),
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
        [detailQuery, listQuery, reviewDrafts, submittingItemId],
    );

    const selectActivity = useCallback((activityId: string) => {
        setSelectedActivityId(activityId);
        setActionError(false);
        setReviewDrafts({});
    }, []);

    const changeSource = useCallback(
        (value: LearningHistorySourceFilter) => {
            setSource(value);
            if (value !== "LISTENING" && value !== "ALL") setTaskType(null);
            setSelectedActivityId(null);
            setActionError(false);
        },
        [],
    );

    const changePeriod = useCallback((value: string) => {
        setPeriod(value);
        setSelectedActivityId(null);
        setActionError(false);
    }, []);

    const reload = useCallback(async () => {
        await Promise.all([
            listQuery.mutate(undefined, true),
            detailQuery.mutate(undefined, true),
        ]);
    }, [detailQuery, listQuery]);

    const reloadDetail = useCallback(async () => {
        await detailQuery.mutate(undefined, true);
    }, [detailQuery]);

    return {
        source,
        period,
        taskType,
        items: listQuery.data ?? [],
        selectedActivityId,
        detail: detailQuery.data ?? null,
        isLoading: listQuery.isLoading,
        detailLoading: selectedActivityId !== null && detailQuery.isLoading,
        loadError: listQuery.isError,
        detailError: detailQuery.isError,
        reviewDrafts,
        submittingItemId,
        actionError,
        setSource: changeSource,
        setPeriod: changePeriod,
        setTaskType,
        selectActivity,
        updateReviewDraft,
        submitReviewAnswer,
        reload,
        reloadDetail,
    };
}

export type LearningHistoryPageController = ReturnType<
    typeof useLearningHistoryPageController
>;
