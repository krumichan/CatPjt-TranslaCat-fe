import { useTranslations } from "next-intl";

import ChatNotificationItem from "@/components/notification/chat/ChatNotificationItem";
import NotificationEmptyState from "@/components/notification/NotificationEmptyState";
import type { ChatNotificationChatItem } from "@/types/chatNotification";

export default function ChatNotificationPanel({
    items,
    isLoading,
    error,
    processingChatRoomId,
    onMarkRead,
    onNavigate,
}: {
    items: ChatNotificationChatItem[];
    isLoading: boolean;
    error: unknown;
    processingChatRoomId: number | null;
    onMarkRead: (item: ChatNotificationChatItem) => void;
    onNavigate: () => void;
}) {
    const t = useTranslations("Notifications");

    if (isLoading && items.length === 0) {
        return (
            <p className="py-10 text-center text-sm text-slate-500">
                {t("messages.loading")}
            </p>
        );
    }

    if (error && items.length === 0) {
        return (
            <NotificationEmptyState
                title={t("chat.loadFailedTitle")}
                description={t("messages.loadFailed")}
            />
        );
    }

    if (items.length === 0) {
        return (
            <NotificationEmptyState
                title={t("chat.emptyTitle")}
                description={t("chat.emptyDescription")}
            />
        );
    }

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <ChatNotificationItem
                    key={item.roomId}
                    item={item}
                    isMarkingRead={processingChatRoomId === item.roomId}
                    onMarkRead={onMarkRead}
                    onNavigate={onNavigate}
                />
            ))}
        </div>
    );
}
