"use client";

import { ArrowRight, History, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { LevelTestScoreGrid } from "@/components/language-learning/level-test/LevelTestScoreGrid";
import { Link } from "@/navigation";
import type { LevelTestResult } from "@/types/language-learning/level";

interface LevelTestResultViewProps {
    result: LevelTestResult;
}

export function LevelTestResultView({ result }: LevelTestResultViewProps) {
    const t = useTranslations("LanguageLearning.levelTest.result");
    const levelTestT = useTranslations("LanguageLearning.levelTest");
    const legacy = result.assessmentVersion === "WRITING_ONLY";

    return (
        <div className="space-y-5">
            <section className="rounded-3xl border border-emerald-200 bg-white/90 p-6 text-center shadow-sm dark:border-emerald-500/20 dark:bg-slate-900/75 sm:p-9">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                    {legacy ? t("legacyBadge") : t("multiSkillBadge")}
                </p>
                <h2 className="mt-3 text-xl font-black text-slate-950 dark:text-white">
                    {t("overall")}
                </h2>
                <p className="mt-2 text-5xl font-black text-blue-600 dark:text-blue-300">
                    {result.overallScore ?? "—"}
                </p>
                {result.proficiencyBand && (
                    <p className="mt-2 text-sm font-black tracking-wide text-slate-700 dark:text-slate-200">
                        {levelTestT(`band.${result.proficiencyBand}`)}
                    </p>
                )}
                <p className="mx-auto mt-3 max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {t("internalBandNotice")}
                </p>
            </section>

            {!legacy && (
                <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                    <h3 className="text-lg font-black text-slate-950 dark:text-white">
                        {t("domainScores")}
                    </h3>
                    <div className="mt-4">
                        <LevelTestScoreGrid scores={result.domainScores} />
                    </div>
                </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                            {t("recommendedDifficulty")}
                        </p>
                        <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                            {result.recommendedDifficulty
                                ? levelTestT(`difficulty.${result.recommendedDifficulty}`)
                                : "—"}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                            {t("completedAt")}
                        </p>
                        <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                            {result.completedAt
                                ? new Date(result.completedAt).toLocaleDateString()
                                : "—"}
                        </p>
                    </div>
                </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                    href="/language-learning/writing"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500"
                >
                    {t("startLearning")}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                    href="/language-learning#learning-profile"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"
                >
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                    {t("profile")}
                </Link>
                <Link
                    href={`/language-learning/level-test/history/${result.sessionId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"
                >
                    <History className="h-4 w-4" aria-hidden="true" />
                    {t("detail")}
                </Link>
            </div>
        </div>
    );
}
