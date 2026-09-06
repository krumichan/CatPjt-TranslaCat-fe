"use client";

import {
    AlertTriangle,
    Ban,
    Flag,
    Mic,
    RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { AudioPlaybackButton } from "@/components/language-learning/speaking/common/AudioPlaybackButton";
import { SttErrorReportModal } from "@/components/language-learning/speaking/session/SttErrorReportModal";
import type { SpeakingSessionController } from "@/hooks/language-learning/speaking/useSpeakingSessionController";
import { cn } from "@/lib/utils";
import type {
    SpeakingPracticeMode,
    SpeakingTurn,
} from "@/types/language-learning/speaking";

export function SpeakingTurnCard({
    turn,
    controller,
    practiceMode,
}: {
    turn: SpeakingTurn;
    controller: SpeakingSessionController;
    practiceMode: SpeakingPracticeMode;
}) {
    const t = useTranslations("LanguageLearning.speaking.session.turn");
    const [reportOpen, setReportOpen] = useState(false);
    const lowConfidence =
        turn.sttConfidence !== null && turn.sttConfidence < 0.7;
    const failed =
        turn.status === "PARTIAL_FAILURE" || turn.status === "FAILED";
    const sttFailed = failed && turn.failedStage === "STT";
    const highlighted = controller.highlightedTurnId === turn.id;
    const actionDisabled = controller.isBusy || controller.recorder.isRecording;
    const userAudioUrl =
        controller.localAudioUrls[turn.id] ?? turn.userAudioUrl;

    const excludeFromEvaluation = async () => {
        if (!window.confirm(t("excludeConfirm"))) return;
        await controller.excludeTurn(turn.id);
    };

    const prepareRerecord = async () => {
        if (!window.confirm(t("rerecordConfirm"))) return;

        if (!turn.excludedFromEvaluation) {
            const excluded = await controller.excludeTurn(turn.id);
            if (!excluded) return;
        }

        controller.recorder.reset();
        document.getElementById("speaking-recorder")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    };


    if (practiceMode === "READ_ALOUD") {
        const submitted = controller.isReadAloudProblemSubmitted(turn.problemIndex);
        const rerecording = controller.rerecordTargetTurn?.id === turn.id;
        return (
            <article
                id={`speaking-turn-${turn.id}`}
                data-testid={`speaking-turn-${turn.turnIndex}`}
                className={cn(
                    "rounded-2xl border p-4 transition",
                    highlighted
                        ? "border-blue-400 bg-blue-50/60 ring-2 ring-blue-100 dark:bg-blue-500/10 dark:ring-blue-500/10"
                        : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900",
                )}
            >
                <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-slate-500 dark:text-slate-300">
                        {t("problemAttemptNumber", {
                            problem: turn.problemIndex ?? 0,
                            attempt: turn.attemptIndex ?? 0,
                        })}
                    </span>
                    <span
                        className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-black",
                            turn.excludedFromEvaluation
                                ? "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                                : failed
                                  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
                        )}
                    >
                        {rerecording ? t("rerecording") : t(`status.${turn.status}`)}
                    </span>
                </div>

                <div className="mt-4">
                    <p className="text-xs font-black text-slate-400">{t("spokenText")}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">
                        {turn.transcript || t("noTranscript")}
                    </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                    {userAudioUrl && <AudioPlaybackButton url={userAudioUrl} compact />}
                    {turn.sttConfidence !== null && (
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {t("confidence", { value: Math.round(turn.sttConfidence * 100) })}
                        </span>
                    )}
                </div>

                {lowConfidence && (
                    <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        {t("lowConfidenceRerecord")}
                    </div>
                )}

                {failed && (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
                        <p className="font-black">
                            {turn.failedStage ? t(`stage.${turn.failedStage}`) : t("failed")}
                        </p>
                        {turn.errorMessage && <p className="mt-1 leading-5">{turn.errorMessage}</p>}
                    </div>
                )}

                {!submitted && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
                        {failed && (
                            <button
                                type="button"
                                onClick={() => void controller.retryTurn(turn)}
                                disabled={actionDisabled}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                            >
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                {t("retry")}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                if (!window.confirm(t("rerecordReplaceConfirm"))) return;
                                controller.prepareRerecord(turn);
                            }}
                            disabled={actionDisabled}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 disabled:opacity-50 dark:bg-amber-500/10 dark:text-amber-200"
                        >
                            <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                            {t("rerecord")}
                        </button>
                        {!turn.excludedFromEvaluation && (
                            <button
                                type="button"
                                onClick={() => void excludeFromEvaluation()}
                                disabled={actionDisabled}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300"
                            >
                                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                                {t("exclude")}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setReportOpen(true)}
                            disabled={actionDisabled}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-50 dark:bg-white/10 dark:text-slate-300"
                        >
                            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                            {t("report")}
                        </button>
                    </div>
                )}

                <SttErrorReportModal
                    open={reportOpen}
                    onClose={() => setReportOpen(false)}
                    onSubmit={(request) => controller.createSttReport(turn.id, request)}
                    onRequestSupport={controller.requestSttSupport}
                />
            </article>
        );
    }

    return (
        <article
            id={`speaking-turn-${turn.id}`}
            data-testid={`speaking-turn-${turn.turnIndex}`}
            className={cn(
                "rounded-2xl border p-4 transition",
                highlighted
                    ? "border-blue-400 bg-blue-50/60 ring-2 ring-blue-100 dark:bg-blue-500/10 dark:ring-blue-500/10"
                    : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900",
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    {t(practiceMode === "READ_ALOUD" ? "itemNumber" : "number", {
                        value: turn.turnIndex,
                    })}
                </span>
                <span
                    className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-black",
                        turn.excludedFromEvaluation
                            ? "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                            : failed
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
                    )}
                >
                    {t(`status.${turn.status}`)}
                </span>
            </div>

            <div className="mt-4 flex justify-end">
                <div className="max-w-[88%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-white">
                    <p className="text-xs font-black text-blue-100">
                        {t("you")}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                        {turn.transcript || t("noTranscript")}
                    </p>
                    {userAudioUrl && (
                        <div className="mt-3">
                            {userAudioUrl.startsWith("blob:") ? (
                                <audio
                                    controls
                                    src={userAudioUrl}
                                    aria-label={t("userAudio")}
                                    className="max-w-full"
                                />
                            ) : (
                                <AudioPlaybackButton url={userAudioUrl} />
                            )}
                        </div>
                    )}
                    {turn.sttConfidence !== null && (
                        <p className="mt-2 text-[11px] text-blue-100">
                            {t("confidence", {
                                value: Math.round(turn.sttConfidence * 100),
                            })}
                        </p>
                    )}
                </div>
            </div>

            {lowConfidence && (
                <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                    />
                    {t("lowConfidence")}
                </div>
            )}

            {turn.assistantText && (
                <div className="mt-4 max-w-[88%] rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 dark:bg-white/10">
                    <p className="text-xs font-black text-slate-400">AI</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">
                        {turn.assistantText}
                    </p>
                    <div className="mt-3">
                        <AudioPlaybackButton url={turn.assistantAudioUrl} />
                    </div>
                </div>
            )}

            {failed && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
                    <p className="font-black">
                        {turn.failedStage
                            ? t(`stage.${turn.failedStage}`)
                            : t("failed")}
                    </p>
                    {turn.errorMessage && (
                        <p className="mt-1 leading-5">{turn.errorMessage}</p>
                    )}
                </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
                {failed && (
                    <button
                        type="button"
                        onClick={() => void controller.retryTurn(turn)}
                        disabled={actionDisabled}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                    >
                        <RotateCcw
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                        />
                        {turn.failedStage === "TTS" && turn.assistantText
                            ? t("retryAudio")
                            : t("retry")}
                    </button>
                )}

                {(lowConfidence || sttFailed) && !turn.excludedFromEvaluation && (
                    <button
                        type="button"
                        onClick={() => void prepareRerecord()}
                        disabled={actionDisabled}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
                    >
                        <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("rerecord")}
                    </button>
                )}

                {!turn.excludedFromEvaluation && (
                    <button
                        type="button"
                        onClick={() => void excludeFromEvaluation()}
                        disabled={actionDisabled}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300"
                    >
                        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("exclude")}
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    disabled={actionDisabled}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-50 dark:bg-white/10 dark:text-slate-300"
                >
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("report")}
                </button>
            </div>

            <SttErrorReportModal
                open={reportOpen}
                onClose={() => setReportOpen(false)}
                onSubmit={(request) =>
                    controller.createSttReport(turn.id, request)
                }
                onRequestSupport={controller.requestSttSupport}
            />
        </article>
    );
}
