"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import type { LevelTestDomain } from "@/types/language-learning/level";

const DOMAIN_RANGES: Array<{
    domain: LevelTestDomain;
    start: number;
    end: number;
}> = [
    { domain: "VOCABULARY", start: 1, end: 3 },
    { domain: "GRAMMAR", start: 4, end: 6 },
    { domain: "READING", start: 7, end: 10 },
    { domain: "LISTENING", start: 11, end: 14 },
    { domain: "WRITING", start: 15, end: 17 },
    { domain: "SPEAKING", start: 18, end: 20 },
];

interface LevelTestDomainStepperProps {
    questionNumber: number;
}

export function LevelTestDomainStepper({
    questionNumber,
}: LevelTestDomainStepperProps) {
    const t = useTranslations("LanguageLearning.levelTest.domain");

    return (
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {DOMAIN_RANGES.map(({ domain, start, end }) => {
                const complete = questionNumber > end;
                const current = questionNumber >= start && questionNumber <= end;
                return (
                    <li
                        key={domain}
                        aria-current={current ? "step" : undefined}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${
                            current
                                ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-400/40 dark:bg-blue-500/10 dark:text-blue-200"
                                : complete
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                                  : "border-slate-200 text-slate-400 dark:border-white/10 dark:text-slate-500"
                        }`}
                    >
                        {complete && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        <span>{t(domain)}</span>
                    </li>
                );
            })}
        </ol>
    );
}
