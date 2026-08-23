"use client";

import { Target } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DashboardWeakness } from "@/types/language-learning/dashboard";

const TRANSLATED_METRICS = new Set([
    "LISTENING_RECOGNITION", "TOKEN_RECOGNITION", "OMISSION_ADDITION_ORDER",
    "ORTHOGRAPHY", "MEANING", "MEANING_FIDELITY", "DETAIL_AND_NUANCE",
    "ORIGIN_NATURALNESS", "PRONUNCIATION", "PROSODY_RHYTHM", "FLUENCY",
    "COMPLETENESS", "VOCABULARY", "SPOKEN_EXPRESSION", "INTERACTION",
    "WRITTEN_EXPRESSION", "GRAMMAR", "NATURALNESS", "EXPRESSIVENESS",
    "EXPRESSION", "OVERALL",
]);

export function DashboardWeaknessInsightsWidget({ data }: { data: DashboardWeakness[] }) {
    const t = useTranslations("LanguageLearning.dashboard.v3");
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900" data-testid="dashboard-weaknesses-v3">
            <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-600" aria-hidden="true" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("weakness.title")}</h2>
            </div>
            {data.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">{t("weakness.empty")}</p>
            ) : (
                <div className="mt-4 space-y-3">
                    {data.map((item) => (
                        <article key={`${item.key}-${item.state}`} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-black text-slate-800 dark:text-slate-100">{TRANSLATED_METRICS.has(item.key) ? t(`metric.${item.key}`) : item.key}</p>
                                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-slate-200">
                                    {t(`weakness.state.${item.state}`)}
                                </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-400">
                                {t("weakness.evidence", {
                                    count: item.evidenceCount,
                                    score: item.recentScore ?? 0,
                                    sources: item.sources.join(" · "),
                                })}
                            </p>
                            {item.recommendedFocus && <p className="mt-2 text-sm font-bold text-amber-700 dark:text-amber-200">{item.recommendedFocus}</p>}
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
