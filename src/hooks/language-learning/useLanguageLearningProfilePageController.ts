"use client";

import { useQuery } from "@/hooks/useQuery";
import { languageLearningLevelService } from "@/services/language-learning/languageLearningLevelService";
import { languageLearningProfileService } from "@/services/language-learning/languageLearningProfileService";

export function useLanguageLearningProfilePageController() {
    const profileQuery = useQuery({
        keys: ["language-learning-profile-page"] as const,
        fetcher: () => languageLearningProfileService.get(),
        config: { revalidateOnMount: true },
    });
    const levelStatusQuery = useQuery({
        keys: ["language-learning-profile-level-status"] as const,
        fetcher: () => languageLearningLevelService.getStatus(),
        config: { revalidateOnMount: true },
    });
    const levelHistoryQuery = useQuery({
        keys: ["language-learning-profile-level-history"] as const,
        fetcher: () => languageLearningLevelService.getHistory(),
        config: { revalidateOnMount: true },
    });

    return {
        profile: profileQuery.data ?? null,
        levelStatus: levelStatusQuery.data ?? null,
        latestLevelTest: levelHistoryQuery.data?.[0] ?? null,
        isLoading: profileQuery.isLoading,
        loadError: profileQuery.isError,
        reload: async () => {
            await Promise.all([
                profileQuery.mutate((current) => current, true),
                levelStatusQuery.mutate((current) => current, true),
                levelHistoryQuery.mutate((current) => current, true),
            ]);
        },
    };
}

export type LanguageLearningProfilePageController = ReturnType<
    typeof useLanguageLearningProfilePageController
>;
