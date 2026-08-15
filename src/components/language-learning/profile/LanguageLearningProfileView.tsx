"use client";

import { useTranslations } from "next-intl";

import { SignalList } from "@/components/language-learning/common/SignalList";
import { SkillRadarChart } from "@/components/language-learning/common/SkillRadarChart";
import type { LanguageLearningProfile } from "@/types/language-learning/profile";

export function LanguageLearningProfileView({ profile }: { profile: LanguageLearningProfile }) {
    const t = useTranslations("LanguageLearning.profile");

    return (
        <div className="space-y-6" data-testid="language-learning-profile">
            <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                            {t(`state.${profile.state}`)}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {t("confidence", { value: Math.round(profile.confidence) })}
                        </span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{t("baseLevel")}</p>
                            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{profile.baseLevelScore?.toFixed(1) ?? "-"}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{t("trend")}</p>
                            <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{profile.trend || "-"}</p>
                        </div>
                    </div>
                    {profile.state === "CALIBRATING" && (
                        <p className="mt-4 rounded-xl bg-cyan-50 px-4 py-3 text-sm leading-6 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-200">{t("calibrating")}</p>
                    )}
                </div>
                <SkillRadarChart scores={profile.skillScores} height={260} />
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
                {[
                    ["strengths", profile.strengths],
                    ["weaknesses", profile.weaknesses],
                    ["focus", profile.recommendedFocus],
                ].map(([key, items]) => (
                    <article key={key as string} className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">{t(`signals.${key}.title`)}</h2>
                        <div className="mt-4">
                            <SignalList items={items as LanguageLearningProfile["strengths"]} emptyText={t(`signals.${key}.empty`)} />
                        </div>
                    </article>
                ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("grammar.title")}</h2>
                    <div className="mt-4"><SignalList items={profile.grammarWeaknesses} emptyText={t("grammar.empty")} /></div>
                </article>
                <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("errors.title")}</h2>
                    <div className="mt-4"><SignalList items={profile.errorPatterns} emptyText={t("errors.empty")} /></div>
                </article>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("keywords.title")}</h2>
                {profile.keywordMasteries.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">{t("keywords.empty")}</p>
                ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {[...profile.keywordMasteries].sort((a, b) => b.score - a.score).map((keyword) => (
                            <div key={keyword.canonicalKey} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="truncate text-sm font-black text-slate-700 dark:text-slate-200">{keyword.canonicalKey}</span>
                                    <span className="text-sm font-black text-blue-600 dark:text-blue-300">{keyword.score.toFixed(0)}</span>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, keyword.score))}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
