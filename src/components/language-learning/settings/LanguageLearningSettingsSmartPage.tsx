"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { LanguageLearningSettingsView } from "@/components/language-learning/settings/LanguageLearningSettingsView";
import {
    useLanguageLearningSettingsPageController,
} from "@/hooks/language-learning/useLanguageLearningSettingsPageController";

export function LanguageLearningSettingsSmartPage() {
    const t = useTranslations("LanguageLearning.settings");
    const common = useTranslations("LanguageLearning.common");
    const controller = useLanguageLearningSettingsPageController();

    // 이미 표시한 키워드는 재조회 실패에도 유지하고, 최초 조회만 페이지 전체 상태로 처리한다.
    const keywordsMissing = controller.keywordManager.data === null;
    const legacySettingsLoading = controller.entry.isLoading || (keywordsMissing && controller.keywordManager.isLoading);
    const legacySettingsFailed = Boolean(
        controller.entry.settingError || (keywordsMissing && controller.keywordManager.loadError) || !controller.entry.setting,
    );

    const content =
        legacySettingsLoading ? (
            <LanguageLearningStateCard
                variant="loading"
                title={common("loadingTitle")}
                message={t("loading")}
            />
        ) : legacySettingsFailed ? (
            <LanguageLearningStateCard
                variant="error"
                title={common("loadFailedTitle")}
                message={t("loadFailed")}
                actionLabel={common("retry")}
                onAction={() =>
                    void Promise.all([
                        controller.entry.reload(),
                        controller.keywordManager.refresh(),
                    ])
                }
            />
        ) : (
            <LanguageLearningSettingsView controller={controller} />
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
