"use client";

import { CheckCircle2, MessageSquareText, Mic2, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/navigation";
import type { SpeakingStartPageController } from "@/hooks/language-learning/speaking/useSpeakingStartPageController";
import type { SpeakingPracticeMode } from "@/types/language-learning/speaking";

const MODES: Array<[SpeakingPracticeMode, typeof Volume2]> = [
    ["READ_ALOUD", Volume2],
    ["GUIDED", MessageSquareText],
    ["FREE", Mic2],
];

export function SpeakingPracticeModeSelector({
    controller,
}: {
    controller: SpeakingStartPageController;
}) {
    const t = useTranslations("LanguageLearning.speaking.start");
    const byMode = new Map(controller.modeStatuses.map((status) => [status.practiceMode, status]));

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6" data-testid="speaking-practice-mode-selector">
            <div className="max-w-2xl">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
                    {t("mode.eyebrow")}
                </p>
                <h2 className="mt-2 text-xl font-black leading-tight text-slate-950 sm:text-2xl dark:text-white">
                    {t("mode.title")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {t("mode.description")}
                </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {MODES.map(([mode, Icon]) => {
                    const status = byMode.get(mode);
                    const selected = controller.practiceMode === mode;
                    const active = controller.activeSession?.session.practiceMode === mode;
                    const completed = status?.completed === true;
                    const evaluating = status?.sessionStatus === "EVALUATING" || status?.evaluationStatus === "PENDING" || status?.evaluationStatus === "EVALUATING";
                    const resultReady = status?.evaluationStatus === "EVALUATED" || status?.evaluationStatus === "INSUFFICIENT_EVIDENCE" || status?.evaluationStatus === "FAILED";
                    const progress = status && status.maxTurns > 0 ? `${status.completedTurns} / ${status.maxTurns}` : null;

                    return (
                        <article
                            key={mode}
                            data-testid={`speaking-mode-${mode}`}
                            className={`flex h-full flex-col rounded-3xl border p-5 transition ${completed ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-400/30 dark:bg-emerald-500/10" : selected ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10" : "border-slate-200 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/40 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400/40 dark:hover:bg-blue-500/10"}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-white/10 dark:text-blue-300">
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </span>
                                {completed && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        {t("mode.completed")}
                                    </span>
                                )}
                            </div>
                            <h3 className="mt-5 text-base font-black text-slate-950 sm:text-lg dark:text-white">{t(`mode.${mode}.title`)}</h3>
                            <p className="mt-2 min-h-18 text-sm leading-6 text-slate-500 dark:text-slate-400">{t(`mode.${mode}.description`)}</p>
                            {progress && <p className="mt-3 text-xs font-black text-slate-400">{t("mode.progress", { value: progress })}</p>}
                            {evaluating && <p className="mt-2 text-xs font-black text-blue-600 dark:text-blue-300">{t("mode.evaluating")}</p>}

                            <div className="mt-auto pt-5">
                                {active && controller.activeSession ? (
                                    <Link href={`/language-learning/speaking/${controller.activeSession.session.id}`} className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-base font-black text-white transition hover:bg-blue-500">
                                        {t("mode.resume")}
                                    </Link>
                                ) : evaluating && status?.sessionId ? (
                                    <Link href={`/language-learning/speaking/${status.sessionId}/evaluation`} className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-base font-black text-white transition hover:bg-blue-500">
                                        {t("mode.viewEvaluationProgress")}
                                    </Link>
                                ) : resultReady && status?.sessionId ? (
                                    <Link href={`/language-learning/speaking/${status.sessionId}/evaluation`} className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-base font-black text-white transition hover:bg-emerald-500">
                                        {t("mode.result")}
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => controller.setPracticeMode(mode)}
                                        disabled={Boolean(controller.activeSession)}
                                        className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-base font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "bg-blue-600 text-white hover:bg-blue-500"}`}
                                    >
                                        {selected ? t("mode.selected") : status?.sessionId ? t("mode.startAgain") : t("mode.select")}
                                    </button>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
