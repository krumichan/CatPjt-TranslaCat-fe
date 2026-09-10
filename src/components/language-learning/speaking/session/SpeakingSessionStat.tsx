"use client";

import { Clock3 } from "lucide-react";

export function SpeakingSessionStat({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Clock3;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <dt className="flex items-center gap-1.5 text-[11px] font-black text-slate-400">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
            </dt>
            <dd className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">{value}</dd>
        </div>
    );
}
