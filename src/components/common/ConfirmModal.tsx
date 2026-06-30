"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, X } from "lucide-react";
import { useTranslations } from "next-intl";

type ConfirmModalVariant = "default" | "danger";

type ConfirmModalProps = {
    isOpen: boolean;
    title: string;
    description?: string;
    children?: ReactNode;
    helpMessage?: ReactNode;
    helpButtonLabel?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmModalVariant;
    isLoading?: boolean;
    closeOnBackdrop?: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
};

export default function ConfirmModal({
    isOpen,
    title,
    description,
    children,
    helpMessage,
    helpButtonLabel,
    confirmLabel,
    cancelLabel,
    variant = "default",
    isLoading: externalLoading = false,
    closeOnBackdrop = true,
    onClose,
    onConfirm,
}: ConfirmModalProps) {
    const t = useTranslations("Common.confirmModal");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const isLoading = externalLoading || isSubmitting;
    const hasHelp = Boolean(helpMessage);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isLoading) {
                if (isHelpOpen) {
                    setIsHelpOpen(false);
                    return;
                }

                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isHelpOpen, isLoading, isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) {
            setIsHelpOpen(false);
        }
    }, [isOpen]);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    const confirmButtonClassName =
        variant === "danger"
            ? "bg-red-500 hover:bg-red-600 shadow-[0_10px_20px_rgba(239,68,68,0.25)]"
            : "bg-orange-500 hover:bg-orange-600 shadow-[0_10px_20px_rgba(249,115,22,0.28)]";

    const handleConfirm = async () => {
        if (isLoading) {
            return;
        }

        try {
            setIsSubmitting(true);
            await onConfirm();
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackdropClick = () => {
        if (!closeOnBackdrop || isLoading) {
            return;
        }

        onClose();
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm dark:bg-black/60"
            role="presentation"
            onClick={handleBackdropClick}
        >
            <section
                role="dialog"
                aria-modal="true"
                className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-white"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-4 p-5">
                    <div className="min-w-0">
                        <h2 className="text-xl font-black text-slate-950 dark:text-white">
                            {title}
                        </h2>

                        {description && (
                            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                {description}
                            </p>
                        )}
                    </div>

                    <div className="flex shrink-0 gap-1">
                        {hasHelp && (
                            <button
                                type="button"
                                onClick={() =>
                                    setIsHelpOpen((current) => !current)
                                }
                                aria-label={helpButtonLabel ?? "Help"}
                                aria-pressed={isHelpOpen}
                                disabled={isLoading}
                                className={`rounded-full p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                    isHelpOpen
                                        ? "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-200"
                                        : "text-slate-400 hover:bg-slate-100 hover:text-orange-500 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-orange-200"
                                }`}
                            >
                                <CircleHelp
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={t("close")}
                            disabled={isLoading}
                            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                </header>

                <div className="space-y-4 border-t border-slate-200 p-5 dark:border-white/10">
                    {isHelpOpen && hasHelp && (
                        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold leading-6 text-orange-700 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200">
                            {helpMessage}
                        </div>
                    )}

                    {children && <div>{children}</div>}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                        >
                            {cancelLabel ?? t("cancel")}
                        </button>

                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className={`rounded-2xl px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700 ${confirmButtonClassName}`}
                        >
                            {isLoading ? t("processing") : confirmLabel ?? t("confirm")}
                        </button>
                    </div>
                </div>
            </section>
        </div>,
        document.body,
    );
}
