"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/navigation";
import type { LevelTestStatus } from "@/types/language-learning/level";

export function LevelRecheckSection({ status }: { status: LevelTestStatus | null }) {
    const t = useTranslations("LanguageLearning.settings.recheck");

    if (!status?.initialLevelTestCompleted) return null;

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-4">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                        <RotateCcw className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("title")}</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{t("description")}</p>
                        {status.recheckRecommended && <p className="mt-2 text-sm font-black text-amber-600 dark:text-amber-300">{t("recommended")}</p>}
                    </div>
                </div>
                <Link href="/language-learning/level-test" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-500">{t("action")}</Link>
            </div>
        </section>
    );
}
