"use client";

import { useCallback, useEffect } from "react";

import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useQuery } from "@/hooks/useQuery";
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

    useEffect(() => {
        if (!todayQuery.data || !["GENERATING", "PARTIAL"].includes(todayQuery.data.status)) return;
        const timer = window.setInterval(() => void todayQuery.mutate(undefined, true), 2000);
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
        today: todayQuery.data ?? null,
        policy: policyQuery.data ?? null,
        activeSession: activeSessionQuery.data?.active ? activeSessionQuery.data.session : null,
        isLoading: canLoad && (todayQuery.isLoading || policyQuery.isLoading || activeSessionQuery.isLoading),
        loadError: todayQuery.isError || policyQuery.isError || activeSessionQuery.isError,
        reload: async () => {
            await Promise.all([
                entry.reload(),
                todayQuery.mutate(undefined, true),
                policyQuery.mutate(undefined, true),
                activeSessionQuery.mutate(undefined, true),
            ]);
        },
        retryTts,
    };
}

export type ListeningLandingController = ReturnType<typeof useListeningLandingController>;
