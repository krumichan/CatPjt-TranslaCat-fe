"use client";

import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type AppSelectAccent = "blue" | "orange";

export interface AppSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    accent?: AppSelectAccent;
}

const ACCENT_CLASS_NAMES: Record<AppSelectAccent, string> = {
    blue: [
        "focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200",
        "dark:focus:bg-black/40 dark:focus:ring-blue-500/20",
    ].join(" "),
    orange: [
        "focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200",
        "dark:focus:bg-black/40 dark:focus:ring-orange-500/20",
    ].join(" "),
};

export const AppSelect = forwardRef<HTMLSelectElement, AppSelectProps>(
    function AppSelect(
        {
            accent = "blue",
            className,
            children,
            ...props
        },
        ref,
    ) {
        return (
            <select
                {...props}
                ref={ref}
                className={cn(
                    "w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3",
                    "text-sm text-gray-800 outline-none transition",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    "dark:border-white/10 dark:bg-black/30 dark:text-white dark:scheme-dark",
                    "[&>option]:bg-white [&>option]:text-gray-800",
                    "dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white",
                    ACCENT_CLASS_NAMES[accent],
                    className,
                )}
            >
                {children}
            </select>
        );
    },
);
