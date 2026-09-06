"use client";

import { useTranslations } from "next-intl";

import { LearningHistoryItemCard } from "@/components/language-learning/history/LearningHistoryItemCard";
import type { LearningHistoryPageController } from "@/hooks/language-learning/useLearningHistoryPageController";
import type { DailyWritingSet } from "@/types/language-learning/daily";

export function WritingHistoryDetail({
    history,
    controller,
}: {
    history: DailyWritingSet;
    controller: LearningHistoryPageController;
}) {
    const t = useTranslations("LanguageLearning.writing.types");

    return (
        <div className="space-y-4" data-testid="writing-history-detail">
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">{history.learningDate}</p>
                <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                    Writing · {t(history.writingType)} · {history.sentenceCount}
                </h2>
            </div>
            {controller.actionError && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">Failed to submit review answer.</p>}
            {history.items.map((item) => (
                <LearningHistoryItemCard
                    key={item.itemId}
                    item={item}
                    writingType={history.writingType}
                    reviewAvailable={history.reviewAvailable}
                    draft={controller.reviewDrafts[item.itemId] ?? ""}
                    isSubmitting={controller.submittingItemId === item.itemId}
                    onDraftChange={(value) => controller.updateReviewDraft(item.itemId, value)}
                    onSubmit={() => void controller.submitReviewAnswer(item)}
                />
            ))}
        </div>
    );
}
