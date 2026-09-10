"use client";

import type React from "react";

type FilterChipProps = {
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
    activeClassName?: string;
    inactiveClassName?: string;
};

export function InvitationFilterChip({
    label,
    count,
    isActive,
    onClick,
    icon,
    activeClassName = "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950",
    inactiveClassName = "border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10",
}: FilterChipProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black transition ${
                isActive ? activeClassName : inactiveClassName
            }`}
        >
            {icon}
            {label}
            <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    isActive
                        ? "bg-black/15 text-current dark:bg-white/20"
                        : "bg-slate-100 text-current dark:bg-white/10"
                }`}
            >
                {count}
            </span>
        </button>
    );
}
