import { DoorOpen, ShieldAlert, ShieldCheck, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ChatNotificationActivityItem } from "@/types/chatNotification";

const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));

const getPayloadString = (
    payload: Record<string, unknown>,
    key: string,
): string | null => {
    const value = payload[key];
    return typeof value === "string" && value.trim() ? value : null;
};

const getIcon = (type: ChatNotificationActivityItem["notificationType"]) => {
    const className = "h-5 w-5";

    switch (type) {
        case "CHAT_INVITATION":
            return <UserPlus className={className} aria-hidden="true" />;
        case "OPEN_CHAT_KICKED":
            return <ShieldAlert className={className} aria-hidden="true" />;
        case "OPEN_CHAT_ROLE_CHANGED":
            return <ShieldCheck className={className} aria-hidden="true" />;
        case "OPEN_CHAT_ROOM_CLOSED":
            return <DoorOpen className={className} aria-hidden="true" />;
    }
};

export default function ChatActivityNotificationItem({
    item,
}: {
    item: ChatNotificationActivityItem;
}) {
    const t = useTranslations("Notifications.activity");
    const roomName = getPayloadString(item.payload, "roomName") ?? t("unknownRoom");
    const newRole = getPayloadString(item.payload, "newRole") ?? "MEMBER";
    const reason = getPayloadString(item.payload, "reason");

    const description = (() => {
        switch (item.notificationType) {
            case "CHAT_INVITATION":
                return t("chatInvitation", { roomName });
            case "OPEN_CHAT_KICKED":
                return reason
                    ? t("openChatKickedWithReason", { roomName, reason })
                    : t("openChatKicked", { roomName });
            case "OPEN_CHAT_ROLE_CHANGED":
                return t("openChatRoleChanged", { roomName, role: newRole });
            case "OPEN_CHAT_ROOM_CLOSED":
                return t("openChatRoomClosed", { roomName });
        }
    })();

    return (
        <article
            data-testid={`chat-activity-notification-${item.id}`}
            className={`rounded-3xl border p-4 shadow-sm ${
                item.isRead
                    ? "border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
                    : "border-orange-200 bg-orange-50/60 dark:border-orange-900/60 dark:bg-orange-950/20"
            }`}
        >
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200">
                    {getIcon(item.notificationType)}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold leading-5 text-slate-800 dark:text-slate-100">
                            {description}
                        </p>
                        {!item.isRead && (
                            <span
                                className="h-2 w-2 shrink-0 rounded-full bg-orange-500"
                                aria-label={t("unread")}
                            />
                        )}
                    </div>
                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        {formatDateTime(item.createdAt)}
                    </p>
                </div>
            </div>
        </article>
    );
}
