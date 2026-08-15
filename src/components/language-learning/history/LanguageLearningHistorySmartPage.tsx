"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningHistoryView } from "@/components/language-learning/history/LanguageLearningHistoryView";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { useLearningHistoryPageController } from "@/hooks/language-learning/useLearningHistoryPageController";

export function LanguageLearningHistorySmartPage() {
    const t = useTranslations("LanguageLearning.history");
    const common = useTranslations("LanguageLearning.common");
    const controller = useLearningHistoryPageController();

    const content = controller.isLoading ? (
        <LanguageLearningStateCard
            variant="loading"
            title={common("loadingTitle")}
            message={t("loading")}
        />
    ) : controller.loadError ? (
        <LanguageLearningStateCard
            variant="error"
            title={common("loadFailedTitle")}
            message={t("loadFailed")}
            actionLabel={common("retry")}
            onAction={() => void controller.reload()}
        />
    ) : (
        <LanguageLearningHistoryView controller={controller} />
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
