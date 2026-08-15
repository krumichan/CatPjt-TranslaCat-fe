"use client";

import { AlertTriangle, ArrowRight, Gauge, LoaderCircle, Timer } from "lucide-react";
import { useTranslations } from "next-intl";

import { SpeakingActiveSessionCard } from "@/components/language-learning/speaking/start/SpeakingActiveSessionCard";
import { SpeakingSessionConfig } from "@/components/language-learning/speaking/start/SpeakingSessionConfig";
import { SpeakingTopicSelector } from "@/components/language-learning/speaking/start/SpeakingTopicSelector";
import type { SpeakingStartPageController } from "@/hooks/language-learning/speaking/useSpeakingStartPageController";

export function SpeakingStartView({
    controller,
}: {
    controller: SpeakingStartPageController;
}) {
    const t = useTranslations("LanguageLearning.speaking.start");
    const usage = controller.activeSession?.dailyUsage;

    return (
        <div className="space-y-6" data-testid="speaking-start-page">
            {controller.activeSessionLoading && (
                <div
                    role="status"
                    className="flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                >
                    <LoaderCircle
                        className="h-4 w-4 animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                    />
                    {t("active.loading")}
                </div>
            )}

            {controller.activeSessionError && (
                <div
                    role="alert"
                    className="flex flex-col gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 sm:flex-row sm:items-center sm:justify-between dark:bg-rose-500/10 dark:text-rose-200"
                >
                    <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        {t("active.loadFailed")}
                    </span>
                    <button
                        type="button"
                        onClick={() => void controller.reload()}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-700 shadow-sm dark:bg-white/10 dark:text-rose-100"
                    >
                        {t("active.retry")}
                    </button>
                </div>
            )}

            {controller.activeSession && (
                <SpeakingActiveSessionCard detail={controller.activeSession} />
            )}

            {usage && (
                <section className="grid gap-3 sm:grid-cols-2">
                    <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-900/75">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
                            <Gauge className="h-4 w-4 text-blue-500" aria-hidden="true" />
                            {t("usage.sessions")}
                        </div>
                        <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                            {usage.sessionCount} / {usage.dailySessionLimit}
                        </p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-900/75">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
                            <Timer className="h-4 w-4 text-blue-500" aria-hidden="true" />
                            {t("usage.minutes")}
                        </div>
                        <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                            {usage.usedMinutes.toFixed(1)} / {usage.dailySpeakingHardLimitMinutes}
                        </p>
                    </article>
                </section>
            )}

            <SpeakingTopicSelector controller={controller} />
            <SpeakingSessionConfig controller={controller} />

            {controller.createError && (
                <p role="alert" className="text-sm font-bold text-rose-600 dark:text-rose-300">
                    {t("createFailed")}
                </p>
            )}

            <div className="sticky bottom-4 z-20 flex justify-end">
                <button
                    type="button"
                    onClick={() => void controller.createSession()}
                    disabled={!controller.isValid || controller.isCreating}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {controller.isCreating ? t("creating") : t("start")}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
