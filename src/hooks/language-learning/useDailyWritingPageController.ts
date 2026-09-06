"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    clearWritingDraftState,
    loadWritingDraftState,
    saveWritingDraftState,
} from "@/features/language-learning/writing/writingDraftStorage";
import {
    getLanguageLearningErrorCode,
    LANGUAGE_LEARNING_ERROR_CODES,
} from "@/hooks/language-learning/languageLearningErrorMapper";
import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useQuery } from "@/hooks/useQuery";
import { dailyWritingService } from "@/services/language-learning/dailyWritingService";
import { learningHistoryService } from "@/services/language-learning/learningHistoryService";
import type { DailyWritingType } from "@/types/language-learning/common";
import type {
    AnswerResult,
    DailyWritingItem,
    WritingAnswerAttempt,
    WritingEvaluationStatus,
} from "@/types/language-learning/daily";

const WRITING_TYPES: DailyWritingType[] = ["TRANSLATION", "GUIDED", "FREE"];
const EVALUATION_POLL_INTERVAL_MS = 1500;

export type DailyWritingTypeProgressState =
    | "NOT_STARTED"
    | "IN_PROGRESS"
    | "EVALUATING"
    | "COMPLETED";

export interface DailyWritingTypeProgress {
    state: DailyWritingTypeProgressState;
    overallScore: number | null;
    activityId: string | null;
}

function resolveLearningDate(timezone: string): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value]),
    );

    return `${values.year}-${values.month}-${values.day}`;
}

function resolveHistoryWritingType(
    topic: string | null,
    title: string,
): DailyWritingType | null {
    const candidates = [topic, title.split("·").at(-1)?.trim() ?? null];
    return (
        candidates.find(
            (value): value is DailyWritingType =>
                value != null &&
                WRITING_TYPES.includes(value as DailyWritingType),
        ) ?? null
    );
}

function createEmptyWritingTypeProgress(): Record<
    DailyWritingType,
    DailyWritingTypeProgress
> {
    return {
        TRANSLATION: {
            state: "NOT_STARTED",
            overallScore: null,
            activityId: null,
        },
        GUIDED: {
            state: "NOT_STARTED",
            overallScore: null,
            activityId: null,
        },
        FREE: {
            state: "NOT_STARTED",
            overallScore: null,
            activityId: null,
        },
    };
}

function latestAttempt(item: DailyWritingItem): WritingAnswerAttempt | null {
    return item.attempts.at(-1) ?? null;
}

function latestEvaluationStatus(
    item: DailyWritingItem,
): WritingEvaluationStatus | null {
    return latestAttempt(item)?.evaluationStatus ?? null;
}

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
        config: { revalidateOnMount: true },
    });

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
    const [actionError, setActionError] = useState(false);
    const [lastAnswerResult, setLastAnswerResult] =
        useState<AnswerResult | null>(null);
    const resumedPendingItemsRef = useRef<Set<string>>(new Set());
    const hadPendingEvaluationsRef = useRef(false);

    const dailyErrorCode = getLanguageLearningErrorCode(dailyQuery.isError);
    const isDailyGenerating =
        selectedWritingType !== null &&
        dailyErrorCode === LANGUAGE_LEARNING_ERROR_CODES.DAILY_SET_GENERATING;

    useEffect(() => {
        if (!isDailyGenerating) return;

        const timer = window.setTimeout(() => {
            void dailyQuery.mutate(undefined, true);
        }, 1200);

        return () => window.clearTimeout(timer);
    }, [dailyQuery, isDailyGenerating]);

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
            void writingHistoryQuery.mutate(undefined, true);
        }, EVALUATION_POLL_INTERVAL_MS);
        return () => window.clearTimeout(timer);
    }, [
        entry.setting?.timezone,
        writingHistoryQuery,
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
    }, [dailyQuery.data?.dailySetId, publicId]);

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
                await dailyQuery.mutate(undefined, true);
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

            await dailyQuery.mutate(undefined, true);
            return succeeded;
        } finally {
            setSubmittingItemId(null);
            setIsSubmittingAll(false);
        }
    }, [
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

    useEffect(() => {
        const dailySet = dailyQuery.data;
        if (!dailySet || pendingEvaluationItems.length === 0) {
            if (hadPendingEvaluationsRef.current) {
                hadPendingEvaluationsRef.current = false;
                void Promise.all([
                    entry.mutateLevelStatus(undefined, true),
                    writingHistoryQuery.mutate(undefined, true),
                ]);
            }
            return;
        }

        hadPendingEvaluationsRef.current = true;
        for (const item of pendingEvaluationItems) {
            const resumeKey = `${dailySet.dailySetId}:${item.itemId}`;
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

        const timer = window.setTimeout(() => {
            void dailyQuery.mutate(undefined, true);
            void writingHistoryQuery.mutate(undefined, true);
        }, EVALUATION_POLL_INTERVAL_MS);
        return () => window.clearTimeout(timer);
    }, [
        dailyQuery,
        dailyQuery.data,
        entry,
        pendingEvaluationItems,
        writingHistoryQuery,
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
            !isDailyGenerating,
        isDailyGenerating,
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
        reloadDaily: async () => {
            if (selectedWritingType === null) return;
            await dailyQuery.mutate(undefined, true);
        },
    };
}

export type DailyWritingPageController = ReturnType<
    typeof useDailyWritingPageController
>;
