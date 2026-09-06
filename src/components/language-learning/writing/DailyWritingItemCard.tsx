"use client";

import { CircleAlert, CloudCheck, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { DailyWritingPromptBlock } from "@/components/language-learning/writing/DailyWritingPromptBlock";
import { WritingEvaluationPanel } from "@/components/language-learning/writing/WritingEvaluationPanel";
import type { DailyWritingType } from "@/types/language-learning/common";
import type { DailyWritingItem } from "@/types/language-learning/daily";

interface DailyWritingItemCardProps {
    item: DailyWritingItem;
    writingType: DailyWritingType;
    draft: string;
    draftPersistenceEnabled: boolean;
    isSubmitting: boolean;
    isInteractionLocked: boolean;
    onDraftChange: (value: string) => void;
    onSubmit: () => void;
}

export function DailyWritingItemCard({
    item,
    writingType,
    draft,
    draftPersistenceEnabled,
    isSubmitting,
    isInteractionLocked,
    onDraftChange,
    onSubmit,
}: DailyWritingItemCardProps) {
    const t = useTranslations("LanguageLearning.writing.item");
    const latestAttempt = item.attempts.at(-1) ?? null;
    const evaluationStatus = latestAttempt?.evaluationStatus ?? null;
    const evaluation = latestAttempt?.evaluation ?? null;
    const isEvaluationPending = evaluationStatus === "PENDING";
    const isEvaluationFailed = evaluationStatus === "FAILED";

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

            <div className="mt-5">
                <DailyWritingPromptBlock
                    item={item}
                    writingType={writingType}
                />
            </div>

            {isEvaluationPending && (
                <div
                    className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-100"
                    role="status"
                >
                    <LoaderCircle
                        className="mt-0.5 h-4 w-4 shrink-0 animate-spin"
                        aria-hidden="true"
                    />
                    <div>
                        <p className="font-black">{t("pending.title")}</p>
                        <p className="mt-1 text-xs leading-5 opacity-80">
                            {t("pending.description")}
                        </p>
                    </div>
                </div>
            )}

            {isEvaluationFailed && (
                <div
                    className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100"
                    role="alert"
                >
                    <CircleAlert
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                    />
                    <div>
                        <p className="font-black">{t("failed.title")}</p>
                        <p className="mt-1 text-xs leading-5 opacity-80">
                            {t("failed.description")}
                        </p>
                    </div>
                </div>
            )}

            {item.canSubmit ? (
                <div className="mt-5">
                    <label className="block">
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                            {t("answer")}
                        </span>
                        <textarea
                            value={draft}
                            onChange={(event) => onDraftChange(event.target.value)}
                            disabled={isInteractionLocked}
                            rows={4}
                            maxLength={3000}
                            className="mt-2 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-60 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                            placeholder={t("placeholder")}
                        />
                    </label>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="min-h-5 text-xs font-bold text-slate-400">
                            {draft.trim() && draftPersistenceEnabled && (
                                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300">
                                    <CloudCheck
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                    />
                                    {t("draftSaved")}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!draft.trim() || isInteractionLocked}
                            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting
                                ? t("queueing")
                                : isEvaluationFailed
                                  ? t("retry")
                                  : t("submit")}
                        </button>
                    </div>
                </div>
            ) : !isEvaluationPending ? (
                <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    {item.answeredToday ? t("answeredToday") : t("reviewExpired")}
                </p>
            ) : null}

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
