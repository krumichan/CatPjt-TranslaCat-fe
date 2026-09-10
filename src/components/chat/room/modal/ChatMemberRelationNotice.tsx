"use client";

import type { ReactNode } from "react";

export function ChatMemberRelationNotice({
    icon,
    text,
}: {
    icon: ReactNode;
    text: string;
}) {
    return (
        <div className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
            {icon}
            {text}
        </div>
    );
}
