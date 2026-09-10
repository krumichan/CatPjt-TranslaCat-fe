"use client";

import { useTranslations } from "next-intl";
import { canRetryReadAloudEvaluation, readAloudEvaluationStatusKey } from "@/features/language-learning/speaking/evaluationState";
import type { SpeakingReadAloudProblemEvaluation } from "@/types/language-learning/speaking";

export function SpeakingReadAloudEvaluationItem({ item, retrying, retryError, onRetry }: {
    item: SpeakingReadAloudProblemEvaluation;
    retrying: boolean;
    retryError: boolean;
    onRetry: (problemIndex: number) => void;
}) {
    const t = useTranslations("LanguageLearning.speaking.evaluation.problemResults");
    const showScore = item.status === "EVALUATED" && item.overallScore != null;
    return (
        <article data-testid={`speaking-problem-result-${item.problemIndex}`} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-black text-slate-900 dark:text-white">{t("problem", { number: item.problemIndex })}</h3>
                <p role="status" className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    {t(`status.${readAloudEvaluationStatusKey(item.status)}`)}
                    {showScore ? ` · ${Math.round(item.overallScore ?? 0)} / 100` : ""}
                </p>
            </div>
            {canRetryReadAloudEvaluation(item) && (
                <button type="button" data-testid={`speaking-problem-retry-${item.problemIndex}`} disabled={retrying}
                    onClick={() => onRetry(item.problemIndex)}
                    className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                    {retrying ? t("retrying") : t("retry")}
                </button>
            )}
            {item.status === "FAILED" && !canRetryReadAloudEvaluation(item) && (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("limitReached")}</p>
            )}
            {retryError && <p role="alert" className="mt-3 text-sm font-bold text-rose-600">{t("retryFailed")}</p>}
        </article>
    );
}
