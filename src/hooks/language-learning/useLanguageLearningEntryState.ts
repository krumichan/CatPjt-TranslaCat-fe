"use client";

import { useQuery } from "@/hooks/useQuery";
import { languageLearningLevelService } from "@/services/language-learning/languageLearningLevelService";
import { languageLearningSettingService } from "@/services/language-learning/languageLearningSettingService";

export function useLanguageLearningEntryState() {
    const settingQuery = useQuery({
        keys: ["language-learning-setting"] as const,
        fetcher: () => languageLearningSettingService.get(),
        config: { revalidateOnMount: true },
    });

    const levelStatusQuery = useQuery({
        keys: ["language-learning-level-status"] as const,
        fetcher: () => languageLearningLevelService.getStatus(),
        config: { revalidateOnMount: true },
    });

    return {
        setting: settingQuery.data ?? null,
        levelStatus: levelStatusQuery.data ?? null,
        isLoading: settingQuery.isLoading || levelStatusQuery.isLoading,
        settingError: settingQuery.isError,
        levelStatusError: levelStatusQuery.isError,
        reload: async () => {
            await Promise.all([
                settingQuery.mutate(undefined, true),
                levelStatusQuery.mutate(undefined, true),
            ]);
        },
        mutateSetting: settingQuery.mutate,
        mutateLevelStatus: levelStatusQuery.mutate,
    };
}

export type LanguageLearningEntryState = ReturnType<
    typeof useLanguageLearningEntryState
>;
