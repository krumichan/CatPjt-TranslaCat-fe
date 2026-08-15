"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LearningHistoryItemCard } from "@/components/language-learning/history/LearningHistoryItemCard";
import type { LearningHistoryPageController } from "@/hooks/language-learning/useLearningHistoryPageController";

interface LearningHistoryDailySetProps {
    controller: LearningHistoryPageController;
}

export function LearningHistoryDailySet({
    controller,
}: LearningHistoryDailySetProps) {
    const t = useTranslations("LanguageLearning.history");
    const common = useTranslations("LanguageLearning.common");

    if (controller.historyLoading) {
        return (
            <LanguageLearningStateCard
                variant="loading"
                title={common("loadingTitle")}
                message={t("historyLoading")}
            />
        );
    }

    if (controller.historyError || !controller.history) {
        return (
            <LanguageLearningStateCard
                variant="error"
                title={common("loadFailedTitle")}
                message={t("historyLoadFailed")}
                actionLabel={common("retry")}
                onAction={() => void controller.reload()}
            />
        );
    }

    const history = controller.history;

    return (
        <>
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                            {history.learningDate}
                        </p>
                        <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                            {t("setTitle", {
                                count: history.sentenceCount,
                            })}
                        </h2>
                    </div>
                    <span
                        className={clsx(
                            "rounded-full px-3 py-1 text-xs font-black",
                            history.reviewAvailable
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                                : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300",
                        )}
                    >
                        {history.reviewAvailable
                            ? t("reviewAvailable")
                            : t("reviewExpired")}
                    </span>
                </div>
            </div>

            {controller.actionError && (
                <p
                    role="alert"
                    className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
                >
                    {t("review.submitFailed")}
                </p>
            )}

            {history.items.map((item) => (
                <LearningHistoryItemCard
                    key={item.itemId}
                    item={item}
                    reviewAvailable={history.reviewAvailable}
                    draft={controller.reviewDrafts[item.itemId] ?? ""}
                    isSubmitting={controller.submittingItemId === item.itemId}
                    onDraftChange={(value) =>
                        controller.updateReviewDraft(item.itemId, value)
                    }
                    onSubmit={() => void controller.submitReviewAnswer(item)}
                />
            ))}
        </>
    );
}
