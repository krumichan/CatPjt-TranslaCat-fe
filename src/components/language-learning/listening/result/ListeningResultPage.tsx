"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { ListeningIndependenceSummary } from "@/components/language-learning/listening/result/ListeningIndependenceSummary";
import { ListeningReferenceAudioPlayer } from "@/components/language-learning/listening/result/ListeningReferenceAudioPlayer";
import { ListeningTaskResultCard } from "@/components/language-learning/listening/result/ListeningTaskResultCard";
import { useListeningResultController } from "@/hooks/language-learning/listening/useListeningResultController";
import { Link } from "@/navigation";

export function ListeningResultPage({ sessionId }: { sessionId: number }) {
    const t = useTranslations("LanguageLearning.listening");
    const common = useTranslations("LanguageLearning.common");
    const controller = useListeningResultController(sessionId);

    if (controller.isLoading) {
        return <LanguageLearningPageLayout title={t("result.title")} description={t("result.description")}><LanguageLearningStateCard variant="loading" title={common("loadingTitle")} message={t("result.loading")} /></LanguageLearningPageLayout>;
    }
    if (controller.loadError || !controller.result) {
        return <LanguageLearningPageLayout title={t("result.title")} description={t("result.description")}><LanguageLearningStateCard variant="error" title={common("loadFailedTitle")} message={t("result.loadFailed")} actionLabel={common("retry")} onAction={() => void controller.reload()} /></LanguageLearningPageLayout>;
    }

    const result = controller.result;
    const evaluationState = controller.evaluationState;

    if (!evaluationState.allSettled) {
        const percent = evaluationState.officialCount <= 0
            ? 0
            : Math.round((evaluationState.terminalCount / evaluationState.officialCount) * 100);
        return (
            <LanguageLearningPageLayout title={t("result.title")} description={t("result.description")}>
                <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-400/20 dark:bg-blue-500/10" aria-live="polite" data-testid="listening-result-evaluating">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600 dark:text-blue-300">{t("result.evaluatingEyebrow")}</p>
                    <h2 className="mt-2 text-xl font-black text-blue-950 dark:text-blue-50">{t("result.evaluatingTitle")}</h2>
                    <p className="mt-2 text-sm leading-6 text-blue-800 dark:text-blue-200">{t("result.evaluatingDescription")}</p>
                    <p className="mt-4 text-sm font-black text-blue-900 dark:text-blue-100" data-testid="listening-result-submitted-progress">
                        {t("result.evaluatingSolvedProgress", { completed: evaluationState.submittedCount, total: evaluationState.officialCount })}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-white/10">
                        <div className="h-full rounded-full bg-blue-600 transition-[width] motion-reduce:transition-none" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm font-black text-blue-800 dark:text-blue-100">
                        <span>{t("result.evaluatingProgress", { completed: evaluationState.terminalCount, total: evaluationState.officialCount })}</span>
                        <span>{percent}%</span>
                    </div>
                    <p className="mt-4 text-xs font-bold text-blue-700/80 dark:text-blue-200/80">{t("result.evaluatingHint")}</p>
                </section>
            </LanguageLearningPageLayout>
        );
    }

    return (
        <LanguageLearningPageLayout title={t("result.title")} description={t("result.description")}>
            <div className="space-y-5" data-testid="listening-result-page">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase text-blue-600 dark:text-blue-300">{t("result.summaryEyebrow")}</p>
                            <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{t("result.summaryTitle")}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-black text-slate-950 dark:text-white">{result.averageScore === null ? "—" : Math.round(result.averageScore)}</p>
                            <p className="mt-1 text-xs font-bold text-slate-400">{t("result.evaluationCoverage", { evaluated: result.evaluatedItemCount, total: evaluationState.officialCount })}</p>
                        </div>
                    </div>
                </section>

                {result.evaluatedItemCount < evaluationState.officialCount && (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100" data-testid="listening-result-partial-notice">
                        {t("result.partialEvaluationNotice", { evaluated: result.evaluatedItemCount, total: evaluationState.officialCount })}
                    </p>
                )}

                {controller.errorCode && <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{t(`errors.${controller.errorCode}`)}</p>}

                {result.attempts.map((attempt) => (
                    <section key={attempt.attemptId} className="space-y-3" data-testid={`listening-result-attempt-${attempt.attemptId}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                            <div>
                                <h2 className="font-black text-slate-900 dark:text-white">{t("result.itemTitle", { itemId: attempt.itemId })}</h2>
                                <p className="text-xs text-slate-400">{attempt.evaluationPurpose === "PRACTICE" ? t("result.practiceBadge") : t("result.officialBadge")}</p>
                            </div>
                            <p className="text-sm font-black text-slate-500">{t("result.taskCoverage", { count: attempt.evaluatedTaskCount, total: attempt.tasks.filter((task) => task.status !== "NOT_SELECTED").length })}</p>
                        </div>
                        <ListeningReferenceAudioPlayer itemId={attempt.itemId} />
                        {attempt.coverage >= 1 && attempt.overallScore !== null ? (
                            <ListeningIndependenceSummary attempt={attempt} />
                        ) : (
                            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
                                {t("result.itemExcludedFromScore")}
                            </p>
                        )}
                        <div className="grid gap-3 xl:grid-cols-3">
                            {attempt.tasks.filter((task) => task.status !== "NOT_SELECTED").map((task) => (
                                <ListeningTaskResultCard
                                    key={task.taskType}
                                    task={task}
                                    attemptId={attempt.attemptId}
                                    answerRevealed={attempt.answerRevealed}
                                    controller={controller}
                                />
                            ))}
                        </div>
                        {attempt.evaluationPurpose === "OFFICIAL" && ["EVALUATED", "NOT_EVALUABLE"].includes(attempt.status) && (
                            <button type="button" onClick={() => void controller.startPractice(attempt.itemId, attempt.tasks.filter((task) => task.status !== "NOT_SELECTED").map((task) => task.taskType))} disabled={controller.busyKey !== null} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                                {t("result.practice")}
                            </button>
                        )}
                    </section>
                ))}

                <div className="flex flex-wrap gap-2">
                    <Link href="/language-learning" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white">{t("result.dashboard")}</Link>
                    <Link href="/language-learning/history" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 dark:border-white/10 dark:text-slate-300">{t("result.history")}</Link>
                </div>
            </div>
        </LanguageLearningPageLayout>
    );
}
