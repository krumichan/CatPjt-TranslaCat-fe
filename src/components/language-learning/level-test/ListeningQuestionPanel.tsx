"use client";

import { Play } from "lucide-react";
import { useRef } from "react";
import { useTranslations } from "next-intl";

import type { LevelTestSessionController } from "@/hooks/language-learning/useLevelTestSessionController";

interface ListeningQuestionPanelProps {
    controller: LevelTestSessionController;
}

export function ListeningQuestionPanel({ controller }: ListeningQuestionPanelProps) {
    const t = useTranslations("LanguageLearning.levelTest.session");
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const remainingPlays = Math.max(0, 2 - controller.referencePlaybackCount);
    const additionalReplayRemaining = Math.max(
        0,
        1 - Math.max(0, controller.referencePlaybackCount - 1),
    );

    return (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/5">
            <audio ref={audioRef} className="sr-only" />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-cyan-900 dark:text-cyan-100">
                        {t("listening.title")}
                    </p>
                    <p className="mt-1 text-xs text-cyan-800/70 dark:text-cyan-200/70">
                        {t("listening.normalOnly")}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void controller.playReferenceAudio(audioRef.current)}
                    disabled={
                        controller.isAudioLoading ||
                        remainingPlays === 0 ||
                        !controller.question?.referenceAudioAvailable
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={t("listening.play")}
                >
                    <Play className="h-4 w-4" aria-hidden="true" />
                    {controller.isAudioLoading
                        ? t("listening.loading")
                        : t("listening.play")}
                </button>
            </div>
            <p className="mt-3 text-xs font-bold text-cyan-900/70 dark:text-cyan-100/70">
                {t("listening.remaining", { count: additionalReplayRemaining })}
            </p>
        </div>
    );
}
