"use client";

import { Globe2, MessageCircle, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ChatNotificationChatItem as ChatNotificationChatItemType } from "@/types/chatNotification";

const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));

const RoomFallbackIcon = ({ roomType }: { roomType: ChatNotificationChatItemType["roomType"] }) => {
    const className = "h-5 w-5";

    if (roomType === "OPEN") {
        return <Globe2 className={className} aria-hidden="true" />;
    }

    if (roomType === "GROUP") {
        return <Users className={className} aria-hidden="true" />;
    }

    return <MessageCircle className={className} aria-hidden="true" />;
};

export default function ChatNotificationItem({
    item,
}: {
    item: ChatNotificationChatItemType;
}) {
    const t = useTranslations("Notifications.chat");
    const hasAvatar = Boolean(item.roomAvatarUrl?.trim());
    const senderName = item.latestMessage.senderDisplayName?.trim();

    return (
        <article
            data-testid={`chat-notification-room-${item.roomId}`}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
        >
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300">
                    {hasAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={item.roomAvatarUrl ?? ""}
                            alt={item.roomDisplayName}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <RoomFallbackIcon roomType={item.roomType} />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <h3 className="truncate text-sm font-black text-slate-950 dark:text-white">
                            {item.roomDisplayName}
                        </h3>
                        <span
                            className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-black text-white"
                            aria-label={t("unreadCount", { count: item.unreadCount })}
                        >
                            {item.unreadCount > 99 ? "99+" : item.unreadCount}
                        </span>
                    </div>

                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
                        {senderName ? (
                            <span className="font-bold text-slate-800 dark:text-slate-100">
                                {senderName}: {" "}
                            </span>
                        ) : null}
                        {item.latestMessage.contentPreview || t("messageFallback")}
                    </p>

                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        {formatDateTime(item.latestMessage.createdAt)}
                    </p>
                </div>
            </div>
        </article>
    );
}
