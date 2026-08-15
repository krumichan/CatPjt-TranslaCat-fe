"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import { parseEvidence } from "@/components/language-learning/speaking/evaluation/speakingEvaluationParser";
import type { SpeakingMetric } from "@/types/language-learning/speaking";

export function SpeakingEvaluationMetricCard({
    metric,
    onEvidence,
}: {
    metric: SpeakingMetric;
    onEvidence: (turnId: string, turnIndex?: number) => void;
}) {
    const t = useTranslations("LanguageLearning.speaking.evaluation");
    const evidence = parseEvidence(metric.evidenceJson);
    const evaluable = metric.state === "EVALUATED" && metric.score !== null;

    return (
        <article
            data-testid={`speaking-metric-${metric.metricType}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {t(`metrics.${metric.metricType}`)}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-400">
                        {t("confidence", {
                            value: Math.round(metric.confidence * 100),
                        })}
                    </p>
                </div>
                {evaluable ? (
                    <strong className="text-2xl font-black text-blue-600 dark:text-blue-300">
                        {Math.round(metric.score ?? 0)}
                    </strong>
                ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                        {t("notEvaluable")}
                    </span>
                )}
            </div>

            {metric.summary && (
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {metric.summary}
                </p>
            )}
            {!evaluable && metric.notEvaluableReason && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                    {metric.notEvaluableReason}
                </p>
            )}
            {evidence.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-white/10">
                    <p className="text-xs font-black text-slate-500">{t("evidence")}</p>
                    {evidence.slice(0, 3).map((item, index) => (
                        <button
                            key={`${item.turnId ?? item.turnIndex ?? "evidence"}-${index}`}
                            type="button"
                            disabled={!item.turnId && !item.turnIndex}
                            onClick={() => onEvidence(item.turnId ?? "", item.turnIndex)}
                            className="flex w-full items-start justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-left text-xs leading-5 text-slate-600 disabled:cursor-default dark:bg-white/5 dark:text-slate-300"
                        >
                            <span>
                                {item.message ??
                                    item.quote ??
                                    item.reason ??
                                    t("evidenceFallback")}
                            </span>
                            {(item.turnId || item.turnIndex) && (
                                <ExternalLink
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </article>
    );
}
