"use client";

import { ListChecks, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { DailyWritingCompletionCard } from "@/components/language-learning/writing/DailyWritingCompletionCard";
import { DailyWritingItemCard } from "@/components/language-learning/writing/DailyWritingItemCard";
import type { DailyWritingPageController } from "@/hooks/language-learning/useDailyWritingPageController";

interface DailyWritingViewProps {
    controller: DailyWritingPageController;
}

export function DailyWritingView({ controller }: DailyWritingViewProps) {
    const t = useTranslations("LanguageLearning.writing");
    const dailySet = controller.dailySet!;
    const isCompleted = controller.completedCount >= dailySet.sentenceCount;
    const canRegenerate =
        controller.remainingRegenerations > 0 &&
        dailySet.items.some((item) => !item.answered) &&
        !controller.isSubmittingAll &&
        controller.pendingEvaluationCount === 0;
    const showBulkEvaluation =
        !isCompleted &&
        (controller.bulkPendingCount > 1 ||
            controller.bulkEvaluationRequested);
    const missingBulkDraftCount = Math.max(
        0,
        controller.bulkPendingCount - controller.bulkFilledCount,
    );
    const interactionLocked =
        controller.submittingItemId !== null || controller.isSubmittingAll;
    const bulkIsEvaluating =
        controller.bulkEvaluationRequested &&
        controller.pendingEvaluationCount > 0;

    return (
        <div className="space-y-5" data-testid="daily-writing-page">
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
                            {dailySet.learningDate}
                        </p>
                        <p className="mt-2 text-sm font-black text-slate-700 dark:text-slate-200">
                            {t(`types.${dailySet.writingType}`)}
                        </p>
                        <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                            {t("progress", {
                                completed: controller.completedCount,
                                total: dailySet.sentenceCount,
                            })}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {t("snapshotNotice")}
                        </p>
                        {controller.pendingEvaluationCount > 0 && (
                            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-300">
                                <LoaderCircle
                                    className="h-3.5 w-3.5 animate-spin"
                                    aria-hidden="true"
                                />
                                {t("evaluationProgress", {
                                    count: controller.pendingEvaluationCount,
                                })}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => void controller.regenerate()}
                        disabled={
                            !canRegenerate ||
                            controller.isRegenerating ||
                            interactionLocked
                        }
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${controller.isRegenerating ? "animate-spin" : ""}`}
                            aria-hidden="true"
                        />
                        {controller.isRegenerating
                            ? t("regenerate.loading")
                            : t("regenerate.action", {
                                  count: controller.remainingRegenerations,
                              })}
                    </button>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{
                            width: `${
                                dailySet.sentenceCount === 0
                                    ? 0
                                    : Math.round(
                                          (controller.completedCount /
                                              dailySet.sentenceCount) *
                                              100,
                                      )
                            }%`,
                        }}
                    />
                </div>
            </section>

            {controller.entry.levelStatus?.profileState === "CALIBRATING" && (
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-100">
                    <span className="font-black">{t("calibration.title")}</span>{" "}
                    {t("calibration.description")}
                </div>
            )}

            {controller.actionError && (
                <p
                    role="alert"
                    className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
                >
                    {t("actionFailed")}
                </p>
            )}

            <div className="space-y-5">
                {dailySet.items.map((item) => (
                    <DailyWritingItemCard
                        key={item.itemId}
                        item={item}
                        writingType={dailySet.writingType}
                        draft={controller.drafts[item.itemId] ?? ""}
                        draftPersistenceEnabled={
                            controller.draftPersistenceEnabled
                        }
                        isSubmitting={
                            controller.submittingItemId === item.itemId
                        }
                        isInteractionLocked={interactionLocked}
                        onDraftChange={(value) =>
                            controller.updateDraft(item.itemId, value)
                        }
                        onSubmit={() => void controller.submitAnswer(item)}
                    />
                ))}
            </div>

            {showBulkEvaluation && (
                <section
                    className="rounded-3xl border border-blue-200 bg-blue-50/70 p-5 dark:border-blue-400/20 dark:bg-blue-500/10 sm:p-6"
                    data-testid="daily-writing-bulk-evaluation"
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <ListChecks
                                    className="h-5 w-5 text-blue-600 dark:text-blue-300"
                                    aria-hidden="true"
                                />
                                <h3 className="text-base font-black text-slate-950 dark:text-white">
                                    {t("bulkEvaluation.title")}
                                </h3>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {bulkIsEvaluating
                                    ? t("bulkEvaluation.backgroundDescription")
                                    : t("bulkEvaluation.description", {
                                          filled: controller.bulkFilledCount,
                                          total: controller.bulkPendingCount,
                                      })}
                            </p>
                            {bulkIsEvaluating && (
                                <p className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-200">
                                    {t("bulkEvaluation.leaveSafe")}
                                </p>
                            )}
                            {!bulkIsEvaluating &&
                                !controller.isSubmittingAll &&
                                missingBulkDraftCount > 0 && (
                                    <p className="mt-1 text-xs font-bold text-blue-700 dark:text-blue-200">
                                        {t("bulkEvaluation.missing", {
                                            count: missingBulkDraftCount,
                                        })}
                                    </p>
                                )}
                            {controller.failedEvaluationCount > 0 && (
                                <p className="mt-1 text-xs font-bold text-rose-700 dark:text-rose-200">
                                    {t("bulkEvaluation.failed", {
                                        count: controller.failedEvaluationCount,
                                    })}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => void controller.submitAllAnswers()}
                            disabled={
                                controller.isSubmittingAll ||
                                bulkIsEvaluating ||
                                !controller.canSubmitAll
                            }
                            className="inline-flex min-w-48 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {controller.isSubmittingAll ? (
                                t("bulkEvaluation.queueing", {
                                    completed: controller.bulkCompletedCount,
                                    total: controller.bulkTotalCount,
                                })
                            ) : bulkIsEvaluating ? (
                                <>
                                    <LoaderCircle
                                        className="h-4 w-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                    {t("bulkEvaluation.evaluating", {
                                        completed: controller.completedCount,
                                        total: dailySet.sentenceCount,
                                    })}
                                </>
                            ) : (
                                t("bulkEvaluation.action", {
                                    count: controller.bulkPendingCount,
                                })
                            )}
                        </button>
                    </div>
                </section>
            )}

            {isCompleted && (
                <DailyWritingCompletionCard
                    items={dailySet.items}
                    onChooseType={controller.showTypeSelector}
                />
            )}
        </div>
    );
}
