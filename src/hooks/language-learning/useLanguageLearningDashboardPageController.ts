"use client";

import { useCallback, useState } from "react";

import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useQuery } from "@/hooks/useQuery";
import { languageLearningDashboardService } from "@/services/language-learning/languageLearningDashboardService";
import { languageLearningLevelService } from "@/services/language-learning/languageLearningLevelService";
import { languageLearningProfileService } from "@/services/language-learning/languageLearningProfileService";
import { listeningService } from "@/services/language-learning/listeningService";
import type { DashboardPeriod, DashboardSourceFilter } from "@/types/language-learning/dashboard";

export function useLanguageLearningDashboardPageController() {
    const entry = useLanguageLearningEntryState();
    const [period, setPeriod] = useState<DashboardPeriod>("30d");
    const [source, setSource] = useState<DashboardSourceFilter>("ALL");
    const [dismissingId, setDismissingId] = useState<number | null>(null);
    const canLoadLearningData = entry.setting?.configured === true && entry.levelStatus?.profileState !== "LEVEL_TEST_REQUIRED";

    const dashboardQuery = useQuery({
        keys: canLoadLearningData ? (["language-learning-dashboard", period, source] as const) : null,
        fetcher: (_key, selectedPeriod, selectedSource) => languageLearningDashboardService.get(selectedPeriod, selectedSource),
        enabled: canLoadLearningData,
        config: { revalidateOnMount: true },
    });

    const profileQuery = useQuery({
        keys: canLoadLearningData ? (["language-learning-dashboard-profile"] as const) : null,
        fetcher: () => languageLearningProfileService.get(),
        enabled: canLoadLearningData,
        config: { revalidateOnMount: true },
    });

    const levelHistoryQuery = useQuery({
        keys: canLoadLearningData ? (["language-learning-dashboard-level-history"] as const) : null,
        fetcher: () => languageLearningLevelService.getHistory(),
        enabled: canLoadLearningData,
        config: { revalidateOnMount: true },
    });

    const dismissRecommendation = useCallback(async (recommendationId: number) => {
        if (dismissingId !== null) return false;
        setDismissingId(recommendationId);
        try {
            await listeningService.dismissRecommendation(recommendationId);
            await dashboardQuery.mutate(undefined, true);
            return true;
        } catch (error) {
            console.error("Failed to dismiss language learning recommendation.", error);
            return false;
        } finally {
            setDismissingId(null);
        }
    }, [dashboardQuery, dismissingId]);

    const reloadProfile = useCallback(async () => {
        await Promise.all([
            profileQuery.mutate(undefined, true),
            levelHistoryQuery.mutate(undefined, true),
            entry.reload(),
        ]);
    }, [entry, levelHistoryQuery, profileQuery]);

    return {
        entry,
        dashboard: dashboardQuery.data ?? null,
        profile: profileQuery.data ?? null,
        latestLevelTest: levelHistoryQuery.data?.[0] ?? null,
        period,
        source,
        setPeriod,
        setSource,
        dismissingId,
        dismissRecommendation,
        isLoadingData: canLoadLearningData && dashboardQuery.isLoading,
        loadError: dashboardQuery.isError,
        isLoadingProfile: canLoadLearningData && profileQuery.isLoading,
        profileLoadError: Boolean(profileQuery.isError),
        reloadProfile,
        reloadData: async () => {
            await Promise.all([
                dashboardQuery.mutate(undefined, true),
                profileQuery.mutate(undefined, true),
                levelHistoryQuery.mutate(undefined, true),
            ]);
        },
    };
}

export type LanguageLearningDashboardPageController = ReturnType<typeof useLanguageLearningDashboardPageController>;
