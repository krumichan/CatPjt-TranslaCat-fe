"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningOnboardingCard } from "@/components/language-learning/common/LanguageLearningOnboardingCard";
import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { SpeakingStartView } from "@/components/language-learning/speaking/start/SpeakingStartView";
import { useSpeakingStartPageController } from "@/hooks/language-learning/speaking/useSpeakingStartPageController";

export function SpeakingStartSmartPage() {
    const t = useTranslations("LanguageLearning.speaking.start");
    const common = useTranslations("LanguageLearning.common");
    const controller = useSpeakingStartPageController();

    let content;
    if (controller.entry.isLoading) {
        content = (
            <LanguageLearningStateCard
                variant="loading"
                title={common("loadingTitle")}
                message={t("loading")}
            />
        );
    } else if (controller.entry.settingError || !controller.entry.setting) {
        content = (
            <LanguageLearningStateCard
                variant="error"
                title={common("loadFailedTitle")}
                message={t("loadFailed")}
                actionLabel={common("retry")}
                onAction={() => void controller.entry.reload()}
            />
        );
    } else if (!controller.entry.setting.configured) {
        content = <LanguageLearningOnboardingCard mode="SETTING" />;
    } else {
        content = <SpeakingStartView controller={controller} />;
    }

    return (
        <LanguageLearningPageLayout
            title={t("pageTitle")}
            description={t("pageDescription")}
        >
            {content}
        </LanguageLearningPageLayout>
    );
}
