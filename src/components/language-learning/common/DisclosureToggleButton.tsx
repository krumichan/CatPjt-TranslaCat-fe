"use client";

import { ChevronDown } from "lucide-react";

export function DisclosureToggleButton({
    isOpen,
    onToggle,
    expandLabel,
    collapseLabel,
    controls,
    compact = false,
}: {
    isOpen: boolean;
    onToggle: () => void;
    expandLabel: string;
    collapseLabel: string;
    controls?: string;
    compact?: boolean;
}) {
    return (
        <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={controls}
            onClick={onToggle}
            className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white font-black text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 ${
                compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
            }`}
        >
            <span>{isOpen ? collapseLabel : expandLabel}</span>
            <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
            />
        </button>
    );
}
