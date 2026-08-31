"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { ListeningUserAudioPlayer } from "@/components/language-learning/listening/common/ListeningUserAudioPlayer";
import { ListeningIndependenceSummary } from "@/components/language-learning/listening/result/ListeningIndependenceSummary";
import { listeningService } from "@/services/language-learning/listeningService";
import type { ListeningHistoryDetail as ListeningHistoryDetailType } from "@/types/language-learning/listening";

export function ListeningHistoryDetail({ detail }: { detail: ListeningHistoryDetailType }) {
    const t = useTranslations("LanguageLearning.history.listening");

    return (
        <div className="space-y-4" data-testid="listening-history-detail">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">{t("title")}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {t("sessionSummary", {
                        completed: detail.session.completedItemCount,
                        evaluated: detail.session.evaluatedItemCount,
                    })}
                </p>
            </section>

            {detail.attempts.map((row) => (
                <article key={`${row.itemId}-${row.attempt.attemptId}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black text-slate-400">#{row.itemIndex}</p>
                            <p className="mt-2 font-bold leading-7 text-slate-900 dark:text-white">{row.sourceText}</p>
                        </div>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{row.attempt.overallScore === null ? "—" : Math.round(row.attempt.overallScore)}</p>
                    </div>

                    <div className="mt-4">
                        <ListeningIndependenceSummary attempt={row.attempt} />
                    </div>

                    {row.referenceMeanings.length > 0 && (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                            {row.referenceMeanings.map((meaning) => <li key={meaning}>{meaning}</li>)}
                        </ul>
                    )}

                    <HistoryReferenceAudio itemId={row.itemId} available={row.referenceAudio.available} expired={row.referenceAudio.expired} retentionUntil={row.referenceAudio.retentionUntil} />

                    <div className="mt-4 grid gap-3 xl:grid-cols-3">
                        {row.attempt.tasks.map((task) => (
                            <div key={task.taskType} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">{t(`task.${task.taskType}`)}</p>
                                    <span className="font-black text-slate-900 dark:text-white">{task.status === "NOT_SELECTED" ? t("notSelected") : task.evaluation?.score == null ? "—" : Math.round(task.evaluation.score)}</span>
                                </div>
                                {task.answerText && <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{task.answerText}</p>}
                                {task.taskType === "REPEAT_AFTER_AUDIO" && (
                                    <div className="mt-2 text-xs text-slate-400">
                                        <p>
                                            {task.audioAvailability?.expired
                                                ? t("userAudioExpired")
                                                : task.audioAvailability?.available
                                                  ? t("userAudioRetained", { until: task.audioAvailability.retentionUntil ?? "-" })
                                                  : t("userAudioUnavailable")}
                                        </p>
                                        {task.audioAvailability && (
                                            <ListeningUserAudioPlayer
                                                taskResponseId={task.taskResponseId}
                                                available={task.audioAvailability.available}
                                                expired={task.audioAvailability.expired}
                                                loadLabel={t("playUserAudio")}
                                                loadingLabel={t("userAudioLoading")}
                                                errorLabel={t("userAudioLoadFailed")}
                                            />
                                        )}
                                    </div>
                                )}
                                <p className="mt-2 text-[11px] text-slate-400">{t("profileApplied", { value: row.attempt.evaluationPurpose === "OFFICIAL" && task.status === "EVALUATED" ? t("yes") : t("no") })}</p>
                            </div>
                        ))}
                    </div>
                </article>
            ))}
        </div>
    );
}

function HistoryReferenceAudio({ itemId, available, expired, retentionUntil }: { itemId: number; available: boolean; expired: boolean; retentionUntil: string | null }) {
    const t = useTranslations("LanguageLearning.history.listening");
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

    if (expired) {
        return <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">{t("referenceAudioExpired")}</p>;
    }
    if (!available) return null;

    const load = async () => {
        if (url || loading) return;
        setLoading(true);
        try {
            const blob = await listeningService.fetchReferenceAudio(itemId);
            setUrl(URL.createObjectURL(blob));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
            {url ? <audio controls src={url} className="w-full" /> : <button type="button" onClick={() => void load()} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white">{loading ? t("audioLoading") : t("playReference")}</button>}
            <p className="mt-2 text-xs text-slate-400">{t("retentionUntil", { until: retentionUntil ?? "-" })}</p>
        </div>
    );
}
