"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { LevelTestHistoryView } from "@/components/language-learning/level-test/LevelTestHistoryView";
import { useLevelTestHistoryController } from "@/hooks/language-learning/useLevelTestHistoryController";

export function LevelTestHistorySmartPage() {
    const t = useTranslations("LanguageLearning.levelTest.history");
    const common = useTranslations("LanguageLearning.common");
    const controller = useLevelTestHistoryController();

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
        <LevelTestHistoryView controller={controller} />
    );

    return (
        <LanguageLearningPageLayout title={t("title")} description={t("description")}>
            <div className="mx-auto w-full max-w-5xl">{content}</div>
        </LanguageLearningPageLayout>
    );
}
