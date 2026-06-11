import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

type ConfirmModalVariant = "default" | "danger";

type ConfirmModalProps = {
    isOpen: boolean;
    title: string;
    description?: string;
    children?: ReactNode;
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

    const isLoading = externalLoading || isSubmitting;

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isLoading) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, isLoading, onClose]);

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
        <div className="fixed inset-0 z-9999 overflow-y-auto px-4 py-20">
            <button
                type="button"
                aria-label={t("close")}
                onClick={handleBackdropClick}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <div className="relative z-10 mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                            {title}
                        </p>

                        {description && (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500 dark:text-slate-400">
                                {description}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {children && (
                    <div className="mb-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-black/20 dark:text-slate-300">
                        {children}
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                        {cancelLabel ?? t("cancel")}
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700 ${confirmButtonClassName}`}
                    >
                        {isLoading
                            ? t("processing")
                            : confirmLabel ?? t("confirm")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}