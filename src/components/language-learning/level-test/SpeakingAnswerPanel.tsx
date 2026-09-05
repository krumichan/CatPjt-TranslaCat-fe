"use client";

import { Mic, Play, RotateCcw, Square } from "lucide-react";
import { useRef } from "react";
import { useTranslations } from "next-intl";

import type { LevelTestSessionController } from "@/hooks/language-learning/useLevelTestSessionController";

interface SpeakingAnswerPanelProps {
    controller: LevelTestSessionController;
}

export function SpeakingAnswerPanel({ controller }: SpeakingAnswerPanelProps) {
    const t = useTranslations("LanguageLearning.levelTest.session.speaking");
    const { microphone, recorder } = controller;
    const referenceAudioRef = useRef<HTMLAudioElement | null>(null);
    const isRepeat = controller.question?.itemType === "SPEAKING_REPEAT";
    const referencePlaybackLimit = controller.question?.referencePlaybackLimit ?? 0;
    const referenceRemaining = Math.max(
        0,
        referencePlaybackLimit - controller.referencePlaybackCount,
    );

    const referenceAudioPanel = isRepeat ? (
        <div
            className="mb-4 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/5"
            data-testid="speaking-repeat-reference-audio"
        >
            <audio ref={referenceAudioRef} className="sr-only" />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-cyan-900 dark:text-cyan-100">
                        {t("referenceTitle")}
                    </p>
                    <p className="mt-1 text-xs text-cyan-800/70 dark:text-cyan-200/70">
                        {t("referenceDescription")}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void controller.playReferenceAudio(referenceAudioRef.current)}
                    disabled={
                        controller.isAudioLoading ||
                        referenceRemaining === 0 ||
                        !controller.question?.referenceAudioAvailable
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={t("referencePlay")}
                >
                    <Play className="h-4 w-4" aria-hidden="true" />
                    {controller.isAudioLoading ? t("referenceLoading") : t("referencePlay")}
                </button>
            </div>
            {controller.question?.repeatReferenceText && (
                <div
                    className="mt-3 rounded-xl border border-cyan-200 bg-white/80 p-3 dark:border-cyan-400/20 dark:bg-slate-900/50"
                    data-testid="speaking-repeat-reference-text"
                >
                    <p className="text-xs font-black text-cyan-800 dark:text-cyan-200">
                        {t("referenceTextTitle")}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm font-black leading-6 text-slate-900 dark:text-white">
                        {controller.question.repeatReferenceText}
                    </p>
                </div>
            )}
            <p className="mt-3 text-xs font-bold text-cyan-900/70 dark:text-cyan-100/70">
                {t("referenceRemaining", { count: referenceRemaining })}
            </p>
            {!controller.question?.referenceAudioAvailable && (
                <p className="mt-2 text-xs font-bold text-rose-700 dark:text-rose-200">
                    {t("referenceUnavailable")}
                </p>
            )}
        </div>
    ) : null;

    if (!microphone.canRecord) {
        return (
            <>
                {referenceAudioPanel}
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-500/20 dark:bg-violet-500/5">
                    <h3 className="text-sm font-black text-violet-900 dark:text-violet-100">
                        {microphone.state === "DENIED"
                            ? t(`error.${microphone.failureReason ?? "DENIED"}`)
                            : t("permissionTitle")}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-violet-800/70 dark:text-violet-200/70">
                        {t("permissionDescription")}
                    </p>
                    {microphone.state !== "CHECKING" && microphone.state !== "UNAVAILABLE" && (
                        <button
                            type="button"
                            onClick={() => void microphone.request()}
                            disabled={microphone.isRequesting}
                            className="mt-4 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-50"
                        >
                            {microphone.isRequesting ? t("requesting") : t("allow")}
                        </button>
                    )}
                </div>
            </>
        );
    }

    return (
        <>
            {referenceAudioPanel}
            <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5 dark:border-violet-500/20 dark:bg-violet-500/5">
                <div aria-live="polite">
                    <p className="text-sm font-black text-violet-900 dark:text-violet-100">
                        {t(`state.${recorder.state}`)}
                    </p>
                    <p className="mt-1 text-xs text-violet-800/70 dark:text-violet-200/70">
                        {t("time", {
                            current: Math.ceil(recorder.elapsedSeconds),
                            max: controller.question?.maxAudioSeconds ?? 30,
                        })}
                    </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {!recorder.isRecording && !recorder.hasRecording && (
                        <button
                            type="button"
                            onClick={() => void recorder.start()}
                            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-500"
                        >
                            <Mic className="h-4 w-4" aria-hidden="true" />
                            {t("record")}
                        </button>
                    )}
                    {recorder.isRecording && (
                        <button
                            type="button"
                            onClick={recorder.stop}
                            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white hover:bg-rose-500"
                        >
                            <Square className="h-4 w-4" aria-hidden="true" />
                            {t("stop")}
                        </button>
                    )}
                    {recorder.hasRecording && (
                        <button
                            type="button"
                            onClick={recorder.reset}
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-violet-700 shadow-sm dark:bg-white/10 dark:text-violet-200"
                        >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            {t("rerecord")}
                        </button>
                    )}
                </div>

                <p className="mt-4 text-xs leading-5 text-violet-800/70 dark:text-violet-200/70">
                    {t("refreshWarning")}
                </p>

                {recorder.previewUrl && (
                    <audio
                        controls
                        src={recorder.previewUrl}
                        className="mt-4 w-full"
                        aria-label={t("preview")}
                    />
                )}
            </div>
        </>
    );
}
