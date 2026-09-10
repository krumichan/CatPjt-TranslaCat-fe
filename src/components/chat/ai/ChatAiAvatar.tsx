"use client";

import type { ChatAiMember } from "@/types/chat";
import { UserRound } from "lucide-react";

export function ChatAiAvatar({ member }: { member: ChatAiMember }) {
    return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 text-violet-500 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200">
            {member.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.profileImageUrl} alt={member.nickname} className="h-full w-full object-cover" />
            ) : (
                <UserRound className="h-5 w-5" aria-hidden="true" />
            )}
        </div>
    );
}
