"use client";

import { useTranslations } from "next-intl";

import type { ListeningAttempt } from "@/types/language-learning/listening";

export function ListeningIndependenceSummary({ attempt }: { attempt: ListeningAttempt }) {
    const t = useTranslations("LanguageLearning.listening.result.independence");
    if (
        attempt.contentOverallScore == null &&
        attempt.listeningIndependenceScore == null &&
        attempt.overallScore == null
    ) {
        return null;
    }

    return (
        <div className="grid gap-3 rounded-3xl border border-cyan-200 bg-cyan-50/50 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/5 sm:grid-cols-3">
            <Score label={t("overall")} value={attempt.overallScore} />
            <Score label={t("content")} value={attempt.contentOverallScore} />
            <Score
                label={t("independence")}
                value={attempt.listeningIndependenceScore}
            />
            <div className="sm:col-span-3 rounded-2xl bg-white/70 p-3 text-xs leading-5 text-cyan-900/70 dark:bg-white/5 dark:text-cyan-100/70">
                <p className="font-black text-cyan-900 dark:text-cyan-100">
                    {t("playback", {
                        normal: attempt.playbackSummary?.normalPlaybackCount ?? 0,
                        slow: attempt.playbackSummary?.slowPlaybackCount ?? 0,
                    })}
                </p>
                <p className="mt-1">{t("help")}</p>
            </div>
        </div>
    );
}

function Score({ label, value }: { label: string; value: number | null }) {
    return (
        <div className="rounded-2xl bg-white p-4 text-center dark:bg-white/5">
            <p className="text-xs font-black text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {value == null ? "—" : Math.round(value)}
            </p>
        </div>
    );
}
