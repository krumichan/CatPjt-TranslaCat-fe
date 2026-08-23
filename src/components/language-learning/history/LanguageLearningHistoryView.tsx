"use client";

import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { ListeningHistoryDetail } from "@/components/language-learning/history/ListeningHistoryDetail";
import { SpeakingHistoryDetail } from "@/components/language-learning/history/SpeakingHistoryDetail";
import { UnifiedLearningHistoryList } from "@/components/language-learning/history/UnifiedLearningHistoryList";
import { WritingHistoryDetail } from "@/components/language-learning/history/WritingHistoryDetail";
import type { LearningHistoryPageController } from "@/hooks/language-learning/useLearningHistoryPageController";

export function LanguageLearningHistoryView({
    controller,
}: {
    controller: LearningHistoryPageController;
}) {
    const t = useTranslations("LanguageLearning.history");
    const common = useTranslations("LanguageLearning.common");

    if (controller.items.length === 0) {
        return (
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-10 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                <CalendarDays
                    className="mx-auto h-10 w-10 text-slate-300"
                    aria-hidden="true"
                />
                <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                    {t("empty.title")}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {t("empty.description")}
                </p>
            </section>
        );
    }

    let detailContent;
    if (controller.detailLoading) {
        detailContent = (
            <LanguageLearningStateCard
                variant="loading"
                title={common("loadingTitle")}
                message={t("historyLoading")}
            />
        );
    } else if (controller.detailError || !controller.detail) {
        detailContent = (
            <LanguageLearningStateCard
                variant="error"
                title={common("loadFailedTitle")}
                message={t("historyLoadFailed")}
                actionLabel={common("retry")}
                onAction={() => void controller.reloadDetail()}
            />
        );
    } else if (controller.detail.source === "WRITING") {
        detailContent = (
            <WritingHistoryDetail
                history={controller.detail.detail}
                controller={controller}
            />
        );
    } else if (controller.detail.source === "SPEAKING") {
        detailContent = <SpeakingHistoryDetail detail={controller.detail.detail} />;
    } else if (controller.detail.source === "LISTENING") {
        detailContent = <ListeningHistoryDetail detail={controller.detail.detail} />;
    } else {
        detailContent = <LanguageLearningStateCard variant="loading" title={common("loadingTitle")} message={t("readingPreparing")} />;
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            <UnifiedLearningHistoryList controller={controller} />
            <section className="min-w-0">{detailContent}</section>
        </div>
    );
}
