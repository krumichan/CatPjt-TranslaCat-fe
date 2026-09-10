"use client";

import type { SpeakingAssistanceResponse } from "@/types/language-learning/speaking";

export function SpeakingAssistanceResult({
    result,
    title,
}: {
    result: SpeakingAssistanceResponse | undefined;
    title: string;
}) {
    if (!result?.content) return null;

    return (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700 dark:bg-white/5 dark:text-slate-200">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                {title}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{result.content}</p>
        </div>
    );
}
