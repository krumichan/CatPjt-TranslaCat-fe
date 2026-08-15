"use client";

import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";

interface LanguageLearningStateCardProps {
    title: string;
    message: string;
    variant?: "loading" | "error" | "info";
    actionLabel?: string;
    onAction?: () => void;
}

export function LanguageLearningStateCard({
    title,
    message,
    variant = "info",
    actionLabel,
    onAction,
}: LanguageLearningStateCardProps) {
    const Icon = variant === "loading" ? LoaderCircle : AlertTriangle;

    return (
        <section
            role={variant === "error" ? "alert" : "status"}
            className="rounded-3xl border border-slate-200 bg-white/90 p-6 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/75"
        >
            <Icon
                className={`mx-auto h-8 w-8 ${
                    variant === "loading"
                        ? "animate-spin text-blue-500"
                        : variant === "error"
                          ? "text-rose-500"
                          : "text-amber-500"
                }`}
                aria-hidden="true"
            />
            <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                {title}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {message}
            </p>
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {actionLabel}
                </button>
            )}
        </section>
    );
}
