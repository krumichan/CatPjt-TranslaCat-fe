"use client";

export function SpeakingEvaluationTextListCard({ title, items, empty }: { title: string; items: string[]; empty: string }) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
            {items.length ? (
                <ul className="mt-4 space-y-2">
                    {items.map((item, index) => <li key={index} className="rounded-xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600 dark:bg-white/5 dark:text-slate-300">{item}</li>)}
                </ul>
            ) : <p className="mt-3 text-sm text-slate-400">{empty}</p>}
        </section>
    );
}
