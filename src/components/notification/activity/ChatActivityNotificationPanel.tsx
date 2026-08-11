import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import ChatActivityNotificationItem from "@/components/notification/activity/ChatActivityNotificationItem";
import NotificationEmptyState from "@/components/notification/NotificationEmptyState";
import type { ChatNotificationActivityItem } from "@/types/chatNotification";

export default function ChatActivityNotificationPanel({
    items,
    unreadCount,
    isLoading,
    error,
    processingActivityId,
    isProcessingAll,
    onMarkRead,
    onMarkAllRead,
    onNavigate,
}: {
    items: ChatNotificationActivityItem[];
    unreadCount: number;
    isLoading: boolean;
    error: unknown;
    processingActivityId: number | null;
    isProcessingAll: boolean;
    onMarkRead: (item: ChatNotificationActivityItem) => Promise<boolean>;
    onMarkAllRead: () => Promise<boolean>;
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
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => void onMarkAllRead()}
                    disabled={unreadCount <= 0 || isProcessingAll}
                    data-testid="chat-activity-mark-all-read"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:border-orange-900/60 dark:hover:bg-orange-950/30 dark:hover:text-orange-300"
                >
                    <CheckCheck className="h-4 w-4" aria-hidden="true" />
                    {isProcessingAll
                        ? t("activity.markingAllRead")
                        : t("activity.markAllRead")}
                </button>
            </div>

            {items.map((item) => (
                <ChatActivityNotificationItem
                    key={item.id}
                    item={item}
                    isProcessing={processingActivityId === item.id}
                    onMarkRead={onMarkRead}
                    onNavigate={onNavigate}
                />
            ))}
        </div>
    );
}
