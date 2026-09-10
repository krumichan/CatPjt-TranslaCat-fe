"use client";

import {
    LANGUAGE_LEARNING_ERROR_CODES,
    getLanguageLearningErrorCode,
} from "@/features/language-learning/common/errorMapping";
import { resolveLearningDate } from "@/features/language-learning/common/learningDate";
import { hasCompleteItemCoverage } from "@/features/language-learning/generationState";
import {
    clearWritingDraftState,
    loadWritingDraftState,
    saveWritingDraftState,
} from "@/features/language-learning/writing/writingDraftStorage";
import {
    createEmptyWritingTypeProgress,
    latestAttempt,
    latestEvaluationStatus,
    resolveHistoryWritingType,
} from "@/features/language-learning/writing/writingProgress";
import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useQuery } from "@/hooks/useQuery";
import { dailyWritingService } from "@/services/language-learning/dailyWritingService";
import { learningHistoryService } from "@/services/language-learning/learningHistoryService";
import type { DailyWritingType } from "@/types/language-learning/common";
import type { AnswerResult, DailyWritingItem } from "@/types/language-learning/daily";
import type { DailyWritingTypeProgressState } from "@/types/language-learning/writingProgress";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const EVALUATION_POLL_INTERVAL_MS = 1500;

export function useDailyWritingPageController() {
    const { data: session } = useSession();
    const publicId = session?.user?.publicId ?? null;
    const entry = useLanguageLearningEntryState();
    const canLoadDaily =
        entry.setting?.configured === true &&
        entry.levelStatus?.profileState !== "LEVEL_TEST_REQUIRED";
    const [selectedWritingType, setSelectedWritingType] =
        useState<DailyWritingType | null>(null);

    const writingHistoryQuery = useQuery({
        keys:
            canLoadDaily && entry.setting?.timezone
                ? ([
                      "daily-writing-today-progress",
                      entry.setting.timezone,
                  ] as const)
                : null,
        fetcher: () =>
            learningHistoryService.getAll({
                source: "WRITING",
                period: "7d",
            }),
        enabled: canLoadDaily && !!entry.setting?.timezone,
        config: { revalidateOnMount: true },
    });

    const dailyQuery = useQuery({
        keys:
            canLoadDaily && selectedWritingType
                ? (["daily-writing-today", selectedWritingType] as const)
                : null,
        fetcher: (_key, writingType) =>
            dailyWritingService.getToday(writingType),
        enabled: canLoadDaily && selectedWritingType !== null,
        config: {
            revalidateOnMount: true,
            refreshInterval: (data) => data?.status === "GENERATING" ? 1500 : 0,
        },
    });

    // useQuery/useLanguageLearningEntryState return wrapper objects on every render.
    // Keep polling effects on the stable mutate callbacks so an unrelated
    // history refresh cannot continuously cancel and restart their timers.
    const refreshWritingHistory = writingHistoryQuery.mutate;
    const refreshDaily = dailyQuery.mutate;
    const refreshLevelStatus = entry.mutateLevelStatus;

    const [drafts, setDrafts] = useState<Record<number, string>>({});
    const [draftsHydratedSetId, setDraftsHydratedSetId] = useState<
        number | null
    >(null);
    const [bulkEvaluationRequested, setBulkEvaluationRequested] =
        useState(false);
    const [submittingItemId, setSubmittingItemId] = useState<number | null>(null);
    const [isSubmittingAll, setIsSubmittingAll] = useState(false);
    const [bulkCompletedCount, setBulkCompletedCount] = useState(0);
    const [bulkTotalCount, setBulkTotalCount] = useState(0);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isRetryingGeneration, setIsRetryingGeneration] = useState(false);
    const [actionError, setActionError] = useState(false);
    const [lastAnswerResult, setLastAnswerResult] =
        useState<AnswerResult | null>(null);
    const hydratedDraftContextRef = useRef<{
        dailySetId: number;
        publicId: string | null;
    } | null>(null);
    const resumedPendingItemsRef = useRef<Set<string>>(new Set());
    const hadPendingEvaluationsRef = useRef(false);

    const dailyErrorCode = getLanguageLearningErrorCode(dailyQuery.isError);
    const isDailyGenerating =
        selectedWritingType !== null &&
        (dailyQuery.data?.status === "GENERATING" ||
            dailyErrorCode === LANGUAGE_LEARNING_ERROR_CODES.DAILY_SET_GENERATING);
    const generationFailureMessage = dailyQuery.data?.generationFailureMessage
        || (["PARTIAL", "FAILED"].includes(dailyQuery.data?.status ?? "") ? "GENERATION_FAILED" : null);
    const allItemsGenerated = hasCompleteItemCoverage(dailyQuery.data?.items.map((item) => item.itemId) ?? [], dailyQuery.data?.sentenceCount ?? 0);

    useEffect(() => {
        // Successful partial responses use SWR polling without clearing cached drafts.
        if (!isDailyGenerating || dailyQuery.data) return;

        const timer = window.setTimeout(() => {
            void refreshDaily((current) => current, true);
        }, 1200);

        return () => window.clearTimeout(timer);
    }, [dailyQuery.data, isDailyGenerating, refreshDaily]);

    const writingTypeProgress = useMemo(() => {
        const result = createEmptyWritingTypeProgress();
        if (!entry.setting?.timezone) return result;

        const learningDate = resolveLearningDate(entry.setting.timezone);
        for (const history of writingHistoryQuery.data ?? []) {
            if (history.learningDate !== learningDate) continue;

            const writingType = resolveHistoryWritingType(
                history.topic,
                history.title,
            );
            if (!writingType) continue;

            const nextState: DailyWritingTypeProgressState =
                history.completionStatus === "COMPLETED"
                    ? "COMPLETED"
                    : history.evaluationStatus === "PENDING"
                      ? "EVALUATING"
                      : "IN_PROGRESS";
            const current = result[writingType];
            if (
                current.state === "COMPLETED" &&
                nextState !== "COMPLETED"
            ) {
                continue;
            }

            result[writingType] = {
                state: nextState,
                overallScore: history.overallScore,
                activityId: history.activityId,
            };
        }

        return result;
    }, [entry.setting?.timezone, writingHistoryQuery.data]);

    useEffect(() => {
        if (!entry.setting?.timezone) return;
        const today = resolveLearningDate(entry.setting.timezone);
        const hasPendingHistory = (writingHistoryQuery.data ?? []).some(
            (history) =>
                history.learningDate === today &&
                history.evaluationStatus === "PENDING",
        );
        if (!hasPendingHistory) return;

        const timer = window.setTimeout(() => {
            void refreshWritingHistory(undefined, true);
        }, EVALUATION_POLL_INTERVAL_MS);
        return () => window.clearTimeout(timer);
    }, [
        entry.setting?.timezone,
        refreshWritingHistory,
        writingHistoryQuery.data,
    ]);

    const persistDraftState = useCallback(
        (
            nextDrafts: Record<number, string>,
            nextBulkEvaluationRequested = bulkEvaluationRequested,
        ) => {
            const dailySet = dailyQuery.data;
            if (!publicId || !dailySet) return;

            saveWritingDraftState(publicId, {
                dailySetId: dailySet.dailySetId,
                learningDate: dailySet.learningDate,
                writingType: dailySet.writingType,
                drafts: nextDrafts,
                bulkEvaluationRequested: nextBulkEvaluationRequested,
            });
        },
        [bulkEvaluationRequested, dailyQuery.data, publicId],
    );

    const changeBulkEvaluationRequested = useCallback(
        (requested: boolean, nextDrafts = drafts) => {
            setBulkEvaluationRequested(requested);
            persistDraftState(nextDrafts, requested);
        },
        [drafts, persistDraftState],
    );

    useEffect(() => {
        const dailySet = dailyQuery.data;
        if (!dailySet) return;

        // A progressive-generation poll replaces the response object, but must
        // not rehydrate over the learner's current edits or bulk-evaluation flag.
        const hydrated = hydratedDraftContextRef.current;
        if (hydrated?.dailySetId === dailySet.dailySetId && hydrated.publicId === publicId) return;
        hydratedDraftContextRef.current = { dailySetId: dailySet.dailySetId, publicId };

        if (!publicId) {
            setDrafts({});
            setBulkEvaluationRequested(false);
            setDraftsHydratedSetId(dailySet.dailySetId);
            return;
        }

        const stored = loadWritingDraftState(publicId, dailySet.dailySetId);
        const validItemIds = new Set(dailySet.items.map((item) => item.itemId));
        const restoredDrafts: Record<number, string> = {};

        if (
            stored &&
            stored.learningDate === dailySet.learningDate &&
            stored.writingType === dailySet.writingType
        ) {
            for (const [itemIdText, draft] of Object.entries(stored.drafts)) {
                const itemId = Number(itemIdText);
                if (validItemIds.has(itemId) && draft) {
                    restoredDrafts[itemId] = draft;
                }
            }
        }

        for (const item of dailySet.items) {
            const attempt = latestAttempt(item);
            if (attempt?.evaluationStatus === "SUCCESS") {
                delete restoredDrafts[item.itemId];
                continue;
            }
            if (
                !restoredDrafts[item.itemId] &&
                attempt?.answer &&
                (attempt.evaluationStatus === "PENDING" ||
                    attempt.evaluationStatus === "FAILED")
            ) {
                restoredDrafts[item.itemId] = attempt.answer;
            }
        }

        const restoredBulk = stored?.bulkEvaluationRequested === true;
        setDrafts(restoredDrafts);
        setBulkEvaluationRequested(restoredBulk);
        setDraftsHydratedSetId(dailySet.dailySetId);
        saveWritingDraftState(publicId, {
            dailySetId: dailySet.dailySetId,
            learningDate: dailySet.learningDate,
            writingType: dailySet.writingType,
            drafts: restoredDrafts,
            bulkEvaluationRequested: restoredBulk,
        });
    }, [dailyQuery.data, publicId]);

    useEffect(() => {
        const dailySet = dailyQuery.data;
        if (!dailySet || draftsHydratedSetId !== dailySet.dailySetId) return;

        const successfulIds = new Set(
            dailySet.items
                .filter((item) => latestEvaluationStatus(item) === "SUCCESS")
                .map((item) => item.itemId),
        );
        if (successfulIds.size === 0 && dailySet.status !== "COMPLETED") {
            return;
        }

        setDrafts((current) => {
            const next = { ...current };
            let changed = false;
            for (const itemId of successfulIds) {
                if (itemId in next) {
                    delete next[itemId];
                    changed = true;
                }
            }

            if (dailySet.status === "COMPLETED") {
                if (publicId) {
                    clearWritingDraftState(publicId, dailySet.dailySetId);
                }
                setBulkEvaluationRequested(false);
                return changed ? next : current;
            }

            if (changed) {
                persistDraftState(next);
            }
            return changed ? next : current;
        });
    }, [
        dailyQuery.data,
        draftsHydratedSetId,
        persistDraftState,
        publicId,
    ]);

    const selectWritingType = useCallback((writingType: DailyWritingType) => {
        hydratedDraftContextRef.current = null;
        setSelectedWritingType(writingType);
        setDrafts({});
        setDraftsHydratedSetId(null);
        setBulkEvaluationRequested(false);
        setActionError(false);
        setLastAnswerResult(null);
        setSubmittingItemId(null);
        setIsSubmittingAll(false);
        setBulkCompletedCount(0);
        setBulkTotalCount(0);
        setIsRegenerating(false);
    }, []);

    const showTypeSelector = useCallback(() => {
        hydratedDraftContextRef.current = null;
        setSelectedWritingType(null);
        setDrafts({});
        setDraftsHydratedSetId(null);
        setBulkEvaluationRequested(false);
        setActionError(false);
        setLastAnswerResult(null);
        setSubmittingItemId(null);
        setIsSubmittingAll(false);
        setBulkCompletedCount(0);
        setBulkTotalCount(0);
        setIsRegenerating(false);
        void writingHistoryQuery.mutate(undefined, true);
    }, [writingHistoryQuery]);

    const updateDraft = useCallback(
        (itemId: number, value: string) => {
            setDrafts((current) => {
                const next = { ...current, [itemId]: value };
                persistDraftState(next);
                return next;
            });
            setActionError(false);
        },
        [persistDraftState],
    );

    const submitAnswer = useCallback(
        async (item: DailyWritingItem) => {
            const answer = drafts[item.itemId]?.trim() ?? "";
            if (
                !answer ||
                submittingItemId !== null ||
                isSubmittingAll ||
                !item.canSubmit
            ) {
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
                await dailyQuery.mutate((current) => current, true);
                return true;
            } catch (error) {
                console.error("Failed to submit daily writing answer.", error);
                setActionError(true);
                return false;
            } finally {
                setSubmittingItemId(null);
            }
        },
        [dailyQuery, drafts, isSubmittingAll, submittingItemId],
    );

    const submitAllAnswers = useCallback(async () => {
        if (
            !dailyQuery.data ||
            !allItemsGenerated ||
            submittingItemId !== null ||
            isSubmittingAll ||
            draftsHydratedSetId !== dailyQuery.data.dailySetId
        ) {
            return false;
        }

        const targets = dailyQuery.data.items
            .filter((item) => item.canSubmit)
            .map((item) => ({
                item,
                answer: drafts[item.itemId]?.trim() ?? "",
            }));

        if (
            targets.length === 0 ||
            targets.some(({ answer }) => answer.length === 0)
        ) {
            return false;
        }

        changeBulkEvaluationRequested(true);
        setIsSubmittingAll(true);
        setBulkCompletedCount(0);
        setBulkTotalCount(targets.length);
        setActionError(false);

        let succeeded = true;
        try {
            for (const [index, target] of targets.entries()) {
                setSubmittingItemId(target.item.itemId);
                try {
                    const result = await dailyWritingService.submitAnswer(
                        target.item.itemId,
                        { answer: target.answer },
                    );
                    setLastAnswerResult(result);
                    setBulkCompletedCount(index + 1);
                } catch (error) {
                    console.error(
                        "Failed to queue Daily Writing evaluations in bulk.",
                        error,
                    );
                    setActionError(true);
                    succeeded = false;
                    changeBulkEvaluationRequested(false);
                    break;
                }
            }

            await dailyQuery.mutate((current) => current, true);
            return succeeded;
        } finally {
            setSubmittingItemId(null);
            setIsSubmittingAll(false);
        }
    }, [
        allItemsGenerated,
        changeBulkEvaluationRequested,
        dailyQuery,
        drafts,
        draftsHydratedSetId,
        isSubmittingAll,
        submittingItemId,
    ]);

    const pendingEvaluationItems = useMemo(
        () =>
            dailyQuery.data?.items.filter(
                (item) => latestEvaluationStatus(item) === "PENDING",
            ) ?? [],
        [dailyQuery.data],
    );
    const failedEvaluationItems = useMemo(
        () =>
            dailyQuery.data?.items.filter(
                (item) => latestEvaluationStatus(item) === "FAILED",
            ) ?? [],
        [dailyQuery.data],
    );
    const completedCount = useMemo(
        () =>
            dailyQuery.data?.items.filter(
                (item) => latestEvaluationStatus(item) === "SUCCESS",
            ).length ?? 0,
        [dailyQuery.data],
    );

    const dailySetId = dailyQuery.data?.dailySetId ?? null;

    useEffect(() => {
        if (dailySetId === null || pendingEvaluationItems.length === 0) {
            if (hadPendingEvaluationsRef.current) {
                hadPendingEvaluationsRef.current = false;
                void Promise.all([
                    refreshLevelStatus(undefined, true),
                    refreshWritingHistory(undefined, true),
                ]);
            }
            return;
        }

        hadPendingEvaluationsRef.current = true;
        for (const item of pendingEvaluationItems) {
            const resumeKey = `${dailySetId}:${item.itemId}`;
            if (resumedPendingItemsRef.current.has(resumeKey)) continue;
            resumedPendingItemsRef.current.add(resumeKey);
            void dailyWritingService.resumeEvaluation(item.itemId).catch(
                (error) => {
                    resumedPendingItemsRef.current.delete(resumeKey);
                    console.warn(
                        "Failed to resume pending Daily Writing evaluation.",
                        error,
                    );
                },
            );
        }

        // SWR can keep the same cached value when a revalidation returns the
        // same PENDING payload. Do not rely on a rerender to schedule the next
        // evaluation check; keep polling until this effect is cleaned up.
        let disposed = false;
        let timer: number | null = null;

        const scheduleNextPoll = () => {
            timer = window.setTimeout(() => {
                void Promise.allSettled([
                    refreshDaily((current) => current, true),
                    refreshWritingHistory(undefined, true),
                ]).finally(() => {
                    if (!disposed) {
                        scheduleNextPoll();
                    }
                });
            }, EVALUATION_POLL_INTERVAL_MS);
        };

        scheduleNextPoll();
        return () => {
            disposed = true;
            if (timer !== null) {
                window.clearTimeout(timer);
            }
        };
    }, [
        dailySetId,
        pendingEvaluationItems,
        refreshDaily,
        refreshLevelStatus,
        refreshWritingHistory,
    ]);

    const bulkAnswerableItems = useMemo(
        () => dailyQuery.data?.items.filter((item) => item.canSubmit) ?? [],
        [dailyQuery.data],
    );
    const bulkFilledCount = useMemo(
        () =>
            bulkAnswerableItems.filter(
                (item) => (drafts[item.itemId]?.trim() ?? "").length > 0,
            ).length,
        [bulkAnswerableItems, drafts],
    );
    const bulkPendingCount = bulkAnswerableItems.length;
    const canSubmitAll =
        allItemsGenerated &&
        bulkPendingCount > 0 &&
        bulkFilledCount === bulkPendingCount &&
        submittingItemId === null &&
        !isSubmittingAll &&
        pendingEvaluationItems.length === 0;

    useEffect(() => {
        const dailySet = dailyQuery.data;
        if (
            !dailySet ||
            !bulkEvaluationRequested ||
            draftsHydratedSetId !== dailySet.dailySetId ||
            submittingItemId !== null ||
            isSubmittingAll
        ) {
            return;
        }

        if (dailySet.status === "COMPLETED") {
            changeBulkEvaluationRequested(false);
            return;
        }
        if (failedEvaluationItems.length > 0) {
            changeBulkEvaluationRequested(false);
            return;
        }
        if (pendingEvaluationItems.length > 0) {
            return;
        }
        if (bulkPendingCount === 0) {
            changeBulkEvaluationRequested(false);
            return;
        }
        if (bulkFilledCount !== bulkPendingCount) {
            changeBulkEvaluationRequested(false);
            return;
        }

        void submitAllAnswers();
    }, [
        bulkEvaluationRequested,
        bulkFilledCount,
        bulkPendingCount,
        changeBulkEvaluationRequested,
        dailyQuery.data,
        draftsHydratedSetId,
        failedEvaluationItems.length,
        isSubmittingAll,
        pendingEvaluationItems.length,
        submitAllAnswers,
        submittingItemId,
    ]);

    const regenerate = useCallback(async () => {
        if (
            !dailyQuery.data ||
            !["READY", "COMPLETED"].includes(dailyQuery.data.status) ||
            isRegenerating ||
            isSubmittingAll ||
            pendingEvaluationItems.length > 0
        ) {
            return false;
        }

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
    }, [
        dailyQuery,
        isRegenerating,
        isSubmittingAll,
        pendingEvaluationItems.length,
    ]);

    const retryGeneration = useCallback(async () => {
        if (!dailyQuery.data || !generationFailureMessage || isRetryingGeneration || isRegenerating) return false;
        setIsRetryingGeneration(true);
        setActionError(false);
        try {
            const updated = await dailyWritingService.retryGeneration(dailyQuery.data.dailySetId);
            await dailyQuery.mutate(updated, false);
            return true;
        } catch (error) {
            console.error("Failed to resume Daily Writing generation.", error);
            setActionError(true);
            return false;
        } finally {
            setIsRetryingGeneration(false);
        }
    }, [dailyQuery, generationFailureMessage, isRegenerating, isRetryingGeneration]);

    const remainingRegenerations = Math.max(
        0,
        3 - (dailyQuery.data?.regenerationCount ?? 0),
    );

    return {
        entry,
        selectedWritingType,
        writingTypeProgress,
        isLoadingWritingTypeProgress: writingHistoryQuery.isLoading,
        dailySet: dailyQuery.data ?? null,
        isLoadingDaily:
            canLoadDaily &&
            selectedWritingType !== null &&
            dailyQuery.isLoading,
        dailyLoadError:
            selectedWritingType !== null &&
            dailyQuery.isError &&
            dailyErrorCode !== LANGUAGE_LEARNING_ERROR_CODES.DAILY_SET_GENERATING,
        isDailyGenerating,
        generationFailureMessage,
        allItemsGenerated,
        isRetryingGeneration,
        drafts,
        draftsHydrated:
            dailyQuery.data != null &&
            draftsHydratedSetId === dailyQuery.data.dailySetId,
        draftPersistenceEnabled: publicId !== null,
        submittingItemId,
        isSubmittingAll,
        bulkEvaluationRequested,
        bulkCompletedCount,
        bulkTotalCount,
        bulkPendingCount,
        bulkFilledCount,
        canSubmitAll,
        pendingEvaluationCount: pendingEvaluationItems.length,
        failedEvaluationCount: failedEvaluationItems.length,
        isRegenerating,
        actionError,
        lastAnswerResult,
        completedCount,
        remainingRegenerations,
        selectWritingType,
        showTypeSelector,
        updateDraft,
        submitAnswer,
        submitAllAnswers,
        regenerate,
        retryGeneration,
        reloadDaily: async () => {
            if (selectedWritingType === null) return;
            await dailyQuery.mutate((current) => current, true);
        },
    };
}

export type DailyWritingPageController = ReturnType<
    typeof useDailyWritingPageController
>;
