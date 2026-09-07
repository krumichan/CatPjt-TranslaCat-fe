"use client";

import type { ProfileSignal } from "@/types/language-learning/profile";

interface SignalListProps {
    items: ProfileSignal[];
    emptyText: string;
}

export function SignalList({ items, emptyText }: SignalListProps) {
    if (items.length === 0) {
        return (
            <p className="text-sm text-slate-400 dark:text-slate-500">
                {emptyText}
            </p>
        );
    }

    return (
        <ul className="space-y-2">
            {items.slice(0, 8).map((item) => (
                <li
                    key={item.key}
                    className="flex min-w-0 items-start justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-white/5 sm:gap-3"
                >
                    <span className="min-w-0 flex-1 whitespace-normal break-words font-bold leading-5 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">
                        {item.key}
                    </span>
                    <span className="mt-0.5 shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {item.occurrenceCount}
                    </span>
                </li>
            ))}
        </ul>
    );
}
