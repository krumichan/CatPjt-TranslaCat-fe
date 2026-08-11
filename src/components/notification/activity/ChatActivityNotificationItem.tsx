import {
    CheckCheck,
    ChevronRight,
    DoorOpen,
    ShieldAlert,
    ShieldCheck,
    UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/navigation";
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

const canNavigateToRoom = (item: ChatNotificationActivityItem) =>
    item.roomId !== null &&
    (item.notificationType === "CHAT_INVITATION" ||
        item.notificationType === "OPEN_CHAT_ROLE_CHANGED");

export default function ChatActivityNotificationItem({
    item,
    isProcessing,
    onMarkRead,
    onNavigate,
}: {
    item: ChatNotificationActivityItem;
    isProcessing: boolean;
    onMarkRead: (item: ChatNotificationActivityItem) => Promise<boolean>;
    onNavigate: () => void;
}) {
    const t = useTranslations("Notifications.activity");
    const router = useRouter();
    const roomName =
        getPayloadString(item.payload, "roomName") ?? t("unknownRoom");
    const newRole = getPayloadString(item.payload, "newRole") ?? "MEMBER";
    const reason = getPayloadString(item.payload, "reason");
    const canNavigate = canNavigateToRoom(item);
    const isActionable = !item.isRead || canNavigate;

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

    const handleClick = async () => {
        if (!isActionable || isProcessing) {
            return;
        }

        const succeeded = await onMarkRead(item);
        if (!succeeded) {
            return;
        }

        if (canNavigate && item.roomId !== null) {
            router.push(`/chat/rooms/${item.roomId}`);
            onNavigate();
        }
    };

    const actionLabel = canNavigate
        ? t("openRoom", { roomName })
        : item.isRead
          ? t("read")
          : t("markRead");

    return (
        <button
            type="button"
            data-testid={`chat-activity-notification-${item.id}`}
            onClick={() => void handleClick()}
            disabled={isProcessing || !isActionable}
            aria-label={actionLabel}
            className={`w-full rounded-3xl border p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 ${
                item.isRead
                    ? "border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
                    : "border-orange-200 bg-orange-50/60 hover:bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/20 dark:hover:bg-orange-950/30"
            } ${
                isActionable
                    ? "cursor-pointer"
                    : "cursor-default disabled:opacity-100"
            }`}
        >
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200">
                    {getIcon(item.notificationType)}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold leading-5 text-slate-800 dark:text-slate-100">
                            {description}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                            {!item.isRead && (
                                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                                    {t("new")}
                                </span>
                            )}
                            {isProcessing ? (
                                <span className="text-xs font-bold text-slate-400">
                                    {t("markingRead")}
                                </span>
                            ) : canNavigate ? (
                                <ChevronRight
                                    className="h-4 w-4 text-slate-400"
                                    aria-hidden="true"
                                />
                            ) : !item.isRead ? (
                                <CheckCheck
                                    className="h-4 w-4 text-slate-400"
                                    aria-hidden="true"
                                />
                            ) : null}
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        {formatDateTime(item.createdAt)}
                    </p>
                </div>
            </div>
        </button>
    );
}
