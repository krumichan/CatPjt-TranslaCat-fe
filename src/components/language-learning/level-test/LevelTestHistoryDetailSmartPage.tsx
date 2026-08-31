"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { LevelTestHistoryDetailView } from "@/components/language-learning/level-test/LevelTestHistoryDetailView";
import { useLevelTestHistoryDetailController } from "@/hooks/language-learning/useLevelTestHistoryController";

interface LevelTestHistoryDetailSmartPageProps {
    sessionId: number;
}

export function LevelTestHistoryDetailSmartPage({ sessionId }: LevelTestHistoryDetailSmartPageProps) {
    const t = useTranslations("LanguageLearning.levelTest.history");
    const common = useTranslations("LanguageLearning.common");
    const controller = useLevelTestHistoryDetailController(sessionId);

    const content = controller.isLoading ? (
        <LanguageLearningStateCard
            variant="loading"
            title={common("loadingTitle")}
            message={t("loading")}
        />
    ) : controller.loadError || !controller.detail ? (
        <LanguageLearningStateCard
            variant="error"
            title={common("loadFailedTitle")}
            message={t("loadFailed")}
            actionLabel={common("retry")}
            onAction={() => void controller.reload()}
        />
    ) : (
        <LevelTestHistoryDetailView detail={controller.detail} />
    );

    return (
        <LanguageLearningPageLayout
            title={t("detailTitle")}
            description={t("detailDescription")}
        >
            <div className="mx-auto w-full max-w-5xl">{content}</div>
        </LanguageLearningPageLayout>
    );
}
