"use client";

import { Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAudioPlayback } from "@/hooks/language-learning/speaking/useAudioPlayback";

function formatSeconds(value: number) {
    const total = Math.max(0, Math.floor(value));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function AudioPlaybackButton({
    url,
    slow = false,
    compact = false,
}: {
    url: string | null;
    slow?: boolean;
    compact?: boolean;
}) {
    const t = useTranslations("LanguageLearning.speaking.audio");
    const playback = useAudioPlayback(url);

    if (!url) {
        return (
            <span className="text-xs text-slate-400">
                {t("unavailable")}
            </span>
        );
    }

    return (
        <div className="inline-flex items-center gap-2">
            <button
                type="button"
                onClick={() => void playback.toggle(slow ? 0.8 : 1)}
                disabled={playback.isLoading}
                aria-label={
                    playback.isPlaying
                        ? t("pause")
                        : slow
                          ? t("playSlow")
                          : t("play")
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
                {playback.isPlaying ? (
                    <Pause className="h-4 w-4" aria-hidden="true" />
                ) : (
                    <Play className="h-4 w-4" aria-hidden="true" />
                )}
                {!compact &&
                    (slow
                        ? t("slow")
                        : playback.isPlaying
                          ? t("pause")
                          : t("play"))}
            </button>
            {!compact && (
                <span className="text-xs tabular-nums text-slate-400">
                    {formatSeconds(playback.currentTime)} / {formatSeconds(playback.duration)}
                </span>
            )}
            {playback.error && (
                <span className="text-xs font-bold text-rose-500">
                    {t("failed")}
                </span>
            )}
        </div>
    );
}
