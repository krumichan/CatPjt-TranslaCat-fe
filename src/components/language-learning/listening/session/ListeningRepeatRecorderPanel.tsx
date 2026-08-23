"use client";

import { Mic, RotateCcw, Square, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ListeningSessionController } from "@/hooks/language-learning/listening/useListeningSessionController";

export function ListeningRepeatRecorderPanel({ controller }: { controller: ListeningSessionController }) {
    const t = useTranslations("LanguageLearning.listening.session.recorder");
    const task = controller.repeatTask;
    if (!task) return null;

    const remainingRerecord = Math.max(0, 2 - task.rerecordCount);
    const permission = controller.microphone;
    const recorder = controller.recorder;

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900" data-testid="listening-repeat-recorder">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("title")}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("description", { seconds: controller.maxRecordingSeconds })}</p>

            {!permission.canRecord && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    <p>{permission.failureReason ? t(`permission.${permission.failureReason}`) : t("permission.PROMPT")}</p>
                    {permission.state !== "UNAVAILABLE" && (
                        <button type="button" onClick={() => void permission.request()} disabled={permission.isRequesting} className="mt-3 rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                            {t("requestPermission")}
                        </button>
                    )}
                </div>
            )}

            {permission.canRecord && (
                <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        {!recorder.isRecording ? (
                            <button type="button" onClick={() => void recorder.start()} disabled={task.audioUploaded && remainingRerecord <= 0} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white hover:bg-rose-500 disabled:opacity-50">
                                <Mic className="h-4 w-4" aria-hidden="true" />
                                {task.audioUploaded ? t("rerecord") : t("record")}
                            </button>
                        ) : (
                            <button type="button" onClick={recorder.stop} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white dark:bg-white dark:text-slate-900">
                                <Square className="h-4 w-4" aria-hidden="true" />
                                {t("stop")}
                            </button>
                        )}
                        <span className="text-sm font-black text-slate-600 dark:text-slate-300" aria-live="polite">
                            {recorder.elapsedSeconds.toFixed(1)}s / {controller.maxRecordingSeconds}s
                        </span>
                        <span className="text-xs text-slate-400">{t("remaining", { count: remainingRerecord })}</span>
                    </div>

                    {recorder.previewUrl && (
                        <audio src={recorder.previewUrl} controls className="w-full" aria-label={t("preview")} />
                    )}

                    {recorder.hasRecording && (
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => void controller.confirmRecording()} disabled={controller.isUploading} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50">
                                <Upload className="h-4 w-4" aria-hidden="true" />
                                {controller.isUploading ? t("uploading") : t("confirm")}
                            </button>
                            <button type="button" onClick={recorder.reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 dark:border-white/10 dark:text-slate-300">
                                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                {t("discard")}
                            </button>
                        </div>
                    )}

                    {task.audioUploaded && <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">{t("uploaded", { count: task.rerecordCount })}</p>}
                </div>
            )}
        </section>
    );
}
