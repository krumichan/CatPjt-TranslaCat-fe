"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningOnboardingCard } from "@/components/language-learning/common/LanguageLearningOnboardingCard";
import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { DailyWritingTypeSelector } from "@/components/language-learning/writing/DailyWritingTypeSelector";
import { DailyWritingTypeTabs } from "@/components/language-learning/writing/DailyWritingTypeTabs";
import { DailyWritingView } from "@/components/language-learning/writing/DailyWritingView";
import { useDailyWritingPageController } from "@/hooks/language-learning/useDailyWritingPageController";

export function DailyWritingSmartPage() {
    const t = useTranslations("LanguageLearning.writing");
    const common = useTranslations("LanguageLearning.common");
    const controller = useDailyWritingPageController();

    const content = (() => {
        if (controller.entry.isLoading) {
            return (
                <LanguageLearningStateCard
                    variant="loading"
                    title={common("loadingTitle")}
                    message={t("loadingEntry")}
                />
            );
        }

        if (
            controller.entry.settingError ||
            controller.entry.levelStatusError
        ) {
            return (
                <LanguageLearningStateCard
                    variant="error"
                    title={common("loadFailedTitle")}
                    message={t("loadFailed")}
                    actionLabel={common("retry")}
                    onAction={() => void controller.entry.reload()}
                />
            );
        }

        if (!controller.entry.setting?.configured) {
            return <LanguageLearningOnboardingCard mode="SETTING" />;
        }

        if (
            controller.entry.levelStatus?.profileState ===
            "LEVEL_TEST_REQUIRED"
        ) {
            return <LanguageLearningOnboardingCard mode="LEVEL_TEST" />;
        }

        if (!controller.selectedWritingType) {
            return (
                <DailyWritingTypeSelector
                    onSelect={controller.selectWritingType}
                    progress={controller.writingTypeProgress}
                />
            );
        }

        let selectedContent;
        if (controller.isLoadingDaily || controller.isDailyGenerating) {
            selectedContent = (
                <LanguageLearningStateCard
                    variant="loading"
                    title={t("generatingTitle")}
                    message={t("generatingMessage")}
                />
            );
        } else if (controller.dailyLoadError || !controller.dailySet) {
            selectedContent = (
                <LanguageLearningStateCard
                    variant="error"
                    title={common("loadFailedTitle")}
                    message={t("loadFailed")}
                    actionLabel={common("retry")}
                    onAction={() => void controller.reloadDaily()}
                />
            );
        } else {
            selectedContent = <DailyWritingView controller={controller} />;
        }

        return (
            <div className="space-y-5">
                <DailyWritingTypeTabs
                    selected={controller.selectedWritingType}
                    onSelect={controller.selectWritingType}
                    progress={controller.writingTypeProgress}
                />
                {selectedContent}
            </div>
        );
    })();

    return (
        <LanguageLearningPageLayout
            title={t("title")}
            description={t("description")}
        >
            {content}
        </LanguageLearningPageLayout>
    );
}
