"use client";

import { useState } from "react";

import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useQuery } from "@/hooks/useQuery";
import { languageLearningDashboardService } from "@/services/language-learning/languageLearningDashboardService";
import { languageLearningProfileService } from "@/services/language-learning/languageLearningProfileService";
import type { DashboardPeriod, DashboardSourceFilter } from "@/types/language-learning/dashboard";

export function useLanguageLearningDashboardPageController() {
    const entry = useLanguageLearningEntryState();
    const [period, setPeriod] = useState<DashboardPeriod>("7d");
    const [source, setSource] = useState<DashboardSourceFilter>("ALL");
    const canLoadLearningData = entry.setting?.configured === true && entry.levelStatus?.profileState !== "LEVEL_TEST_REQUIRED";

    const dashboardQuery = useQuery({
        keys: canLoadLearningData ? (["language-learning-dashboard", period, source] as const) : null,
        fetcher: (_key, selectedPeriod, selectedSource) => languageLearningDashboardService.get(selectedPeriod, selectedSource),
        enabled: canLoadLearningData,
        config: { revalidateOnMount: true },
    });

    const profileQuery = useQuery({
        keys: canLoadLearningData ? (["language-learning-profile"] as const) : null,
        fetcher: () => languageLearningProfileService.get(),
        enabled: canLoadLearningData,
        config: { revalidateOnMount: true },
    });

    return {
        entry,
        dashboard: dashboardQuery.data ?? null,
        profile: profileQuery.data ?? null,
        period,
        source,
        setPeriod,
        setSource,
        isLoadingData: canLoadLearningData && (dashboardQuery.isLoading || profileQuery.isLoading),
        loadError: dashboardQuery.isError || profileQuery.isError,
        reloadData: async () => {
            await Promise.all([dashboardQuery.mutate(undefined, true), profileQuery.mutate(undefined, true)]);
        },
    };
}

export type LanguageLearningDashboardPageController = ReturnType<typeof useLanguageLearningDashboardPageController>;
