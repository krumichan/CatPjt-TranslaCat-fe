"use client";

import { AlertCircle } from "lucide-react";

interface ChatRoomErrorStateProps {
    title: string;
    message: string;
    retryLabel: string;
    onRetry: () => void;
}

export function ChatRoomErrorState({
    title,
    message,
    retryLabel,
    onRetry,
}: ChatRoomErrorStateProps) {
    return (
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-center justify-center px-4 text-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                {title}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {message}
            </p>
            <button
                type="button"
                onClick={onRetry}
                className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
                {retryLabel}
            </button>
        </div>
    );
}
