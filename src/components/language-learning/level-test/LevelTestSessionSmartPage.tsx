"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { LevelTestQuestionCard } from "@/components/language-learning/level-test/LevelTestQuestionCard";
import { useLevelTestSessionController } from "@/hooks/language-learning/useLevelTestSessionController";

interface LevelTestSessionSmartPageProps {
    sessionId: number;
}

export function LevelTestSessionSmartPage({ sessionId }: LevelTestSessionSmartPageProps) {
    const t = useTranslations("LanguageLearning.levelTest");
    const common = useTranslations("LanguageLearning.common");
    const controller = useLevelTestSessionController(sessionId);

    const content = controller.isLoading ? (
        <LanguageLearningStateCard
            variant="loading"
            title={common("loadingTitle")}
            message={t("loading")}
        />
    ) : controller.answerAcceptedNextQuestionFailed ? (
        <LanguageLearningStateCard
            variant="info"
            title={t("session.nextQuestionLoadFailedTitle")}
            message={t("errors.LEVEL_TEST_NEXT_QUESTION_REFRESH_FAILED")}
            actionLabel={common("retry")}
            onAction={() => void controller.reload()}
        />
    ) : controller.loadError || !controller.session || !controller.question ? (
        <LanguageLearningStateCard
            variant="error"
            title={common("loadFailedTitle")}
            message={t("loadFailed")}
            actionLabel={common("retry")}
            onAction={() => void controller.reload()}
        />
    ) : (
        <LevelTestQuestionCard controller={controller} />
    );

    return (
        <LanguageLearningPageLayout
            title={t("session.title")}
            description={t("session.description")}
        >
            <div className="mx-auto w-full max-w-5xl">{content}</div>
        </LanguageLearningPageLayout>
    );
}
