"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { LevelTestResultView } from "@/components/language-learning/level-test/LevelTestResultView";
import { useLevelTestResultController } from "@/hooks/language-learning/useLevelTestResultController";

interface LevelTestResultSmartPageProps {
    sessionId: number;
}

export function LevelTestResultSmartPage({ sessionId }: LevelTestResultSmartPageProps) {
    const t = useTranslations("LanguageLearning.levelTest");
    const common = useTranslations("LanguageLearning.common");
    const controller = useLevelTestResultController(sessionId);

    const content = controller.isLoading ? (
        <LanguageLearningStateCard
            variant="loading"
            title={common("loadingTitle")}
            message={t("loading")}
        />
    ) : controller.loadError || !controller.result ? (
        <LanguageLearningStateCard
            variant="error"
            title={common("loadFailedTitle")}
            message={t("loadFailed")}
            actionLabel={common("retry")}
            onAction={() => void controller.reload()}
        />
    ) : (
        <LevelTestResultView result={controller.result} />
    );

    return (
        <LanguageLearningPageLayout
            title={t("result.title")}
            description={t("result.description")}
        >
            <div className="mx-auto w-full max-w-5xl">{content}</div>
        </LanguageLearningPageLayout>
    );
}
