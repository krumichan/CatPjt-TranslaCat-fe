"use client";

import { ListChecks } from "lucide-react";

export function SpeakingPromptGuideList({ title, values }: { title: string; values: string[] }) {
    if (values.length === 0) return null;
    return (
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
            <p className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-300">
                <ListChecks className="h-4 w-4" aria-hidden="true" />
                {title}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-700 dark:text-slate-200">
                {values.map((value, index) => <li key={`${index}-${value}`}>• {value}</li>)}
            </ul>
        </div>
    );
}
