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
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-white/5"
                >
                    <span className="min-w-0 truncate font-bold text-slate-700 dark:text-slate-200">
                        {item.key}
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {item.occurrenceCount}
                    </span>
                </li>
            ))}
        </ul>
    );
}
