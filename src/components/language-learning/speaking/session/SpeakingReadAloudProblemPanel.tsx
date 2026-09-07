"use client";

import { CheckCircle2, CircleDashed, Mic, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import type { SpeakingSessionController } from "@/hooks/language-learning/speaking/useSpeakingSessionController";
import { cn } from "@/lib/utils";

export function SpeakingReadAloudProblemPanel({
    controller,
}: {
    controller: SpeakingSessionController;
}) {
    const t = useTranslations("LanguageLearning.speaking.session.readAloudProblem");
    const problem = controller.readAloudActiveProblemIndex;
    const included = controller.readAloudIncludedTurns.length;
    const totalAttempts = controller.readAloudActiveTurns.length;
    const rerecord = controller.rerecordTargetTurn;

    return (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-400/20 dark:bg-blue-500/10" data-testid="read-aloud-problem-panel">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-500">
                        {t("dailyProgress", { problem, total: controller.readAloudProblemCount })}
                    </p>
                    <h2 className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                        {t("title")}
                    </h2>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-blue-700 shadow-sm dark:bg-white/10 dark:text-blue-200">
                    {t("attemptProgress", { current: Math.min(included, controller.readAloudRequiredAttempts), required: controller.readAloudRequiredAttempts })}
                </span>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                {t("description")}
            </p>

            {rerecord && (
                <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    {t("rerecording", { attempt: rerecord.attemptIndex ?? 0 })}
                    <button
                        type="button"
                        onClick={controller.cancelRerecord}
                        className="ml-2 underline underline-offset-2"
                    >
                        {t("cancelRerecord")}
                    </button>
                </div>
            )}

            <div className="mt-4 grid gap-2">
                {Array.from({ length: controller.readAloudRequiredAttempts }, (_, index) => {
                    const attempt = index + 1;
                    const turn = controller.readAloudActiveTurns.find((item) => item.attemptIndex === attempt);
                    const complete = Boolean(turn && !turn.excludedFromEvaluation && turn.transcript?.trim());
                    return (
                        <div key={attempt} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                            {complete ? <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" /> : <CircleDashed className="h-4 w-4 text-slate-300" aria-hidden="true" />}
                            {t("attemptItem", { attempt })}
                        </div>
                    );
                })}
            </div>

            {controller.readAloudCanAddThird && !controller.readAloudThirdAttemptEnabled && (
                <button
                    type="button"
                    onClick={controller.enableThirdReadAloudAttempt}
                    disabled={controller.isBusy}
                    className={cn(
                        "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black transition disabled:opacity-50",
                        controller.readAloudShouldOfferThird
                            ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
                            : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
                    )}
                >
                    <Mic className="h-4 w-4" aria-hidden="true" />
                    {controller.readAloudShouldOfferThird ? t("thirdRecommended") : t("thirdOptional")}
                </button>
            )}

            {controller.readAloudThirdAttemptEnabled && totalAttempts < controller.readAloudMaxAttempts && (
                <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs font-bold text-blue-700 dark:bg-white/5 dark:text-blue-200">
                    {t("thirdEnabled")}
                </p>
            )}

            <button
                type="button"
                onClick={() => void controller.evaluateReadAloudProblem()}
                disabled={!controller.readAloudCanEvaluate || controller.isBusy || Boolean(rerecord)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {controller.turnPhase === "EVALUATING_PROBLEM"
                    ? t("evaluating")
                    : problem === controller.readAloudProblemCount
                      ? t("evaluateLast")
                      : t("evaluateAndNext")}
            </button>

            {!controller.readAloudCanEvaluate && totalAttempts >= controller.readAloudRequiredAttempts && (
                <p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    {t("notReady")}
                </p>
            )}

            {controller.readAloudProblemEvaluations.length > 0 && (
                <div className="mt-4 border-t border-blue-100 pt-3 dark:border-blue-400/10">
                    <p className="text-[11px] font-black text-slate-400">{t("submittedTitle")}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {controller.readAloudProblemEvaluations.map((item) => (
                            <span key={item.problemIndex} className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-300">
                                {t("submittedItem", { problem: item.problemIndex, status: t(`status.${normalizeStatus(item.status)}`) })}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

function normalizeStatus(status: string) {
    if (["PENDING", "EVALUATING", "EVALUATED", "INSUFFICIENT_EVIDENCE", "FAILED"].includes(status)) return status;
    return "OTHER";
}
