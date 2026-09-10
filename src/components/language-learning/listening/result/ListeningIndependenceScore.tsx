"use client";

export function ListeningIndependenceScore({ label, value }: { label: string; value: number | null }) {
    return (
        <div className="rounded-2xl bg-white p-4 text-center dark:bg-white/5">
            <p className="text-xs font-black text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {value == null ? "—" : Math.round(value)}
            </p>
        </div>
    );
}
