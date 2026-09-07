"use client";

import { CheckCircle2, ClipboardCheck, FileText, Headphones, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageLearningOnboardingCard } from "@/components/language-learning/common/LanguageLearningOnboardingCard";
import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { useListeningLandingController } from "@/hooks/language-learning/listening/useListeningLandingController";
import { Link } from "@/navigation";
import type { ListeningLearningMode } from "@/types/language-learning/listening";

const MODES: Array<[ListeningLearningMode, typeof Headphones]> = [
    ["DICTATION", Headphones],
    ["COMPREHENSION", ClipboardCheck],
    ["SUMMARY", FileText],
];

export function ListeningLandingPage() {
    const t = useTranslations("LanguageLearning.listening");
    const common = useTranslations("LanguageLearning.common");
    const controller = useListeningLandingController();

    const content = (() => {
        if (controller.entry.isLoading || controller.isLoading) {
            return <LanguageLearningStateCard variant="loading" title={common("loadingTitle")} message={t("landing.loading")} />;
        }
        if (controller.entry.settingError || controller.entry.levelStatusError || controller.loadError) {
            return <LanguageLearningStateCard variant="error" title={common("loadFailedTitle")} message={t("landing.loadFailed")} actionLabel={common("retry")} onAction={() => void controller.reload()} />;
        }
        if (!controller.entry.setting?.configured) return <LanguageLearningOnboardingCard mode="SETTING" />;
        if (controller.entry.levelStatus?.profileState === "LEVEL_TEST_REQUIRED") return <LanguageLearningOnboardingCard mode="LEVEL_TEST" />;
        if (!controller.policy?.enabled) {
            return <LanguageLearningStateCard variant="error" title={t("landing.disabledTitle")} message={t("landing.disabledDescription")} />;
        }

        return (
            <div className="space-y-5" data-testid="listening-landing-page">
                {controller.activeSession && (
                    <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-400/20 dark:bg-blue-500/10">
                        <p className="font-black text-blue-900 dark:text-blue-100">{t("landing.resumeTitle")}</p>
                        <p className="mt-1 text-sm text-blue-700 dark:text-blue-200">{t("landing.resumeDescription")}</p>
                        <Link href={`/language-learning/listening/session/${controller.activeSession.sessionId}`} className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500">
                            {t("landing.resume")}
                        </Link>
                    </section>
                )}

                <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                    <div className="max-w-2xl">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
                            {t("modeSelector.eyebrow")}
                        </p>
                        <h2 className="mt-2 text-xl font-black leading-tight text-slate-950 sm:text-2xl dark:text-white">
                            {t("modeSelector.title")}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {t("modeSelector.description")}
                        </p>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-3">
                        {MODES.map(([mode, Icon]) => {
                            const status = controller.statusByMode[mode];
                            const liveSet = controller.selectedMode === mode ? controller.currentSet : null;
                            const activeForMode = controller.activeSession && status?.dailySetId === controller.activeSession.dailySetId;
                            const completed = status?.completed === true;
                            const evaluating = status?.latestSessionStatus === "EVALUATING";
                            const failed = status?.status === "FAILED" || (controller.selectedMode === mode && liveSet?.status === "FAILED");
                            const preparing = status?.status === "GENERATING" || status?.status === "PARTIAL" || (liveSet?.status !== undefined && liveSet.status !== "FAILED" && liveSet.status !== "READY");
                            const preparationDelayed = controller.preparationDelayedByMode[mode] === true;
                            const targetCount = status?.targetItemCount || liveSet?.targetItemCount || 0;
                            const submittedCount = status?.submittedItemCount ?? 0;
                            const terminalCount = status?.terminalItemCount ?? 0;
                            const evaluatedCount = status?.evaluatedItemCount ?? 0;
                            const revealedCount = status?.answerRevealedItemCount ?? 0;
                            const excludedCount = Math.max(0, terminalCount - evaluatedCount);
                            const otherExcludedCount = Math.max(0, excludedCount - revealedCount);
                            const generatedCount = targetCount <= 0
                                ? 0
                                : Math.min(targetCount, Math.max(status?.physicalItemCount ?? 0, liveSet?.physicalItemCount ?? 0));
                            const readyCount = targetCount <= 0
                                ? 0
                                : Math.min(targetCount, Math.max(status?.readyItemCount ?? 0, liveSet?.readyItemCount ?? 0));
                            const finishedCount = Math.max(submittedCount, terminalCount);
                            const completionDetails = completed
                                ? [
                                    t("modeSelector.evaluationCoverageDetail", { evaluated: evaluatedCount, total: targetCount }),
                                    revealedCount > 0 ? t("modeSelector.answerRevealedCount", { count: revealedCount }) : null,
                                    otherExcludedCount > 0 ? t("modeSelector.otherExcludedCount", { count: otherExcludedCount }) : null,
                                ].filter((value): value is string => Boolean(value))
                                : [];
                            const actionLabel = completed
                                ? t("modeSelector.result")
                                : evaluating
                                  ? t("modeSelector.evaluationProgress")
                                  : failed
                                    ? t("modeSelector.retry")
                                    : activeForMode
                                      ? t("modeSelector.resume")
                                      : status?.dailySetId
                                        ? t("modeSelector.continue")
                                        : t("modeSelector.start");
                            const href = (completed || evaluating) && status?.latestSessionId
                                ? `/language-learning/listening/session/${status.latestSessionId}/result`
                                : activeForMode && controller.activeSession
                                  ? `/language-learning/listening/session/${controller.activeSession.sessionId}`
                                  : null;

                            return (
                                <article
                                    key={mode}
                                    data-testid={`listening-mode-${mode}`}
                                    className={`flex h-full flex-col rounded-3xl border p-5 transition ${completed ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-400/30 dark:bg-emerald-500/10" : failed ? "border-rose-300 bg-rose-50/70 dark:border-rose-400/30 dark:bg-rose-500/10" : activeForMode ? "border-blue-300 bg-blue-50/70 dark:border-blue-400/30 dark:bg-blue-500/10" : "border-slate-200 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/40 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400/40 dark:hover:bg-blue-500/10"}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-white/10 dark:text-blue-300">
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </div>
                                        {completed && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                                {t("modeSelector.completed")}
                                            </span>
                                        )}
                                        {!completed && evaluating && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                                                <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                                {t("modeSelector.evaluating")}
                                            </span>
                                        )}
                                        {!completed && !evaluating && failed && (
                                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">{t("modeSelector.failed")}</span>
                                        )}
                                        {!completed && !evaluating && !failed && activeForMode && (
                                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">{t("modeSelector.inProgress")}</span>
                                        )}
                                    </div>
                                    <h3 className="mt-5 text-base font-black text-slate-950 sm:text-lg dark:text-white">{t(`mode.${mode}.title`)}</h3>
                                    <p className="mt-2 min-h-18 text-sm leading-6 text-slate-500 dark:text-slate-400">{t(`mode.${mode}.description`)}</p>
                                    {targetCount > 0 && preparing && (
                                        <div className="mt-3 space-y-1" aria-live="polite">
                                            <p className="text-xs font-black text-slate-500 dark:text-slate-300">
                                                {t("modeSelector.preparationProgress", { generated: generatedCount, ready: readyCount, total: targetCount })}
                                            </p>
                                            <p
                                                data-testid={`listening-mode-${mode}-preparation-state`}
                                                className={`inline-flex items-center gap-2 text-xs font-black ${preparationDelayed ? "text-amber-600 dark:text-amber-300" : "text-blue-600 dark:text-blue-300"}`}
                                            >
                                                {preparationDelayed ? (
                                                    <RefreshCw className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                                ) : (
                                                    <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                                )}
                                                {preparationDelayed ? t("modeSelector.recoveryChecking") : t("modeSelector.preparing")}
                                            </p>
                                        </div>
                                    )}
                                    {targetCount > 0 && !preparing && evaluating && (
                                        <div className="mt-3 space-y-1 text-xs font-black">
                                            <p className="text-slate-500 dark:text-slate-300">
                                                {t("modeSelector.learningCompleted", { completed: submittedCount, total: targetCount })}
                                            </p>
                                            <p className="text-blue-600 dark:text-blue-300">
                                                {t("modeSelector.evaluationProcessing", { completed: terminalCount, total: targetCount })}
                                            </p>
                                        </div>
                                    )}
                                    {targetCount > 0 && !preparing && !evaluating && completed && (
                                        <div className="mt-3 space-y-1 text-xs font-black">
                                            <p className="text-emerald-700 dark:text-emerald-200">
                                                {t("modeSelector.learningCompleted", { completed: finishedCount, total: targetCount })}
                                            </p>
                                            <p className="text-slate-500 dark:text-slate-300">{completionDetails.join(" · ")}</p>
                                        </div>
                                    )}
                                    {targetCount > 0 && !preparing && !evaluating && !completed && (
                                        <p className="mt-3 text-xs font-black text-slate-400">
                                            {t("modeSelector.learningProgress", { completed: submittedCount, total: targetCount })}
                                        </p>
                                    )}
                                    <div className="mt-auto pt-5">
                                        {href ? (
                                            <Link href={href} className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-base font-black text-white transition hover:bg-blue-500">
                                                {actionLabel}
                                            </Link>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => void controller.selectMode(mode)}
                                                disabled={controller.isStarting || Boolean(controller.activeSession) || preparing}
                                                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-base font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {preparing ? t("modeSelector.preparing") : actionLabel}
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {controller.actionErrorCode && (
                        <p role="alert" className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                            {t(`errors.${controller.actionErrorCode}`)}
                        </p>
                    )}
                </section>
            </div>
        );
    })();

    return <LanguageLearningPageLayout title={t("title")} description={t("description")}>{content}</LanguageLearningPageLayout>;
}
