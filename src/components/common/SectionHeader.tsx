"use client";

import React from "react";

interface SectionHeaderProps {
    title: string;
    icon?: React.ReactNode;
    children?: React.ReactNode;
}

export default function SectionHeader({ title, icon, children }: SectionHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-white/5 dark:bg-zinc-900/30 rounded-3xl border border-black/5 dark:border-white/10 backdrop-blur-xl">
            <h1 className="flex items-center gap-3 text-2xl font-black text-[#2D2D2D] dark:text-white">
                {icon && <span className="shrink-0">{icon}</span>}
                <span>{title}</span>
            </h1>
            {children}
        </div>
    );
}