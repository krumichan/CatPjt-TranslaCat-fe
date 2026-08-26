"use client";

import { useCallback, useEffect } from "react";

import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useQuery } from "@/hooks/useQuery";
import { learningHistoryService } from "@/services/language-learning/learningHistoryService";
import { listeningService } from "@/services/language-learning/listeningService";

export function useListeningLandingController() {
    const entry = useLanguageLearningEntryState();
    const canLoad = entry.setting?.configured === true && entry.levelStatus?.profileState !== "LEVEL_TEST_REQUIRED";

    const todayQuery = useQuery({
        keys: canLoad ? (["listening-today"] as const) : null,
        fetcher: () => listeningService.getToday(),
        enabled: canLoad,
        config: { revalidateOnMount: true },
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

    const today = todayQuery.data ?? null;
    const todayCompleted = today !== null && (
        today.status === "COMPLETED" ||
        (today.targetItemCount > 0 && today.completedItemCount >= today.targetItemCount)
    );

    const completedHistoryQuery = useQuery({
        keys: canLoad && todayCompleted && today
            ? (["listening-today-completed-history", today.learningDate] as const)
            : null,
        fetcher: () => learningHistoryService.getAll({
            source: "LISTENING",
            period: "30d",
        }),
        enabled: canLoad && todayCompleted,
        config: { revalidateOnMount: true, shouldRetryOnError: false },
    });

    const completedSessionId = (() => {
        if (!todayCompleted || !today) return null;
        const activity = (completedHistoryQuery.data ?? []).find((item) =>
            item.source === "LISTENING" &&
            item.learningDate === today.learningDate &&
            item.completionStatus === "COMPLETED",
        );
        if (!activity) return null;
        const matched = /^LISTENING:(\d+)$/.exec(activity.activityId);
        return matched ? Number(matched[1]) : null;
    })();

    useEffect(() => {
        if (!todayQuery.data || !["GENERATING", "PARTIAL"].includes(todayQuery.data.status)) return;
        const timer = window.setInterval(
            () => void todayQuery.mutate((current) => current, true),
            2000,
        );
        return () => window.clearInterval(timer);
    }, [todayQuery]);

    const retryTts = useCallback(async (itemId: number) => {
        try {
            const updated = await listeningService.retryTts(itemId);
            await todayQuery.mutate(updated, false);
            return true;
        } catch (error) {
            console.error("Failed to retry Listening TTS.", error);
            return false;
        }
    }, [todayQuery]);

    return {
        entry,
        today,
        policy: policyQuery.data ?? null,
        activeSession: activeSessionQuery.data?.active ? activeSessionQuery.data.session : null,
        todayCompleted,
        completedSessionId,
        isLoading: canLoad && (
            (todayQuery.data == null && todayQuery.isLoading) ||
            (policyQuery.data == null && policyQuery.isLoading) ||
            (activeSessionQuery.data == null && activeSessionQuery.isLoading) ||
            (todayCompleted &&
                completedHistoryQuery.data == null &&
                completedHistoryQuery.isLoading)
        ),
        loadError: todayQuery.isError || policyQuery.isError || activeSessionQuery.isError,
        reload: async () => {
            await Promise.all([
                entry.reload(),
                todayQuery.mutate((current) => current, true),
                policyQuery.mutate((current) => current, true),
                activeSessionQuery.mutate((current) => current, true),
                completedHistoryQuery.mutate((current) => current, true),
            ]);
        },
        retryTts,
    };
}

export type ListeningLandingController = ReturnType<typeof useListeningLandingController>;
