"use client";

import { AlertCircle, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function ChatMemberProfileStateDialog({
    isLoading,
    hasError,
    loadingText,
    errorTitle,
    retryLabel,
    closeLabel,
    onRetry,
    onClose,
}: {
    isLoading: boolean;
    hasError: boolean;
    loadingText: string;
    errorTitle: string;
    retryLabel: string;
    closeLabel: string;
    onRetry: () => Promise<boolean>;
    onClose: () => void;
}) {
    const closeButtonRef =
        useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const focusTimer = window.setTimeout(() => {
            closeButtonRef.current?.focus();
        }, 0);

        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            window.clearTimeout(focusTimer);
            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [onClose]);

    if (typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-1200 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
            onMouseDown={onClose}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="chat-member-profile-state-title"
                className="relative w-full max-w-sm rounded-3xl border border-white/20 bg-white p-6 text-center shadow-2xl dark:border-white/10 dark:bg-slate-950"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    aria-label={closeLabel}
                    className="absolute right-3 top-3 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-white/10 dark:hover:text-white"
                >
                    <X
                        className="h-4 w-4"
                        aria-hidden="true"
                    />
                </button>

                {isLoading ? (
                    <>
                        <Loader2
                            className="mx-auto h-9 w-9 animate-spin text-orange-500"
                            aria-hidden="true"
                        />
                        <h2
                            id="chat-member-profile-state-title"
                            className="mt-4 text-base font-black text-slate-900 dark:text-white"
                        >
                            {loadingText}
                        </h2>
                    </>
                ) : (
                    <>
                        <AlertCircle
                            className="mx-auto h-9 w-9 text-rose-500"
                            aria-hidden="true"
                        />
                        <h2
                            id="chat-member-profile-state-title"
                            className="mt-4 text-lg font-black text-slate-900 dark:text-white"
                        >
                            {errorTitle}
                        </h2>

                        {hasError && (
                            <button
                                type="button"
                                onClick={() =>
                                    void onRetry()
                                }
                                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:text-slate-950"
                            >
                                <RefreshCw
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                                {retryLabel}
                            </button>
                        )}
                    </>
                )}
            </section>
        </div>,
        document.body,
    );
}
