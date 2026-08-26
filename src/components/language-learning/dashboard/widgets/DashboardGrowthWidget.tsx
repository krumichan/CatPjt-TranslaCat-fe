"use client";

import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DashboardGrowth } from "@/types/language-learning/dashboard";

export function DashboardGrowthWidget({ data }: { data: DashboardGrowth[] }) {
    const t = useTranslations("LanguageLearning.dashboard.v3");
    const sourceLabels: Record<string, string> = {
        WRITING: t("activity.writing"),
        SPEAKING: t("activity.speaking"),
        LISTENING: t("activity.listening"),
        READING: t("activity.reading"),
    };
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900" data-testid="dashboard-growth">
            <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("growth.title")}</h2>
            </div>
            {data.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">{t("growth.empty")}</p>
            ) : (
                <div className="mt-4 space-y-3">
                    {data.map((item, index) => (
                        <article key={`${item.source}-${item.metric}-${item.taskType ?? "ALL"}-${index}`} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-black text-slate-800 dark:text-slate-100">{t(`metric.${item.metric}`)}</p>
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                                    {item.delta === null ? "—" : `${item.delta >= 0 ? "+" : ""}${item.delta.toFixed(1)}`}
                                </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-400">
                                {t("growth.meta", {
                                    source: sourceLabels[item.source] ?? item.source,
                                    previous: item.previousAverage ?? 0,
                                    recent: item.recentAverage ?? 0,
                                    previousCount: item.previousSampleCount,
                                    recentCount: item.recentSampleCount,
                                })}
                            </p>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
