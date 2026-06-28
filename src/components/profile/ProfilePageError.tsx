"use client";

import { RefreshCw } from "lucide-react";

interface ProfilePageErrorProps {
    title: string;
    description: string;
    retryLabel: string;
    onRetry: () => void;
}

export default function ProfilePageError({
    title,
    description,
    retryLabel,
    onRetry,
}: ProfilePageErrorProps) {
    return (
        <section className="rounded-4xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-400/30 dark:bg-rose-500/10">
            <h2 className="text-xl font-black text-rose-700 dark:text-rose-200">
                {title}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-rose-600 dark:text-rose-100">
                {description}
            </p>
            <button
                type="button"
                onClick={onRetry}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-rose-700 dark:bg-rose-300 dark:text-rose-950 dark:hover:bg-rose-200"
            >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {retryLabel}
            </button>
        </section>
    );
}
