"use client";

import { usePracticeSessionController } from "@/hooks/language-learning/practice/usePracticeSessionController";

import { GenerationProgress } from "@/components/language-learning/common/GenerationProgress";
import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { PracticeCompletedCard } from "@/components/language-learning/practice/PracticeCompletedCard";
import { PracticeOrderingPanel } from "@/components/language-learning/practice/PracticeOrderingPanel";
import { cn } from "@/lib/utils";
import { useRouter } from "@/navigation";
import type { PracticeDomain } from "@/types/language-learning/practice";
import { ArrowLeft, CheckCircle2, ChevronRight, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function PracticeSessionPage({ setId, expectedDomain }: { setId: number; expectedDomain: PracticeDomain }) {
    const ns = expectedDomain === "READING" ? "LanguageLearning.reading" : "LanguageLearning.vocabulary";
    const t = useTranslations(ns);
    const common = useTranslations("LanguageLearning.common");
    const router = useRouter();
    const {
        set, index, setIndex, question, selected, setSelected,
        loading, submitting, error, reviewMode, setReviewMode,
        retryingGeneration, generating, generationFailure,
        load, retryGeneration, canSubmit, submit, next, moveChunk, setSingleChoice, completed,
    } = usePracticeSessionController({ setId, expectedDomain });

    let content;
    if (loading) {
        content = <LanguageLearningStateCard variant="loading" title={common("loadingTitle")} message={t("session.loading")} />;
    } else if (error && !set) {
        content = <LanguageLearningStateCard variant="error" title={common("loadFailedTitle")} message={t("loadFailed")} actionLabel={common("retry")} onAction={() => void load()} />;
    } else if (set && !question && (generating || generationFailure)) {
        content = <GenerationProgress readyCount={set.questions.length} targetCount={set.questionCount} generating={generating} waiting failureMessage={generationFailure} retrying={retryingGeneration} onRetry={() => void retryGeneration()} />;
    } else if (!set || !question) {
        content = <LanguageLearningStateCard variant="error" title={common("loadFailedTitle")} message={t("loadFailed")} />;
    } else if (completed && !reviewMode) {
        content = <PracticeCompletedCard set={set} t={t} onReview={(nextIndex) => { setIndex(nextIndex); setReviewMode(true); }} onBack={() => router.push(expectedDomain === "READING" ? "/language-learning/reading" : "/language-learning/vocabulary")} />;
    } else {
        const latest = question.attempts.at(-1) ?? null;
        const reveal = question.answered;
        const displayedSelection = selected.length > 0 ? selected : (latest?.answer ?? []);
        content = (
            <div className="space-y-5">
                <GenerationProgress readyCount={set.questions.length} targetCount={set.questionCount} generating={generating} waiting={question.answered && index === set.questions.length - 1} failureMessage={generationFailure} retrying={retryingGeneration} onRetry={() => void retryGeneration()} />
                {error && <LanguageLearningStateCard variant="error" title={common("loadFailedTitle")} message={t("session.submitFailed")} />}
                <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">{t(`modes.${set.mode}.title`)}</p>
                            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{t("session.progress", { current: question.order, total: set.questionCount })}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">{t(`difficulty.${question.difficulty}`)}</span>
                            {question.reviewTarget && (
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">{t("session.reviewTarget")}</span>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(set.answeredCount / set.questionCount) * 100}%` }} /></div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                    {expectedDomain === "VOCABULARY" && reveal && question.targetExpression && (
                        <div className="mb-5 rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 dark:border-violet-500/20 dark:bg-violet-500/10">
                            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-violet-500 dark:text-violet-300">{t("session.targetExpression")}</p>
                            <p className="mt-1 text-sm font-black text-violet-800 dark:text-violet-100 sm:text-base">{question.targetExpression}</p>
                        </div>
                    )}
                    {question.passageText && (
                        <div className="mb-6 rounded-2xl bg-slate-50 p-4 text-[15px] leading-8 text-slate-700 dark:bg-white/5 dark:text-slate-200 sm:p-5 sm:text-base">
                            <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{t("session.passage")}</p>
                            <p className="whitespace-pre-wrap">{question.passageText}</p>
                        </div>
                    )}
                    <p className="text-base font-black leading-7 text-slate-950 dark:text-white sm:text-lg">{question.prompt}</p>

                    {question.questionType === "SINGLE_CHOICE" ? (
                        <div className="mt-5 grid gap-3">
                            {question.options.map((option) => {
                                const chosen = displayedSelection.includes(option.key);
                                const correctKey = reveal && question.correctAnswer.includes(option.key);
                                const wrongChosen = reveal && chosen && !correctKey;
                                return (
                                    <button key={option.key} type="button" onClick={() => setSingleChoice(option.key)} disabled={question.correct || (question.answered && !question.canRetry)} className={cn("flex min-h-13 items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm leading-6 transition sm:text-base", correctKey ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-100" : wrongChosen ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-100" : chosen ? "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-500/10 dark:text-blue-100" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200") }>
                                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black dark:bg-white/10">{option.key}</span>
                                        <span>{option.text}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <PracticeOrderingPanel question={question} selection={displayedSelection} editable={!question.correct && (!question.answered || question.canRetry)} onToggle={moveChunk} onReset={() => setSelected([])} t={t} />
                    )}

                    {reveal && (
                        <div className={cn("mt-6 rounded-2xl border p-4", latest?.correct ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10" : "border-amber-200 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10")}>
                            <div className="flex items-center gap-2">
                                {latest?.correct ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" /> : <XCircle className="h-5 w-5 text-amber-600" aria-hidden="true" />}
                                <p className="font-black text-slate-900 dark:text-white">{latest?.correct ? t("session.correct") : t("session.incorrect")}</p>
                            </div>
                            {question.evidenceText && <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200"><strong>{t("session.evidence")}</strong> {question.evidenceText}</p>}
                            {question.explanationOrigin && <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{question.explanationOrigin}</p>}
                            {question.explanationLearning && <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{question.explanationLearning}</p>}
                            {expectedDomain === "READING" && !latest?.correct && question.vocabularyCandidates.length > 0 && (
                                <div className="mt-4 border-t border-amber-200/70 pt-3 dark:border-amber-500/20">
                                    <p className="text-xs font-black text-amber-800 dark:text-amber-100">{t("session.vocabularyCandidates")}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {question.vocabularyCandidates.map((value) => (
                                            <span key={value} className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">{value}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {!latest?.correct && question.canRetry && <p className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-200">{t("session.retryNotice")}</p>}
                        </div>
                    )}

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                        <button type="button" onClick={() => reviewMode ? setReviewMode(false) : router.push(expectedDomain === "READING" ? "/language-learning/reading" : "/language-learning/vocabulary")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{reviewMode ? t("session.backToResult") : t("session.back")}</button>
                        <div className="flex flex-1 flex-wrap justify-end gap-2 sm:flex-none">
                            {!reveal && (
                                <button type="button" onClick={() => void submit()} disabled={!canSubmit} className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">{submitting ? t("session.submitting") : t("session.submit")}</button>
                            )}
                            {reveal && !latest?.correct && question.canRetry && (
                                <button type="button" onClick={() => void submit()} disabled={!canSubmit} className="inline-flex flex-1 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20 sm:flex-none">{submitting ? t("session.submitting") : t("session.retry")}</button>
                            )}
                            {reveal && index < set.questions.length - 1 && (
                                <button type="button" onClick={next} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500 sm:flex-none">{t("session.next")}<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return <LanguageLearningPageLayout title={t("title")} description={t("description")}>{content}</LanguageLearningPageLayout>;
}
