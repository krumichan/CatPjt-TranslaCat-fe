"use client";

import { CheckCircle2, Lightbulb, PencilLine, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { WritingScoreGrid } from "@/components/language-learning/writing/WritingScoreGrid";
import type { BilingualMessage } from "@/types/language-learning/common";
import type { WritingEvaluation } from "@/types/language-learning/daily";

function BilingualBlock({ item }: { item: BilingualMessage }) {
    return (
        <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
            <p className="text-sm font-bold leading-6 text-slate-800 dark:text-slate-100">
                {item.originText}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {item.learningText}
            </p>
        </div>
    );
}

export function WritingEvaluationPanel({
    evaluation,
    compact = false,
}: {
    evaluation: WritingEvaluation;
    compact?: boolean;
}) {
    const t = useTranslations("LanguageLearning.evaluation");

    return (
        <section className={`${compact ? "rounded-2xl" : "rounded-3xl"} border border-blue-100 bg-blue-50/50 p-5 dark:border-blue-500/20 dark:bg-blue-500/5`}>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                        {t("eyebrow")}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                        {t("title")}
                    </h3>
                </div>
                <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-black text-white">
                    {evaluation.overall}
                </span>
            </div>

            <div className="mt-4">
                <WritingScoreGrid evaluation={evaluation} />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        {t("strengths")}
                    </div>
                    <div className="space-y-2">
                        {evaluation.strengths.map((item, index) => (
                            <BilingualBlock key={`${item.originText}-${index}`} item={item} />
                        ))}
                    </div>
                </div>
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-700 dark:text-amber-300">
                        <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                        {t("weaknesses")}
                    </div>
                    <div className="space-y-2">
                        {evaluation.weaknesses.map((item, index) => (
                            <BilingualBlock key={`${item.originText}-${index}`} item={item} />
                        ))}
                    </div>
                </div>
            </div>

            {evaluation.corrections.length > 0 && (
                <div className="mt-5">
                    <div className="mb-2 flex items-center gap-2 text-sm font-black text-violet-700 dark:text-violet-300">
                        <PencilLine className="h-4 w-4" aria-hidden="true" />
                        {t("corrections")}
                    </div>
                    <div className="space-y-2">
                        {evaluation.corrections.map((correction, index) => (
                            <div key={`${correction.original}-${index}`} className="rounded-xl bg-white p-4 shadow-sm dark:bg-white/5">
                                <div className="flex flex-wrap gap-2 text-sm">
                                    <span className="line-through text-rose-500">{correction.original}</span>
                                    <span aria-hidden="true">→</span>
                                    <span className="font-black text-emerald-600 dark:text-emerald-300">{correction.corrected}</span>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                                        {correction.category}
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <BilingualBlock item={correction.explanation} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-black text-blue-700 dark:text-blue-300">
                    <Lightbulb className="h-4 w-4" aria-hidden="true" />
                    {t("recommendedAnswers")}
                </div>
                <ol
                    aria-label={t("recommendedAnswers")}
                    className="space-y-2"
                >
                    {evaluation.recommendedAnswers.map((answer, index) => (
                        <li key={`${answer}-${index}`} className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm dark:bg-white/5 dark:text-slate-200">
                            <span className="mr-2 font-black text-blue-600 dark:text-blue-300">{index + 1}.</span>
                            {answer}
                        </li>
                    ))}
                </ol>
            </div>

            <div className="mt-5">
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-200">
                    {t("explanation")}
                </h4>
                <div className="mt-2">
                    <BilingualBlock item={evaluation.explanation} />
                </div>
            </div>
        </section>
    );
}
