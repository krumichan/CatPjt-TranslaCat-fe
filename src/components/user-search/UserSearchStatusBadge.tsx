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

type StatusConfig = {
    icon: typeof UserRound;
    className: string;
};

interface UserSearchStatusBadgeProps {
    /**
     * 기존 prop.
     */
    status?: UserSearchFriendStatus;
    /**
     * 일부 호출부에서 friendStatus 이름으로 넘겨도 깨지지 않도록 허용한다.
     * 신규 호출부는 status 사용을 권장한다.
     */
    friendStatus?: UserSearchFriendStatus;
}

const STATUS_CONFIG: Record<UserSearchFriendStatus, StatusConfig> = {
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

function resolveStatus(
    status?: UserSearchFriendStatus,
    friendStatus?: UserSearchFriendStatus,
): UserSearchFriendStatus {
    return status ?? friendStatus ?? "NONE";
}

export default function UserSearchStatusBadge({
    status,
    friendStatus,
}: UserSearchStatusBadgeProps) {
    const t = useTranslations("Social.userSearchPage.status");
    const resolvedStatus = resolveStatus(status, friendStatus);
    const config = STATUS_CONFIG[resolvedStatus];
    const Icon = config.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${config.className}`}
        >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {t(resolvedStatus)}
        </span>
    );
}
