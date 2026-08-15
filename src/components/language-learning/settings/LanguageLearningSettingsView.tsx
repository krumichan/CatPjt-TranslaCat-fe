"use client";

import type { LanguageLearningSettingsPageController } from "@/hooks/language-learning/useLanguageLearningSettingsPageController";
import { KeywordSettingsSection } from "@/components/language-learning/settings/KeywordSettingsSection";
import { LanguageLearningSettingForm } from "@/components/language-learning/settings/LanguageLearningSettingForm";
import { LevelRecheckSection } from "@/components/language-learning/settings/LevelRecheckSection";

export function LanguageLearningSettingsView({ controller }: { controller: LanguageLearningSettingsPageController }) {
    return (
        <div className="space-y-6" data-testid="language-learning-settings">
            <LanguageLearningSettingForm
                setting={controller.entry.setting!}
                controller={controller.settingForm}
            />
            <KeywordSettingsSection manager={controller.keywordManager} />
            <LevelRecheckSection status={controller.entry.levelStatus} />
        </div>
    );
}
