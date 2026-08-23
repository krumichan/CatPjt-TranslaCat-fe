"use client";

import { Flag } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { ListeningUserAudioPlayer } from "@/components/language-learning/listening/common/ListeningUserAudioPlayer";
import { ListeningEvaluationReportModal } from "@/components/language-learning/listening/result/ListeningEvaluationReportModal";
import type { ListeningResultController } from "@/hooks/language-learning/listening/useListeningResultController";
import type { ListeningTask } from "@/types/language-learning/listening";

export function ListeningTaskResultCard({
    task,
    attemptId,
    controller,
}: {
    task: ListeningTask;
    attemptId: number;
    controller: ListeningResultController;
}) {
    const t = useTranslations("LanguageLearning.listening.result");
    const [reportOpen, setReportOpen] = useState(false);
    const evaluation = task.evaluation;
    const notSelected = task.status === "NOT_SELECTED";
    const notEvaluable = ["NOT_EVALUABLE", "EVALUATION_FAILED"].includes(task.status) || evaluation?.evaluable === false;

    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900" data-testid={`listening-task-result-${task.taskType}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{t(`task.${task.taskType}`)}</h3>
                    <p className="mt-1 text-xs font-bold text-slate-400">{t(`status.${task.status}`)}</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {notSelected ? t("notSelected") : evaluation?.score == null ? "—" : Math.round(evaluation.score)}
                    </p>
                    {evaluation?.confidence != null && <p className="text-xs text-slate-400">{t("confidence", { value: Math.round(evaluation.confidence * 100) })}</p>}
                </div>
            </div>

            {task.answerText && <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-white/5 dark:text-slate-200">{task.answerText}</p>}

            {notEvaluable && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    <p className="font-bold">{t("notEvaluable", { reason: evaluation?.reasonCode ?? task.evaluationErrorCode ?? "UNKNOWN" })}</p>
                    {task.status === "EVALUATION_FAILED" && (
                        <button type="button" onClick={() => void controller.retryEvaluation(attemptId, task.taskType)} disabled={controller.busyKey !== null} className="mt-3 rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                            {t("retryEvaluation")}
                        </button>
                    )}
                </div>
            )}

            {evaluation?.evaluable && (
                <div className="mt-4 space-y-4">
                    {evaluation.metrics.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {evaluation.metrics.map((metric, index) => (
                                <MetricRow key={index} metric={metric} />
                            ))}
                        </div>
                    )}
                    {evaluation.strengths.length > 0 && <Feedback title={t("strengths")} items={evaluation.strengths} />}
                    {evaluation.improvements.length > 0 && <Feedback title={t("improvements")} items={evaluation.improvements} />}
                    {evaluation.recommendedAnswers.length > 0 && <Feedback title={t("recommendedAnswers")} items={evaluation.recommendedAnswers} />}
                </div>
            )}

            {task.taskType === "REPEAT_AFTER_AUDIO" && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    <p>
                        {task.audioAvailability?.expired
                            ? t("audioExpired")
                            : task.audioAvailability?.available
                              ? t("audioRetained", { until: task.audioAvailability.retentionUntil ?? "-" })
                              : t("audioUnavailable")}
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

            {!notSelected && task.taskResponseId && (
                <button type="button" onClick={() => setReportOpen(true)} className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-rose-600 dark:text-slate-400">
                    <Flag className="h-4 w-4" aria-hidden="true" /> {t("report.action")}
                </button>
            )}

            {reportOpen && (
                <ListeningEvaluationReportModal
                    taskResponseId={task.taskResponseId}
                    audioExpired={task.audioAvailability?.expired ?? false}
                    controller={controller}
                    onClose={() => setReportOpen(false)}
                />
            )}
        </article>
    );
}

function MetricRow({ metric }: { metric: Record<string, unknown> }) {
    const entries = Object.entries(metric);
    const label = String(metric.metric ?? metric.name ?? entries[0]?.[0] ?? "metric");
    const value = metric.score ?? metric.value ?? entries.find(([, item]) => typeof item === "number")?.[1];
    return (
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <p className="text-xs font-black text-slate-400">{label}</p>
            <p className="mt-1 font-black text-slate-800 dark:text-slate-100">{typeof value === "number" ? Math.round(value) : "—"}</p>
        </div>
    );
}

function Feedback({ title, items }: { title: string; items: string[] }) {
    return (
        <div>
            <p className="text-xs font-black text-slate-400">{title}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {items.map((item) => <li key={item}>{item}</li>)}
            </ul>
        </div>
    );
}
