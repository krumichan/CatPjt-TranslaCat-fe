"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import type { PracticeSet } from "@/types/language-learning/practice";

export function PracticeHistoryDetail({ detail }: { detail: PracticeSet }) {
    const ns = detail.domain === "READING" ? "LanguageLearning.reading" : "LanguageLearning.vocabulary";
    const t = useTranslations(ns);

    return (
        <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">{t(`modes.${detail.mode}.title`)}</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black text-slate-950 dark:text-white">{t("result.title")}</h2>
                        <p className="mt-1 text-sm text-slate-400">{detail.learningDate}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-black text-blue-600 dark:text-blue-300">{detail.officialScore == null ? "—" : Math.round(detail.officialScore)}</p>
                        <p className="text-xs font-bold text-slate-400">{detail.correctCount} / {detail.questionCount}</p>
                    </div>
                </div>
                {detail.metrics.length > 0 && (
                    <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {detail.metrics.map((metric) => (
                            <div key={metric.skillTag} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">{t(`skills.${metric.skillTag}`)}</span>
                                    <span className="text-sm font-black text-blue-600 dark:text-blue-300">{Math.round(metric.score)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {detail.questions.map((question) => {
                const official = question.attempts.find((attempt) => attempt.official);
                return (
                    <article key={question.questionId} className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-slate-900 dark:text-white">#{question.order}</p>
                            {official && (
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${official.correct ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"}`}>
                                    {official.correct ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                                    {official.correct ? t("session.correct") : t("session.incorrect")}
                                </span>
                            )}
                        </div>
                        {question.passageText && <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600 dark:bg-white/5 dark:text-slate-300">{question.passageText}</p>}
                        <p className="mt-4 font-black leading-7 text-slate-900 dark:text-white">{question.prompt}</p>
                        {official && (
                            <div className="mt-4 space-y-2 text-sm leading-6">
                                <p className="text-slate-500 dark:text-slate-400">{official.answer.map((key) => question.options.find((option) => option.key === key)?.text ?? key).join(" → ")}</p>
                                {question.explanationOrigin && <p className="text-slate-700 dark:text-slate-200">{question.explanationOrigin}</p>}
                                {question.evidenceText && <p className="text-slate-500 dark:text-slate-400"><strong>{t("session.evidence")}</strong> {question.evidenceText}</p>}
                                {detail.domain === "READING" && !official.correct && question.vocabularyCandidates.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {question.vocabularyCandidates.map((value) => (
                                            <span key={value} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">{value}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </article>
                );
            })}
        </div>
    );
}
