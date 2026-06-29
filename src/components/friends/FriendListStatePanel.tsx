"use client";

import { AlertCircle, Loader2, SearchX } from "lucide-react";
import type React from "react";

type FriendListStatePanelVariant = "loading" | "error" | "empty";

type FriendListStatePanelProps = {
    variant: FriendListStatePanelVariant;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void | Promise<void>;
};

const ICONS: Record<FriendListStatePanelVariant, React.ReactNode> = {
    loading: <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />,
    error: <AlertCircle className="h-8 w-8" aria-hidden="true" />,
    empty: <SearchX className="h-8 w-8" aria-hidden="true" />,
};

export default function FriendListStatePanel({
    variant,
    title,
    description,
    actionLabel,
    onAction,
}: FriendListStatePanelProps) {
    const isError = variant === "error";

    return (
        <div
            className={`rounded-4xl px-5 py-12 text-center ${
                isError
                    ? "border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                    : "border border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            }`}
        >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-current shadow-sm dark:bg-slate-950">
                {ICONS[variant]}
            </div>
            <h3
                className={`mt-5 text-xl font-black ${
                    isError
                        ? "text-rose-600 dark:text-rose-200"
                        : "text-slate-950 dark:text-white"
                }`}
            >
                {title}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6">
                {description}
            </p>
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
