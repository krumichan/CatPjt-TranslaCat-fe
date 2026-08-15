"use client";

import { useQuery } from "@/hooks/useQuery";
import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { languageLearningDashboardService } from "@/services/language-learning/languageLearningDashboardService";
import { languageLearningProfileService } from "@/services/language-learning/languageLearningProfileService";

export function useLanguageLearningDashboardPageController() {
    const entry = useLanguageLearningEntryState();
    const canLoadLearningData =
        entry.setting?.configured === true &&
        entry.levelStatus?.profileState !== "LEVEL_TEST_REQUIRED";

    const dashboardQuery = useQuery({
        keys: canLoadLearningData
            ? (["language-learning-dashboard"] as const)
            : null,
        fetcher: () => languageLearningDashboardService.get(),
        enabled: canLoadLearningData,
        config: { revalidateOnMount: true },
    });

    const profileQuery = useQuery({
        keys: canLoadLearningData
            ? (["language-learning-profile"] as const)
            : null,
        fetcher: () => languageLearningProfileService.get(),
        enabled: canLoadLearningData,
        config: { revalidateOnMount: true },
    });

    return {
        entry,
        dashboard: dashboardQuery.data ?? null,
        profile: profileQuery.data ?? null,
        isLoadingData:
            canLoadLearningData &&
            (dashboardQuery.isLoading || profileQuery.isLoading),
        loadError: dashboardQuery.isError || profileQuery.isError,
        reloadData: async () => {
            await Promise.all([
                dashboardQuery.mutate(undefined, true),
                profileQuery.mutate(undefined, true),
            ]);
        },
    };
}

export type LanguageLearningDashboardPageController = ReturnType<
    typeof useLanguageLearningDashboardPageController
>;
