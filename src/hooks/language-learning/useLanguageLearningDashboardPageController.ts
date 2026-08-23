"use client";

import { useCallback, useState } from "react";

import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useQuery } from "@/hooks/useQuery";
import { languageLearningDashboardService } from "@/services/language-learning/languageLearningDashboardService";
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

    return {
        entry,
        dashboard: dashboardQuery.data ?? null,
        period,
        source,
        setPeriod,
        setSource,
        dismissingId,
        dismissRecommendation,
        isLoadingData: canLoadLearningData && dashboardQuery.isLoading,
        loadError: dashboardQuery.isError,
        reloadData: async () => {
            await dashboardQuery.mutate(undefined, true);
        },
    };
}

export type LanguageLearningDashboardPageController = ReturnType<typeof useLanguageLearningDashboardPageController>;
