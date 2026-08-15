"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningOnboardingCard } from "@/components/language-learning/common/LanguageLearningOnboardingCard";
import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningDashboardView } from "@/components/language-learning/dashboard/LanguageLearningDashboardView";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import {
    useLanguageLearningDashboardPageController,
} from "@/hooks/language-learning/useLanguageLearningDashboardPageController";

export function LanguageLearningDashboardSmartPage() {
    const t = useTranslations("LanguageLearning.dashboard");
    const common = useTranslations("LanguageLearning.common");
    const controller = useLanguageLearningDashboardPageController();

    const content = (() => {
        if (controller.entry.isLoading) {
            return (
                <LanguageLearningStateCard
                    variant="loading"
                    title={common("loadingTitle")}
                    message={t("loading")}
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

        if (controller.isLoadingData) {
            return (
                <LanguageLearningStateCard
                    variant="loading"
                    title={common("loadingTitle")}
                    message={t("loadingData")}
                />
            );
        }

        if (
            controller.loadError ||
            !controller.dashboard ||
            !controller.profile
        ) {
            return (
                <LanguageLearningStateCard
                    variant="error"
                    title={common("loadFailedTitle")}
                    message={t("loadFailed")}
                    actionLabel={common("retry")}
                    onAction={() => void controller.reloadData()}
                />
            );
        }

        return (
            <LanguageLearningDashboardView
                dashboard={controller.dashboard}
                profile={controller.profile}
                recheckRecommended={
                    controller.entry.levelStatus?.recheckRecommended ?? false
                }
            />
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
