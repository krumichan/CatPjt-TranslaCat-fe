import { useTranslations } from "next-intl";

import ChatActivityNotificationItem from "@/components/notification/activity/ChatActivityNotificationItem";
import NotificationEmptyState from "@/components/notification/NotificationEmptyState";
import type { ChatNotificationActivityItem } from "@/types/chatNotification";

export default function ChatActivityNotificationPanel({
    items,
    isLoading,
    error,
}: {
    items: ChatNotificationActivityItem[];
    isLoading: boolean;
    error: unknown;
}) {
    const t = useTranslations("Notifications");

    if (isLoading && items.length === 0) {
        return <p className="py-10 text-center text-sm text-slate-500">{t("messages.loading")}</p>;
    }

    if (error && items.length === 0) {
        return (
            <NotificationEmptyState
                title={t("activity.loadFailedTitle")}
                description={t("messages.loadFailed")}
            />
        );
    }

    if (items.length === 0) {
        return (
            <NotificationEmptyState
                title={t("activity.emptyTitle")}
                description={t("activity.emptyDescription")}
            />
        );
    }

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <ChatActivityNotificationItem key={item.id} item={item} />
            ))}
        </div>
    );
}
