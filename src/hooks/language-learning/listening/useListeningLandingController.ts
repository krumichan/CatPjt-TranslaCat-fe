"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createIdempotencyKey } from "@/features/language-learning/listening/idempotency";
import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/navigation";
import { listeningService } from "@/services/language-learning/listeningService";
import { ApiResponseError } from "@/services/common/responseParser";
import type {
    ListeningDailySet,
    ListeningLearningMode,
    ListeningTaskType,
} from "@/types/language-learning/listening";

const MODE_TASKS: Record<ListeningLearningMode, ListeningTaskType[]> = {
    DICTATION: ["DICTATION", "INTERPRETATION"],
    COMPREHENSION: ["COMPREHENSION"],
    SUMMARY: ["SUMMARY"],
};

const LISTENING_MODES: ListeningLearningMode[] = ["DICTATION", "COMPREHENSION", "SUMMARY"];
const PREPARATION_DELAY_NOTICE_MS = 30_000;

export function useListeningLandingController() {
    const router = useRouter();
    const entry = useLanguageLearningEntryState();
    const canLoad = entry.setting?.configured === true && entry.levelStatus?.profileState !== "LEVEL_TEST_REQUIRED";
    const [selectedMode, setSelectedMode] = useState<ListeningLearningMode | null>(null);
    const [currentSet, setCurrentSet] = useState<ListeningDailySet | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [actionErrorCode, setActionErrorCode] = useState<string | null>(null);
    const [preparationDelayedByMode, setPreparationDelayedByMode] = useState<Partial<Record<ListeningLearningMode, boolean>>>({});
    const sessionKeyRef = useRef<string | null>(null);
    const startInFlightRef = useRef(false);

    const statusQuery = useQuery({
        keys: canLoad ? (["listening-today-mode-status"] as const) : null,
        fetcher: () => listeningService.getTodayStatus(),
        enabled: canLoad,
        config: { revalidateOnMount: true, shouldRetryOnError: false },
    });

    const policyQuery = useQuery({
        keys: canLoad ? (["listening-policy"] as const) : null,
        fetcher: () => listeningService.getPolicy(),
        enabled: canLoad,
        config: { revalidateOnMount: true },
    });

    const activeSessionQuery = useQuery({
        keys: canLoad ? (["listening-active-session"] as const) : null,
        fetcher: () => listeningService.getActiveSession(),
        enabled: canLoad,
        config: { revalidateOnMount: true, shouldRetryOnError: false },
    });

    const statuses = statusQuery.data ?? [];
    const activeSession = activeSessionQuery.data?.active ? activeSessionQuery.data.session : null;
    const hasLiveMode = statuses.some((value) =>
        value.status === "GENERATING"
        || value.status === "PARTIAL"
        || value.latestSessionStatus === "EVALUATING"
    );

    const preparationSignature = useMemo(() => LISTENING_MODES.map((mode) => {
        const status = statuses.find((value) => value.learningMode === mode);
        const liveSet = selectedMode === mode ? currentSet : null;
        const target = status?.targetItemCount ?? liveSet?.targetItemCount ?? 0;
        const physical = Math.max(status?.physicalItemCount ?? 0, liveSet?.physicalItemCount ?? 0);
        const ready = Math.max(status?.readyItemCount ?? 0, liveSet?.readyItemCount ?? 0);
        return `${mode}:${status?.status ?? liveSet?.status ?? "NONE"}:${physical}:${ready}:${target}`;
    }).join("|"), [currentSet, selectedMode, statuses]);

    useEffect(() => {
        const timers: number[] = [];
        const next: Partial<Record<ListeningLearningMode, boolean>> = {};

        for (const part of preparationSignature.split("|")) {
            const [modeValue, statusValue, physicalValue, readyValue, targetValue] = part.split(":");
            const mode = modeValue as ListeningLearningMode;
            const target = Number(targetValue);
            const physical = Number(physicalValue);
            const ready = Number(readyValue);
            const preparing = (statusValue === "GENERATING" || statusValue === "PARTIAL")
                && target > 0
                && (physical < target || ready < target);

            if (!preparing) continue;
            next[mode] = false;
            timers.push(window.setTimeout(() => {
                setPreparationDelayedByMode((current) => ({ ...current, [mode]: true }));
            }, PREPARATION_DELAY_NOTICE_MS));
        }

        setPreparationDelayedByMode(next);
        return () => timers.forEach((timer) => window.clearTimeout(timer));
    }, [preparationSignature]);

    useEffect(() => {
        if (!hasLiveMode) return;
        const timer = window.setInterval(() => {
            void statusQuery.mutate((current) => current, true);
        }, 2000);
        return () => window.clearInterval(timer);
    }, [hasLiveMode, statusQuery]);

    const beginSession = useCallback(async (set: ListeningDailySet) => {
        if (startInFlightRef.current || activeSession) return false;
        if (set.status !== "READY" || set.readyItemCount <= 0) return false;
        startInFlightRef.current = true;
        setIsStarting(true);
        setActionErrorCode(null);
        const key = sessionKeyRef.current ?? createIdempotencyKey(`listening-${set.learningMode.toLowerCase()}`);
        sessionKeyRef.current = key;
        try {
            const session = await listeningService.createSession({
                dailySetId: set.dailySetId,
                selectedTaskTypes: MODE_TASKS[set.learningMode],
                idempotencyKey: key,
            });
            sessionKeyRef.current = null;
            router.push(`/language-learning/listening/session/${session.sessionId}`);
            return true;
        } catch (error) {
            const code = error instanceof ApiResponseError ? error.errorCode : "UNKNOWN";
            setActionErrorCode(code);
            if (code === "LISTENING_ACTIVE_SESSION_EXISTS") {
                const active = await listeningService.getActiveSession().catch(() => null);
                if (active?.active && active.session) {
                    router.push(`/language-learning/listening/session/${active.session.sessionId}`);
                    return true;
                }
            }
            return false;
        } finally {
            startInFlightRef.current = false;
            setIsStarting(false);
        }
    }, [activeSession, router]);

    const selectMode = useCallback(async (mode: ListeningLearningMode) => {
        setSelectedMode(mode);
        setCurrentSet(null);
        setActionErrorCode(null);
        if (activeSession) {
            router.push(`/language-learning/listening/session/${activeSession.sessionId}`);
            return true;
        }
        setIsStarting(true);
        try {
            const existing = statuses.find((value) => value.learningMode === mode);
            const set = existing?.status === "FAILED" && existing.dailySetId
                ? await listeningService.retryGeneration(existing.dailySetId)
                : await listeningService.createDailySet({
                    learningMode: mode,
                    idempotencyKey: createIdempotencyKey(`listening-set-${mode.toLowerCase()}`),
                });
            setCurrentSet(set);
            await statusQuery.mutate((current) => current, true);
            if (set.status === "READY") {
                return await beginSession(set);
            }
            return true;
        } catch (error) {
            setActionErrorCode(error instanceof ApiResponseError ? error.errorCode : "UNKNOWN");
            return false;
        } finally {
            setIsStarting(false);
        }
    }, [activeSession, beginSession, router, statusQuery, statuses]);

    useEffect(() => {
        if (!selectedMode || !currentSet || currentSet.status === "READY" || currentSet.status === "FAILED") return;
        const timer = window.setInterval(async () => {
            try {
                const next = await listeningService.createDailySet({ learningMode: selectedMode });
                setCurrentSet(next);
                await statusQuery.mutate((current) => current, true);
                if (next.status === "READY") {
                    window.clearInterval(timer);
                    await beginSession(next);
                }
            } catch (error) {
                setActionErrorCode(error instanceof ApiResponseError ? error.errorCode : "UNKNOWN");
                window.clearInterval(timer);
            }
        }, 2000);
        return () => window.clearInterval(timer);
    }, [beginSession, currentSet, selectedMode, statusQuery]);

    const statusByMode = useMemo(
        () => Object.fromEntries(statuses.map((value) => [value.learningMode, value])) as Partial<Record<ListeningLearningMode, (typeof statuses)[number]>>,
        [statuses],
    );

    return {
        entry,
        policy: policyQuery.data ?? null,
        statuses,
        statusByMode,
        activeSession,
        selectedMode,
        currentSet,
        isStarting,
        actionErrorCode,
        preparationDelayedByMode,
        isLoading: canLoad && (
            (statusQuery.data == null && statusQuery.isLoading) ||
            (policyQuery.data == null && policyQuery.isLoading) ||
            (activeSessionQuery.data == null && activeSessionQuery.isLoading)
        ),
        loadError: statusQuery.isError || policyQuery.isError || activeSessionQuery.isError,
        selectMode,
        reload: async () => {
            await Promise.all([
                entry.reload(),
                statusQuery.mutate(undefined, true),
                policyQuery.mutate(undefined, true),
                activeSessionQuery.mutate(undefined, true),
            ]);
        },
    };
}

export type ListeningLandingController = ReturnType<typeof useListeningLandingController>;
