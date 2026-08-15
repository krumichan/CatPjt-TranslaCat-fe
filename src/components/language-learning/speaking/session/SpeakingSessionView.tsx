"use client";

import { AlertTriangle, CheckCircle2, Flag } from "lucide-react";
import { useTranslations } from "next-intl";

import { SpeakingAssistancePanel } from "@/components/language-learning/speaking/session/SpeakingAssistancePanel";
import { SpeakingConversationHistory } from "@/components/language-learning/speaking/session/SpeakingConversationHistory";
import { SpeakingEvaluationProgress } from "@/components/language-learning/speaking/session/SpeakingEvaluationProgress";
import { SpeakingRecorderPanel } from "@/components/language-learning/speaking/session/SpeakingRecorderPanel";
import { SpeakingSessionHeader } from "@/components/language-learning/speaking/session/SpeakingSessionHeader";
import type { SpeakingSessionController } from "@/hooks/language-learning/speaking/useSpeakingSessionController";

export function SpeakingSessionView({
    controller,
}: {
    controller: SpeakingSessionController;
}) {
    const t = useTranslations("LanguageLearning.speaking.session");
    const detail = controller.detail;
    if (!detail) return null;

    const latestTurn = detail.turns.at(-1) ?? null;
    const sessionEnded = detail.session.status !== "IN_PROGRESS";

    return (
        <div className="space-y-5" data-testid="speaking-session-page">
            <SpeakingSessionHeader detail={detail} />

            {controller.actionError && (
                <div role="alert" className="flex gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("actionFailed")}
                </div>
            )}

            {controller.lastReportReference && (
                <div role="status" className="flex gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <Flag className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("reportCreated", { reference: controller.lastReportReference })}
                </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <SpeakingConversationHistory controller={controller} />

                <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                    {!sessionEnded && (
                        <>
                            <SpeakingRecorderPanel controller={controller} />
                            <SpeakingAssistancePanel
                                usage={controller.selectedAssistance}
                                results={controller.assistanceResults}
                                loadingType={controller.assistanceLoadingType}
                                hasAssistantPrompt={Boolean(
                                    latestTurn?.assistantText?.trim() ||
                                        detail.session.openingAssistantText?.trim(),
                                )}
                                error={controller.assistanceError}
                                onRequest={controller.requestAssistance}
                            />
                        </>
                    )}
                    {controller.eligibility && (
                        <SpeakingEvaluationProgress
                            eligibility={controller.eligibility}
                        />
                    )}

                    <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-900/75">
                        <h2 className="text-sm font-black text-slate-900 dark:text-white">
                            {t("finish.title")}
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {controller.eligibility?.eligible === true
                                ? t("finish.ready")
                                : t("finish.insufficient")}
                        </p>

                        {controller.eligibility?.eligible === true ? (
                            <button
                                type="button"
                                disabled={controller.isBusy || sessionEnded}
                                onClick={() => {
                                    if (window.confirm(t("finish.confirmEvaluate"))) {
                                        void controller.completeSession(false);
                                    }
                                }}
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                            >
                                <CheckCircle2
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                                {controller.turnPhase === "COMPLETING"
                                    ? t("finish.completing")
                                    : t("finish.evaluateAction")}
                            </button>
                        ) : (
                            <div className="mt-4 grid gap-2">
                                <button
                                    type="button"
                                    disabled={controller.isBusy || sessionEnded}
                                    onClick={() =>
                                        document
                                            .getElementById("speaking-recorder")
                                            ?.scrollIntoView({
                                                behavior: "smooth",
                                                block: "center",
                                            })
                                    }
                                    className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:opacity-50"
                                >
                                    {t("finish.continueConversation")}
                                </button>
                                <button
                                    type="button"
                                    disabled={controller.isBusy || sessionEnded}
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                t("finish.confirmWithoutEvaluation"),
                                            )
                                        ) {
                                            void controller.completeSession(true);
                                        }
                                    }}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                >
                                    <CheckCircle2
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    {controller.turnPhase === "COMPLETING"
                                        ? t("finish.completing")
                                        : t("finish.withoutEvaluationAction")}
                                </button>
                            </div>
                        )}

                        {controller.eligibility?.eligible === false && (
                            <p className="mt-3 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
                                {t("finish.withoutEvaluationNotice")}
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
