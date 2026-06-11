import { ReactNode } from "react";

type FloatingActionButtonProps = {
    icon: ReactNode;
    label: string;
    isOpen: boolean;
    delay: number;
    variant?: "default" | "danger";
    onClick: () => void;
};

export default function FloatingActionButton({
    icon,
    label,
    isOpen,
    delay,
    variant = "default",
    onClick,
}: FloatingActionButtonProps) {
    const variantClassName =
        variant === "danger"
            ? "border-red-500 bg-red-500 text-white shadow-[0_8px_20px_rgba(239,68,68,0.28)] hover:border-red-600 hover:bg-red-600 hover:text-white dark:border-red-500 dark:bg-red-500 dark:text-white dark:hover:border-red-400 dark:hover:bg-red-400"
            : "border-slate-200 bg-white text-slate-500 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500 dark:border-white/10 dark:bg-zinc-900 dark:text-slate-300 dark:hover:border-orange-400 dark:hover:bg-orange-500 dark:hover:text-white";

    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            style={{
                transitionDelay: isOpen ? `${delay}ms` : "0ms",
            }}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-[0_8px_20px_rgba(15,23,42,0.18)] transition duration-200 ${
                isOpen
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-2 scale-75 opacity-0"
            } ${variantClassName}`}
        >
            {icon}
        </button>
    );
}