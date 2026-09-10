"use client";

import type React from "react";

interface StateCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    danger?: boolean;
}

export function UserSearchStateCard({
    icon,
    title,
    description,
    danger = false,
}: StateCardProps) {
    return (
        <div
            className={`rounded-4xl border p-8 text-center ${
                danger
                    ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            }`}
        >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
                {icon}
            </div>
            <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
                {title}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6">
                {description}
            </p>
        </div>
    );
}
