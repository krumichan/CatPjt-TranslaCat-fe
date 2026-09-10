"use client";

import { getWrongOfficialPracticeQuestions } from "@/features/language-learning/practice/practiceSessionState";

import type { PracticeSet } from "@/types/language-learning/practice";
import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

export function PracticeCompletedCard({ set, t, onReview, onBack }: { set: PracticeSet; t: ReturnType<typeof useTranslations>; onReview: (index: number) => void; onBack: () => void }) {
    const wrongOfficial = getWrongOfficialPracticeQuestions(set);
    return (
        <div className="space-y-5">
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 text-center shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 sm:p-8">
                <Trophy className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" />
                <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">{t("result.eyebrow")}</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t("result.title")}</h2>
                <p className="mt-3 text-5xl font-black text-emerald-700 dark:text-emerald-200">{Math.round(set.officialScore ?? 0)}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("result.score", { correct: set.correctCount, total: set.questionCount })}</p>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{t("result.metrics")}</h3>
                {set.metrics.length === 0 ? <p className="mt-3 text-sm text-slate-400">{t("result.noMetrics")}</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{set.metrics.map((metric) => <div key={metric.skillTag} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><div className="flex items-center justify-between gap-3"><span className="text-sm font-black text-slate-700 dark:text-slate-200">{t(`skills.${metric.skillTag}`)}</span><span className="text-lg font-black text-blue-600 dark:text-blue-300">{Math.round(metric.score)}</span></div><p className="mt-1 text-xs text-slate-400">{t("result.samples", { count: metric.sampleCount })}</p></div>)}</div>}
                {wrongOfficial.length > 0 && <div className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10"><h4 className="text-sm font-black text-slate-800 dark:text-slate-100">{t("result.reviewWrong")}</h4><div className="mt-3 flex flex-wrap gap-2">{wrongOfficial.map(({ q, index }) => <button key={q.questionId} type="button" onClick={() => onReview(index)} className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-black text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-200">#{q.order}{q.correct ? ` · ${t("result.recovered")}` : ""}</button>)}</div></div>}
                <div className="mt-6"><button type="button" onClick={onBack} className="w-full rounded-xl bg-blue-600 px-5 py-3 text-base font-black text-white hover:bg-blue-500 sm:w-auto">{t("result.back")}</button></div>
            </section>
        </div>
    );
}
