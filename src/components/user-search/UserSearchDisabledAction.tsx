"use client";

import type React from "react";

interface DisabledActionProps {
    icon: React.ReactNode;
    label: string;
    danger?: boolean;
}

export function UserSearchDisabledAction({
    icon,
    label,
    danger = false,
}: DisabledActionProps) {
    return (
        <div
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black ${
                danger
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200"
                    : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
            }`}
        >
            {icon}
            {label}
        </div>
    );
}
