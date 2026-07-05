import type { ReactNode } from "react";

type FeedbackMessageVariant = "error" | "success" | "warning" | "info";

interface FeedbackMessageProps {
    children: ReactNode;
    variant?: FeedbackMessageVariant;
    className?: string;
    role?: "alert" | "status" | "note";
}

const VARIANT_CLASS_NAMES: Record<FeedbackMessageVariant, string> = {
    error: "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200",
    success:
        "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200",
    warning:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200",
    info: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200",
};

const DEFAULT_ROLE_BY_VARIANT: Record<FeedbackMessageVariant, "alert" | "status" | "note"> = {
    error: "alert",
    success: "status",
    warning: "alert",
    info: "note",
};

export default function FeedbackMessage({
    children,
    variant = "info",
    className = "",
    role,
}: FeedbackMessageProps) {
    const roleValue = role ?? DEFAULT_ROLE_BY_VARIANT[variant];

    return (
        <p
            role={roleValue}
            className={`rounded-2xl border px-4 py-3 text-sm font-bold whitespace-pre-line ${VARIANT_CLASS_NAMES[variant]} ${className}`.trim()}
        >
            {children}
        </p>
    );
}
