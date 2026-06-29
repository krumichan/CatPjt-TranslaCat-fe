"use client";

import {
    Ban,
    CheckCircle2,
    Clock3,
    Send,
    UserCheck,
    UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { UserSearchFriendStatus } from "@/types/social";

interface UserSearchStatusBadgeProps {
    status: UserSearchFriendStatus;
}

const STATUS_CONFIG: Record<
    UserSearchFriendStatus,
    {
        icon: typeof UserRound;
        className: string;
    }
> = {
    NONE: {
        icon: UserRound,
        className:
            "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300",
    },
    FRIEND: {
        icon: UserCheck,
        className:
            "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200",
    },
    REQUEST_SENT: {
        icon: Send,
        className:
            "border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200",
    },
    REQUEST_RECEIVED: {
        icon: Clock3,
        className:
            "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200",
    },
    BLOCKED: {
        icon: Ban,
        className:
            "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200",
    },
    SELF: {
        icon: CheckCircle2,
        className:
            "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200",
    },
};

export default function UserSearchStatusBadge({
    status,
}: UserSearchStatusBadgeProps) {
    const t = useTranslations("Social.userSearchPage.status");
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;

    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${config.className}`}
        >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t(status)}
        </span>
    );
}
