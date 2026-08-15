"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningOnboardingCard } from "@/components/language-learning/common/LanguageLearningOnboardingCard";
import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
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

        if (controller.isLoadingDaily || controller.isDailyGenerating) {
            return (
                <LanguageLearningStateCard
                    variant="loading"
                    title={t("generatingTitle")}
                    message={t("generatingMessage")}
                />
            );
        }

        if (controller.dailyLoadError || !controller.dailySet) {
            return (
                <LanguageLearningStateCard
                    variant="error"
                    title={common("loadFailedTitle")}
                    message={t("loadFailed")}
                    actionLabel={common("retry")}
                    onAction={() => void controller.reloadDaily()}
                />
            );
        }

        return <DailyWritingView controller={controller} />;
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
