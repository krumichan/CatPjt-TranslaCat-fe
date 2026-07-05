import type { ReactNode } from "react";

interface StatePanelProps {
    icon: ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void | Promise<void>;
}

export default function StatePanel({
    icon,
    title,
    description,
    actionLabel,
    onAction,
}: StatePanelProps) {
    return (
        <section className="rounded-4xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:shadow-none">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                {icon}
            </div>
            <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
                {title}
            </h2>
            <p className="mx-auto mt-2 max-w-xl whitespace-pre-line text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {description}
            </p>
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={() => void onAction()}
                    className="mt-6 inline-flex items-center justify-center rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600"
                >
                    {actionLabel}
                </button>
            )}
        </section>
    );
}
