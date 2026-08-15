"use client";

import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useLanguageLearningKeywordManager } from "@/hooks/language-learning/useLanguageLearningKeywordManager";
import { useLanguageLearningUserSettingForm } from "@/hooks/language-learning/useLanguageLearningUserSettingForm";

export function useLanguageLearningSettingsPageController() {
    const entry = useLanguageLearningEntryState();
    const keywordManager = useLanguageLearningKeywordManager();
    const settingForm = useLanguageLearningUserSettingForm({
        setting: entry.setting,
        onUpdated: async (setting) => {
            await entry.mutateSetting(setting, false);
        },
    });

    return {
        entry,
        settingForm,
        keywordManager,
    };
}

export type LanguageLearningSettingsPageController = ReturnType<
    typeof useLanguageLearningSettingsPageController
>;
