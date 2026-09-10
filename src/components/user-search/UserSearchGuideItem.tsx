"use client";

import type React from "react";

interface GuideItemProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

export function UserSearchGuideItem({ icon, title, description }: GuideItemProps) {
    return (
        <div className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-200">
                {icon}
            </div>
            <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">
                    {title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">
                    {description}
                </p>
            </div>
        </div>
    );
}
