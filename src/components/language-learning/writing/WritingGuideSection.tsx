"use client";

export function WritingGuideSection({
    title,
    items,
}: {
    title: string;
    items: string[];
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white/75 p-4 dark:border-white/10 dark:bg-black/10">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-200">
                {title}
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {items.map((value, index) => (
                    <li key={`${title}-${index}-${value}`} className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>{value}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
