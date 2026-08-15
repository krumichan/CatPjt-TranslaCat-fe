"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { SpeakingSessionView } from "@/components/language-learning/speaking/session/SpeakingSessionView";
import { useSpeakingSessionController } from "@/hooks/language-learning/speaking/useSpeakingSessionController";

export function SpeakingSessionSmartPage({ sessionId }: { sessionId: number }) {
    const t = useTranslations("LanguageLearning.speaking.session");
    const common = useTranslations("LanguageLearning.common");
    const controller = useSpeakingSessionController(sessionId);

    const content = controller.isLoading ? (
        <LanguageLearningStateCard variant="loading" title={common("loadingTitle")} message={t("loading")} />
    ) : controller.loadError || !controller.detail ? (
        <LanguageLearningStateCard variant="error" title={common("loadFailedTitle")} message={t("loadFailed")} actionLabel={common("retry")} onAction={() => void controller.reload()} />
    ) : (
        <SpeakingSessionView controller={controller} />
    );

    return (
        <LanguageLearningPageLayout title={t("title")} description={t("description")}>
            {content}
        </LanguageLearningPageLayout>
    );
}
