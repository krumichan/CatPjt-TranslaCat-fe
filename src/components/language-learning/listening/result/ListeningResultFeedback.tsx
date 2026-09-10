"use client";

export function ListeningResultFeedback({ title, items }: { title: string; items: string[] }) {
    return (
        <div>
            <p className="text-xs font-black text-slate-400">{title}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {items.map((item) => <li key={item}>{item}</li>)}
            </ul>
        </div>
    );
}
