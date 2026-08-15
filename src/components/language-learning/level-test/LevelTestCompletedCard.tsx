"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/navigation";

interface LevelTestCompletedCardProps {
    baseLevelScore: number | null;
}

export function LevelTestCompletedCard({
    baseLevelScore,
}: LevelTestCompletedCardProps) {
    const t = useTranslations("LanguageLearning.levelTest.completed");

    return (
        <section className="rounded-3xl border border-emerald-200 bg-white/90 p-6 text-center shadow-sm dark:border-emerald-500/20 dark:bg-slate-900/75 sm:p-10">
            <CheckCircle2
                className="mx-auto h-12 w-12 text-emerald-500"
                aria-hidden="true"
            />

            <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
                {t("title")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t("description")}
            </p>

            {baseLevelScore != null && (
                <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-slate-50 p-5 dark:bg-white/5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        {t("baseLevel")}
                    </p>
                    <p className="mt-2 text-4xl font-black text-blue-600 dark:text-blue-300">
                        {baseLevelScore.toFixed(1)}
                    </p>
                </div>
            )}

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                    href="/language-learning/writing"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500"
                >
                    {t("startWriting")}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                    href="/language-learning"
                    className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                >
                    {t("dashboard")}
                </Link>
            </div>
        </section>
    );
}
