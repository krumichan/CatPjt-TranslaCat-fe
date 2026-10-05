"use client";

import { useCallback, useEffect, useId, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { dailyWritingService } from "@/services/language-learning/dailyWritingService";
import { learningHistoryService } from "@/services/language-learning/learningHistoryService";
import type { DailyWritingItem } from "@/types/language-learning/daily";
import type { LearningHistorySourceFilter } from "@/types/language-learning/history";
import type { ListeningTaskType } from "@/types/language-learning/listening";

export function useLearningHistoryPageController() {
    // 화면 재진입 시 이전 인스턴스의 상세 캐시를 재사용하지 않는다. 권한은 상세 API가 다시 판단한다.
    const detailReadScope = useId();
    const [source, setSource] =
        useState<LearningHistorySourceFilter>("ALL");
    const [period, setPeriod] = useState("30d");
    const [taskType, setTaskType] = useState<ListeningTaskType | null>(null);
    const [selectedListActivityId, setSelectedActivityId] =
        useState<string | null>(null);
    const [evidenceActivityId, setEvidenceActivityId] = useState<string | null>(null);
    const [detailReadRevision, setDetailReadRevision] = useState(0);
    const selectedActivityId = evidenceActivityId ?? selectedListActivityId;
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
            selectedListActivityId !== null &&
            items.some((item) => item.activityId === selectedListActivityId);

        if (!selectedExists) {
            setSelectedActivityId(items[0].activityId);
        }
    }, [listQuery.data, selectedListActivityId]);

    const detailQuery = useQuery({
        keys: selectedActivityId
            ? ([
                  "language-learning-history-detail",
                  selectedActivityId,
                  detailReadScope,
                  detailReadRevision,
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
                // 저장 이력의 복습도 사용자가 확인한 원문의 revision으로 제출한다.
                await dailyWritingService.submitAnswer(item.itemId, {
                    answer,
                    contentRevision: item.contentRevision,
                });
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
        // 같은 원본을 다시 열 때도 새 조회로 권한과 현재 근거를 확인하고 이전 상세를 먼저 숨긴다.
        setDetailReadRevision((revision) => revision + 1);
        setEvidenceActivityId(null);
        setSelectedActivityId(activityId);
        setActionError(false);
        setReviewDrafts({});
    }, []);

    const selectEvidence = useCallback((activityId: string) => {
        // 누적 조회 기간의 원본이 기본 이력 목록 밖이어도 서버의 소유권 검사를 거쳐 상세를 연다.
        setDetailReadRevision((revision) => revision + 1);
        setEvidenceActivityId(activityId);
        setActionError(false);
        setReviewDrafts({});
    }, []);

    const changeSource = useCallback(
        (value: LearningHistorySourceFilter) => {
            setSource(value);
            setEvidenceActivityId(null);
            if (value !== "LISTENING" && value !== "ALL") setTaskType(null);
            setSelectedActivityId(null);
            setActionError(false);
        },
        [],
    );

    const changePeriod = useCallback((value: string) => {
        setPeriod(value);
        setEvidenceActivityId(null);
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
        selectEvidence,
        updateReviewDraft,
        submitReviewAnswer,
        reload,
        reloadDetail,
    };
}

export type LearningHistoryPageController = ReturnType<
    typeof useLearningHistoryPageController
>;
