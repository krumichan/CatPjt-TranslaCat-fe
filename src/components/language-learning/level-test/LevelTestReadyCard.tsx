"use client";

import { Gauge, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import type { LanguageLearningLevelTestController } from "@/hooks/language-learning/useLanguageLearningLevelTestController";
import { Link } from "@/navigation";

interface LevelTestReadyCardProps {
    controller: LanguageLearningLevelTestController;
}

export function LevelTestReadyCard({ controller }: LevelTestReadyCardProps) {
    const t = useTranslations("LanguageLearning.levelTest");
    const status = controller.status!;
    const isInitial = !status.initialLevelTestCompleted;

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                        {isInitial ? (
                            <Gauge className="h-6 w-6" aria-hidden="true" />
                        ) : (
                            <RotateCcw className="h-6 w-6" aria-hidden="true" />
                        )}
                    </span>

                    <div>
                        <h2 className="text-xl font-black text-slate-950 dark:text-white">
                            {isInitial
                                ? t("ready.initialTitle")
                                : t("ready.recheckTitle")}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {isInitial
                                ? t("ready.initialDescription")
                                : t("ready.recheckDescription")}
                        </p>

                        {!isInitial && status.baseLevelScore != null && (
                            <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                                {t("ready.currentBaseLevel", {
                                    score: status.baseLevelScore.toFixed(1),
                                })}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
                    <button
                        type="button"
                        onClick={() =>
                            void controller.start(
                                isInitial ? "INITIAL" : "RECHECK",
                            )
                        }
                        disabled={controller.isStarting}
                        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {controller.isStarting
                            ? t("ready.starting")
                            : t("ready.start")}
                    </button>

                    {!isInitial && (
                        <Link
                            href="/language-learning/writing"
                            className="rounded-xl bg-slate-100 px-5 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"
                        >
                            {t("ready.continue")}
                        </Link>
                    )}
                </div>
            </div>

            {controller.actionError && (
                <p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                    {t("actionFailed")}
                </p>
            )}
        </section>
    );
}
