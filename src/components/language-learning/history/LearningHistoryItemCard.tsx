"use client";

import { useTranslations } from "next-intl";

import { DailyWritingPromptBlock } from "@/components/language-learning/writing/DailyWritingPromptBlock";
import { WritingEvaluationPanel } from "@/components/language-learning/writing/WritingEvaluationPanel";
import type { DailyWritingType } from "@/types/language-learning/common";
import type { DailyWritingItem } from "@/types/language-learning/daily";

interface LearningHistoryItemCardProps {
    item: DailyWritingItem;
    writingType: DailyWritingType;
    reviewAvailable: boolean;
    draft: string;
    isSubmitting: boolean;
    onDraftChange: (value: string) => void;
    onSubmit: () => void;
}

export function LearningHistoryItemCard({
    item,
    writingType,
    reviewAvailable,
    draft,
    isSubmitting,
    onDraftChange,
    onSubmit,
}: LearningHistoryItemCardProps) {
    const t = useTranslations("LanguageLearning.history");
    const canReview = reviewAvailable && item.canSubmit;

    return (
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-400">
                <span>#{item.order}</span>
                <span>·</span>
                <span>{t(`difficulty.${item.difficulty}`)}</span>
            </div>

            <div className="mt-3">
                <DailyWritingPromptBlock
                    item={item}
                    writingType={writingType}
                    showFocusReason={false}
                />
            </div>

            <div className="mt-5 space-y-4">
                {item.attempts.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-400 dark:bg-white/5">
                        {t("noAttempt")}
                    </p>
                ) : (
                    item.attempts.map((attempt) => (
                        <div
                            key={attempt.answerId}
                            className="space-y-3 border-t border-slate-200 pt-4 first:border-t-0 first:pt-0 dark:border-white/10"
                        >
                            <div>
                                <p className="text-xs font-black text-slate-400">
                                    {attempt.attemptDate}
                                </p>
                                <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:bg-white/5 dark:text-slate-200">
                                    {attempt.answer}
                                </p>
                            </div>

                            {attempt.evaluation && (
                                <WritingEvaluationPanel
                                    evaluation={attempt.evaluation}
                                    compact
                                />
                            )}
                        </div>
                    ))
                )}
            </div>

            {canReview && (
                <div className="mt-5 border-t border-slate-200 pt-5 dark:border-white/10">
                    <label className="block">
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                            {t("review.answerLabel")}
                        </span>
                        <textarea
                            value={draft}
                            onChange={(event) =>
                                onDraftChange(event.target.value)
                            }
                            rows={4}
                            maxLength={3000}
                            disabled={isSubmitting}
                            placeholder={t("review.placeholder")}
                            className="mt-2 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-60 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                        />
                    </label>

                    <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-400">
                            {t("review.notice")}
                        </p>
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!draft.trim() || isSubmitting}
                            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting
                                ? t("review.submitting")
                                : t("review.submit")}
                        </button>
                    </div>
                </div>
            )}
        </article>
    );
}
