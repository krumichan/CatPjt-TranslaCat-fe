"use client";

import { useTranslations } from "next-intl";

import type { LevelTestDomainScores } from "@/types/language-learning/level";

interface LevelTestScoreGridProps {
    scores: LevelTestDomainScores | null;
}

const DOMAINS = [
    ["VOCABULARY", "vocabulary"],
    ["GRAMMAR", "grammar"],
    ["READING", "reading"],
    ["LISTENING", "listening"],
    ["WRITING", "writing"],
    ["SPEAKING", "speaking"],
] as const;

export function LevelTestScoreGrid({ scores }: LevelTestScoreGridProps) {
    const t = useTranslations("LanguageLearning.levelTest.domain");
    if (!scores) return null;

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {DOMAINS.map(([domain, field]) => {
                const score = scores[field];
                return (
                    <div
                        key={domain}
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-white/10 dark:bg-white/5"
                    >
                        <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                            {t(domain)}
                        </p>
                        <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                            {score ?? "—"}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
