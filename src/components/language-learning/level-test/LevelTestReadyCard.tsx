"use client";

import { Clock3, Gauge, History, Mic2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { LevelTestErrorNotice } from "@/components/language-learning/level-test/LevelTestErrorNotice";
import type { LanguageLearningLevelTestController } from "@/hooks/language-learning/useLanguageLearningLevelTestController";
import { Link } from "@/navigation";

interface LevelTestReadyCardProps {
    controller: LanguageLearningLevelTestController;
}

const DOMAINS = [
    ["VOCABULARY", 3],
    ["GRAMMAR", 3],
    ["READING", 4],
    ["LISTENING", 4],
    ["WRITING", 3],
    ["SPEAKING", 3],
] as const;

export function LevelTestReadyCard({ controller }: LevelTestReadyCardProps) {
    const t = useTranslations("LanguageLearning.levelTest");
    const status = controller.status!;
    const isInitial = !status.initialLevelTestCompleted;

    return (
        <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
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
                                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {t("ready.currentBaseLevel", {
                                        score: status.baseLevelScore.toFixed(0),
                                    })}
                                    {status.proficiencyBand
                                        ? ` · ${t(`band.${status.proficiencyBand}`)}`
                                        : ""}
                                </p>
                            )}
                            {status.initialLevelTestCompleted && status.recheckRecommended && (
                                <p className="mt-2 text-sm font-bold text-amber-700 dark:text-amber-200">
                                    {t("ready.recheckRecommended")}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2">
                        {status.activeSessionId ? (
                            <button
                                type="button"
                                onClick={controller.resume}
                                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500"
                            >
                                {t("ready.resume")}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void controller.start()}
                                disabled={controller.isStarting}
                                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {controller.isStarting
                                    ? t("ready.starting")
                                    : t("ready.start")}
                            </button>
                        )}
                        <Link
                            href="/language-learning/level-test/history"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"
                        >
                            <History className="h-4 w-4" aria-hidden="true" />
                            {t("ready.history")}
                        </Link>
                    </div>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                        <Clock3 className="h-5 w-5 text-blue-500" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-black text-slate-800 dark:text-white">
                                {t("ready.questionCount", { count: 20 })}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t("ready.estimatedTime")}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                        <Mic2 className="h-5 w-5 text-violet-500" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-black text-slate-800 dark:text-white">
                                {t("ready.microphoneRequired")}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t("ready.microphoneHint")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {DOMAINS.map(([domain, count]) => (
                        <div
                            key={domain}
                            className="rounded-xl border border-slate-200 px-3 py-3 text-center dark:border-white/10"
                        >
                            <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                                {t(`domain.${domain}`)}
                            </p>
                            <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                                {count}
                            </p>
                        </div>
                    ))}
                </div>

                <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {t("ready.resumeHint")}
                </p>
            </section>

            <LevelTestErrorNotice errorCode={controller.actionErrorCode} />
        </div>
    );
}
