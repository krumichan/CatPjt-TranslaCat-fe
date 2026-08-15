"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { LanguageLearningProfileView } from "@/components/language-learning/profile/LanguageLearningProfileView";
import {
    useLanguageLearningProfilePageController,
} from "@/hooks/language-learning/useLanguageLearningProfilePageController";

export function LanguageLearningProfileSmartPage() {
    const t = useTranslations("LanguageLearning.profile");
    const common = useTranslations("LanguageLearning.common");
    const controller = useLanguageLearningProfilePageController();

    const content = controller.isLoading ? (
        <LanguageLearningStateCard
            variant="loading"
            title={common("loadingTitle")}
            message={t("loading")}
        />
    ) : controller.loadError || !controller.profile ? (
        <LanguageLearningStateCard
            variant="error"
            title={common("loadFailedTitle")}
            message={t("loadFailed")}
            actionLabel={common("retry")}
            onAction={() => void controller.reload()}
        />
    ) : (
        <LanguageLearningProfileView profile={controller.profile} />
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
