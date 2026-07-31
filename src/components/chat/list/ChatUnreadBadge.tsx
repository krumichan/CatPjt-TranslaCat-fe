"use client";

import { useTranslations } from "next-intl";

interface ChatUnreadBadgeProps {
    count: number;
    roomId: number;
}

const formatUnreadCount = (count: number) =>
    count >= 100 ? "99+" : String(count);

export function ChatUnreadBadge({
    count,
    roomId,
}: ChatUnreadBadgeProps) {
    const t = useTranslations("ChatRoomList.unread");

    if (count <= 0) {
        return null;
    }

    return (
        <span
            role="status"
            aria-label={t("ariaLabel", { count })}
            data-testid={`chat-room-unread-badge-${roomId}`}
            className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold leading-5 text-white shadow-sm ring-2 ring-white dark:bg-red-400 dark:text-slate-950 dark:ring-slate-900"
        >
            {formatUnreadCount(count)}
        </span>
    );
}
