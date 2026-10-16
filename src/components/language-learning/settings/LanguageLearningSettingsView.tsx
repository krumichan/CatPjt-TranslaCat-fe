"use client";

import type { LanguageLearningSettingsPageController } from "@/hooks/language-learning/useLanguageLearningSettingsPageController";
import { KeywordSettingsSection } from "@/components/language-learning/settings/KeywordSettingsSection";
import { LanguageLearningSettingForm } from "@/components/language-learning/settings/LanguageLearningSettingForm";
import { LevelRecheckSection } from "@/components/language-learning/settings/LevelRecheckSection";
import { WebAiScheduleSettingsEntry } from "@/components/language-learning/settings/WebAiScheduleSettingsEntry";

export function LanguageLearningSettingsView({ controller }: { controller: LanguageLearningSettingsPageController }) {
    return (
        <div className="space-y-6" data-testid="language-learning-settings">
            <div id="learning-settings" className="scroll-mt-36">
                <LanguageLearningSettingForm
                    setting={controller.entry.setting!}
                    controller={controller.settingForm}
                />
            </div>
            <div id="learning-keywords" className="scroll-mt-36">
                <KeywordSettingsSection manager={controller.keywordManager} />
            </div>
            <WebAiScheduleSettingsEntry />
            <LevelRecheckSection status={controller.entry.levelStatus} />
        </div>
    );
}
