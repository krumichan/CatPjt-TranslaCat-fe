"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { SpeakingEvaluationView } from "@/components/language-learning/speaking/evaluation/SpeakingEvaluationView";
import { useSpeakingEvaluationController } from "@/hooks/language-learning/speaking/useSpeakingEvaluationController";

export function SpeakingEvaluationSmartPage({ sessionId }: { sessionId: number }) {
    const t = useTranslations("LanguageLearning.speaking.evaluation");
    const common = useTranslations("LanguageLearning.common");
    const controller = useSpeakingEvaluationController(sessionId);

    const content = controller.isLoading ? (
        <LanguageLearningStateCard variant="loading" title={common("loadingTitle")} message={t("loading")} />
    ) : controller.loadError ? (
        <LanguageLearningStateCard variant="error" title={common("loadFailedTitle")} message={t("loadFailed")} actionLabel={common("retry")} onAction={() => void controller.reload()} />
    ) : (
        <SpeakingEvaluationView controller={controller} />
    );

    return (
        <LanguageLearningPageLayout title={t("title")} description={t("description")}>
            {content}
        </LanguageLearningPageLayout>
    );
}
