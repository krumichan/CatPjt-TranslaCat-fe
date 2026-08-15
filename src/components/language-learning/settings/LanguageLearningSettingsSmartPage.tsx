"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { LanguageLearningSettingsView } from "@/components/language-learning/settings/LanguageLearningSettingsView";
import {
    useLanguageLearningSettingsPageController,
} from "@/hooks/language-learning/useLanguageLearningSettingsPageController";

export function LanguageLearningSettingsSmartPage() {
    const t = useTranslations("LanguageLearning.settings");
    const common = useTranslations("LanguageLearning.common");
    const controller = useLanguageLearningSettingsPageController();

    const content =
        controller.entry.isLoading || controller.keywordManager.isLoading ? (
            <LanguageLearningStateCard
                variant="loading"
                title={common("loadingTitle")}
                message={t("loading")}
            />
        ) : controller.entry.settingError ||
          controller.keywordManager.loadError ||
          !controller.entry.setting ? (
            <LanguageLearningStateCard
                variant="error"
                title={common("loadFailedTitle")}
                message={t("loadFailed")}
                actionLabel={common("retry")}
                onAction={() =>
                    void Promise.all([
                        controller.entry.reload(),
                        controller.keywordManager.refresh(),
                    ])
                }
            />
        ) : (
            <LanguageLearningSettingsView controller={controller} />
        );

    return (
        <LanguageLearningPageLayout
            title={t("title")}
            description={t("description")}
        >
            {content}
        </LanguageLearningPageLayout>
    );
}
