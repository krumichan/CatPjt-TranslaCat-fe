"use client";

import type { BilingualMessage } from "@/types/language-learning/common";

export function WritingBilingualBlock({ item }: { item: BilingualMessage }) {
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
