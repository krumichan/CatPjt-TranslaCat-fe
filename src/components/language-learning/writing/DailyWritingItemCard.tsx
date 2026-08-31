"use client";

import { useTranslations } from "next-intl";

import { WritingEvaluationPanel } from "@/components/language-learning/writing/WritingEvaluationPanel";
import type { DailyWritingItem } from "@/types/language-learning/daily";

interface DailyWritingItemCardProps {
    item: DailyWritingItem;
    draft: string;
    isSubmitting: boolean;
    onDraftChange: (value: string) => void;
    onSubmit: () => void;
}

export function DailyWritingItemCard({
    item,
    draft,
    isSubmitting,
    onDraftChange,
    onSubmit,
}: DailyWritingItemCardProps) {
    const t = useTranslations("LanguageLearning.writing.item");
    const latestAttempt = item.attempts.at(-1) ?? null;
    const evaluation = latestAttempt?.evaluation ?? null;

    const difficultyClass = {
        REVIEW: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
        NORMAL: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200",
        CHALLENGE: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200",
    }[item.difficulty];

    return (
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-black ${difficultyClass}`}>
                    {t(`difficulty.${item.difficulty}`)}
                </span>
                <span className="text-xs font-black text-slate-400">
                    #{item.order}
                </span>
                {item.keywords.map((keyword) => (
                    <span key={keyword} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {keyword}
                    </span>
                ))}
            </div>

            {item.difficulty === "CHALLENGE" && (
                <p className="mt-2 text-xs leading-5 text-violet-600 dark:text-violet-300">
                    {t("difficultyDescription.CHALLENGE")}
                </p>
            )}

            <div className="mt-5 rounded-2xl bg-slate-50 p-5 dark:bg-white/5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    {t("prompt")}
                </p>
                <p className="mt-3 text-lg font-bold leading-8 text-slate-900 dark:text-white">
                    {item.originText}
                </p>
                {item.focusReason && (
                    <p className="mt-3 text-xs leading-5 text-slate-400">
                        {item.focusReason}
                    </p>
                )}
            </div>

            {item.canSubmit ? (
                <div className="mt-5">
                    <label className="block">
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                            {t("answer")}
                        </span>
                        <textarea
                            value={draft}
                            onChange={(event) => onDraftChange(event.target.value)}
                            disabled={isSubmitting}
                            rows={4}
                            maxLength={3000}
                            className="mt-2 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-60 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                            placeholder={t("placeholder")}
                        />
                    </label>
                    <div className="mt-3 flex justify-end">
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!draft.trim() || isSubmitting}
                            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? t("evaluating") : t("submit")}
                        </button>
                    </div>
                </div>
            ) : (
                <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    {item.answeredToday ? t("answeredToday") : t("reviewExpired")}
                </p>
            )}

            {latestAttempt && (
                <section className="mt-5 border-t border-slate-200 pt-5 dark:border-white/10">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        {t("latestAnswer")}
                    </p>
                    <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:bg-white/5 dark:text-slate-200">
                        {latestAttempt.answer}
                    </p>
                </section>
            )}

            {evaluation && (
                <div className="mt-5">
                    <WritingEvaluationPanel evaluation={evaluation} />
                </div>
            )}
        </article>
    );
}
