import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import ChatActivityNotificationItem from "@/components/notification/activity/ChatActivityNotificationItem";
import NotificationEmptyState from "@/components/notification/NotificationEmptyState";
import SupportNotificationItem from "@/components/notification/activity/SupportNotificationItem";
import type { useSupportNotifications } from "@/hooks/support/useSupportNotifications";
import { Link } from "@/navigation";
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
    supportNotification,
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
    supportNotification: ReturnType<typeof useSupportNotifications>;
}) {
    const t = useTranslations("Notifications");

    // 기존 활동 탭 안에서 출처별 내용을 유지하면서 발생 시간순으로 합친다.
    const activities = [
        ...items.map((item) => ({ source: "chat" as const, item })),
        ...supportNotification.items.map((item) => ({
            source: "support" as const,
            item,
        })),
    ].sort((left, right) =>
        right.item.createdAt.localeCompare(left.item.createdAt),
    );
    const combinedUnreadCount = unreadCount + supportNotification.unreadCount;
    const processingAll = isProcessingAll || supportNotification.isProcessingAll;
    const hasError = Boolean(error || supportNotification.error);

    if (
        (isLoading || supportNotification.isLoading) &&
        activities.length === 0
    ) {
        return (
            <p className="py-10 text-center text-sm text-slate-500">
                {t("messages.loading")}
            </p>
        );
    }

    if (hasError && activities.length === 0) {
        return (
            <NotificationEmptyState
                title={t("activity.loadFailedTitle")}
                description={t("messages.loadFailed")}
            />
        );
    }

    if (activities.length === 0) {
        return (
            <NotificationEmptyState
                title={t("activity.emptyTitle")}
                description={t("activity.emptyDescription")}
            />
        );
    }

    return (
        <div className="space-y-3">
            {hasError && (
                <p role="status" className="text-sm text-amber-700 dark:text-amber-300">
                    {t("support.partialLoadFailed")}
                </p>
            )}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => void onMarkAllRead()}
                    disabled={
                        combinedUnreadCount <= 0 ||
                        processingAll ||
                        processingActivityId !== null
                    }
                    data-testid="chat-activity-mark-all-read"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:border-orange-900/60 dark:hover:bg-orange-950/30 dark:hover:text-orange-300"
                >
                    <CheckCheck className="h-4 w-4" aria-hidden="true" />
                    {processingAll
                        ? t("activity.markingAllRead")
                        : t("activity.markAllRead")}
                </button>
            </div>

            {activities.map((activity) => (
                activity.source === "support" ? (
                    <SupportNotificationItem
                        key={`support-${activity.item.id}`}
                        item={activity.item}
                        onNavigate={onNavigate}
                    />
                ) : (
                    <ChatActivityNotificationItem
                        key={`chat-${activity.item.id}`}
                        item={activity.item}
                        isProcessing={
                            processingActivityId === activity.item.id ||
                            processingAll
                        }
                        onMarkRead={onMarkRead}
                        onNavigate={onNavigate}
                    />
                )
            ))}

            {supportNotification.hasMore && (
                <Link
                    href="/support"
                    onClick={onNavigate}
                    className="block py-3 text-center text-sm font-semibold text-orange-700 dark:text-orange-300"
                >
                    {t("support.viewAll")}
                </Link>
            )}
        </div>
    );
}
