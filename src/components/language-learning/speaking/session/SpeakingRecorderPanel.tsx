"use client";

import { AlertTriangle, Mic, RotateCcw, Send, Square } from "lucide-react";
import { useTranslations } from "next-intl";

import { MicrophonePermissionPanel } from "@/components/language-learning/speaking/session/MicrophonePermissionPanel";
import {
    SPEAKING_MAX_TURN_AUDIO_SECONDS,
    SPEAKING_MIN_VALID_AUDIO_SECONDS,
} from "@/constants/language-learning/speaking";
import type { SpeakingSessionController } from "@/hooks/language-learning/speaking/useSpeakingSessionController";

function formatSeconds(value: number) {
    return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

export function SpeakingRecorderPanel({
    controller,
}: {
    controller: SpeakingSessionController;
}) {
    const t = useTranslations("LanguageLearning.speaking.session.recorder");
    const recorder = controller.recorder;

    return (
        <section
            id="speaking-recorder"
            className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75"
        >
            <MicrophonePermissionPanel microphone={controller.microphone} />

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span
                            className={
                                recorder.isRecording
                                    ? "h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500 motion-reduce:animate-none"
                                    : "h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600"
                            }
                            aria-hidden="true"
                        />
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                            {t(`state.${recorder.state}`)}
                        </p>
                    </div>
                    <p className="mt-1 text-2xl font-black tabular-nums text-slate-950 dark:text-white">
                        {formatSeconds(recorder.elapsedSeconds)} / {formatSeconds(SPEAKING_MAX_TURN_AUDIO_SECONDS)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        {t("limits")}
                    </p>
                    {recorder.isNearLimit && (
                        <p
                            role="status"
                            className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-300"
                        >
                            {t("nearLimit", {
                                seconds: Math.ceil(recorder.remainingSeconds),
                            })}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {!recorder.isRecording && !recorder.hasRecording && (
                        <button
                            type="button"
                            onClick={() => void recorder.start()}
                            disabled={!controller.canRecord}
                            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-500 disabled:opacity-50"
                        >
                            <Mic className="h-4 w-4" aria-hidden="true" />
                            {t("start")}
                        </button>
                    )}
                    {recorder.isRecording && (
                        <button
                            type="button"
                            onClick={recorder.stop}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-900"
                        >
                            <Square className="h-4 w-4" aria-hidden="true" />
                            {t("stop")}
                        </button>
                    )}
                    {recorder.hasRecording && (
                        <>
                            <button
                                type="button"
                                onClick={recorder.reset}
                                disabled={controller.isBusy}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                            >
                                <RotateCcw
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                                {t("rerecord")}
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    void controller.submitRecording()
                                }
                                disabled={
                                    controller.isBusy ||
                                    controller.recordingValidationError !== null
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" aria-hidden="true" />
                                {controller.turnPhase === "PREPARING_UPLOAD"
                                    ? t("uploading")
                                    : controller.turnPhase === "PROCESSING"
                                      ? t("processing")
                                      : t("submit")}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {recorder.previewUrl && (
                <audio
                    className="mt-4 w-full"
                    controls
                    src={recorder.previewUrl}
                    aria-label={t("preview")}
                />
            )}

            {controller.recordingValidationError && (
                <div
                    role="alert"
                    className="mt-3 flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
                >
                    <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                    />
                    {controller.recordingValidationError === "TOO_SHORT"
                        ? t("tooShort", {
                              seconds: SPEAKING_MIN_VALID_AUDIO_SECONDS,
                          })
                        : t("tooLarge")}
                </div>
            )}

            {recorder.error && (
                <p
                    role="alert"
                    className="mt-3 text-xs font-bold text-rose-600 dark:text-rose-300"
                >
                    {t("recordFailed")}
                </p>
            )}

            {controller.turnPhase === "PROCESSING" && (
                <div
                    role="status"
                    className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                >
                    <p>{t("processingStages")}</p>
                    <ol className="mt-2 grid gap-2 sm:grid-cols-3">
                        {["stt", "conversation", "tts"].map((stage, index) => (
                            <li
                                key={stage}
                                className="rounded-lg bg-white/70 px-3 py-2 dark:bg-white/5"
                            >
                                {index + 1}. {t(`pipeline.${stage}`)}
                            </li>
                        ))}
                    </ol>
                    <p className="mt-2 text-[11px] font-medium opacity-80">
                        {t("pipelineNotice")}
                    </p>
                </div>
            )}
        </section>
    );
}
