"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { LanguageLearningLevelTestView } from "@/components/language-learning/level-test/LanguageLearningLevelTestView";
import {
    useLanguageLearningLevelTestController,
} from "@/hooks/language-learning/useLanguageLearningLevelTestController";

export function LanguageLearningLevelTestSmartPage() {
    const t = useTranslations("LanguageLearning.levelTest");
    const common = useTranslations("LanguageLearning.common");
    const controller = useLanguageLearningLevelTestController();

    const content = controller.isLoading ? (
        <LanguageLearningStateCard
            variant="loading"
            title={common("loadingTitle")}
            message={t("loading")}
        />
    ) : controller.loadError || !controller.status ? (
        <LanguageLearningStateCard
            variant="error"
            title={common("loadFailedTitle")}
            message={t("loadFailed")}
            actionLabel={common("retry")}
            onAction={() => void controller.reload()}
        />
    ) : (
        <LanguageLearningLevelTestView controller={controller} />
    );

    return (
        <LanguageLearningPageLayout
            title={t("title")}
            description={t("description")}
        >
            <div className="mx-auto w-full max-w-5xl">
                {content}
            </div>
        </LanguageLearningPageLayout>
    );
}
