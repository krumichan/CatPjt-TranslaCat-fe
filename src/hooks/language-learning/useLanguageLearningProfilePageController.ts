"use client";

import { useQuery } from "@/hooks/useQuery";
import { languageLearningProfileService } from "@/services/language-learning/languageLearningProfileService";

export function useLanguageLearningProfilePageController() {
    const profileQuery = useQuery({
        keys: ["language-learning-profile-page"] as const,
        fetcher: () => languageLearningProfileService.get(),
        config: { revalidateOnMount: true },
    });

    return {
        profile: profileQuery.data ?? null,
        isLoading: profileQuery.isLoading,
        loadError: profileQuery.isError,
        reload: async () => {
            await profileQuery.mutate(undefined, true);
        },
    };
}

export type LanguageLearningProfilePageController = ReturnType<
    typeof useLanguageLearningProfilePageController
>;
