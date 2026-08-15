"use client";

import { useTranslations } from "next-intl";

import type { WritingEvaluation } from "@/types/language-learning/daily";

export function WritingScoreGrid({ evaluation }: { evaluation: WritingEvaluation }) {
    const t = useTranslations("LanguageLearning.metrics");
    const scores = [
        ["OVERALL", evaluation.overall],
        ["MEANING", evaluation.meaning],
        ["GRAMMAR", evaluation.grammar],
        ["VOCABULARY", evaluation.vocabulary],
        ["NATURALNESS", evaluation.naturalness],
        ["EXPRESSION", evaluation.expression],
    ] as const;

    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {scores.map(([metric, score]) => (
                <div key={metric} className={`rounded-xl px-3 py-3 text-center ${metric === "OVERALL" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-900 dark:bg-white/5 dark:text-white"}`}>
                    <p className={`text-[11px] font-black uppercase tracking-wide ${metric === "OVERALL" ? "text-blue-100" : "text-slate-400"}`}>
                        {t(metric)}
                    </p>
                    <p className="mt-1 text-xl font-black">{score}</p>
                </div>
            ))}
        </div>
    );
}
