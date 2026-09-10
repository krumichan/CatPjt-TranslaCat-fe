"use client";

export function SpeakingHistoryMeta({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
            <dt className="text-[11px] font-bold text-slate-400">{label}</dt>
            <dd className="mt-1 text-sm font-black text-slate-700 dark:text-slate-200">
                {value}
            </dd>
        </div>
    );
}
