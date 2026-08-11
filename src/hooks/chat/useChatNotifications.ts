"use client";

import { useQuery } from "@/hooks/useQuery";
import { chatNotificationService } from "@/services/chat/chatNotificationService";
import type {
    ChatNotificationActivityListResponse,
    ChatNotificationChatListResponse,
    ChatNotificationSummary,
} from "@/types/chatNotification";

const CHAT_NOTIFICATION_QUERY_CONFIG = {
    revalidateOnMount: true,
    revalidateIfStale: true,
    revalidateOnFocus: true,
    refreshInterval: 30000,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    dedupingInterval: 5000,
};

const EMPTY_SUMMARY: ChatNotificationSummary = {
    unreadChatMessageCount: 0,
    unreadChatRoomCount: 0,
    unreadActivityCount: 0,
    totalAttentionCount: 0,
};

const EMPTY_CHAT_LIST: ChatNotificationChatListResponse = {
    items: [],
    nextCursorMessageId: null,
    hasNext: false,
};

const EMPTY_ACTIVITY_LIST: ChatNotificationActivityListResponse = {
    items: [],
    nextCursorId: null,
    hasNext: false,
};

export function useChatNotifications() {
    const {
        data: summary = EMPTY_SUMMARY,
        isLoading: isSummaryLoading,
        isError: summaryError,
        mutate: mutateSummary,
    } = useQuery({
        keys: ["chat-notification-summary"] as const,
        fetcher: () => chatNotificationService.getSummary(),
        config: CHAT_NOTIFICATION_QUERY_CONFIG,
    });

    const {
        data: chatList = EMPTY_CHAT_LIST,
        isLoading: isChatListLoading,
        isError: chatListError,
        mutate: mutateChatList,
    } = useQuery({
        keys: ["chat-notification-chats"] as const,
        fetcher: () => chatNotificationService.getChats(),
        config: CHAT_NOTIFICATION_QUERY_CONFIG,
    });

    const {
        data: activityList = EMPTY_ACTIVITY_LIST,
        isLoading: isActivityListLoading,
        isError: activityListError,
        mutate: mutateActivityList,
    } = useQuery({
        keys: ["chat-notification-activities"] as const,
        fetcher: () => chatNotificationService.getActivities(),
        config: CHAT_NOTIFICATION_QUERY_CONFIG,
    });

    const refresh = async () => {
        await Promise.all([
            mutateSummary((currentData) => currentData, true),
            mutateChatList((currentData) => currentData, true),
            mutateActivityList((currentData) => currentData, true),
        ]);
    };

    return {
        summary,
        chatList,
        activityList,
        isSummaryLoading,
        isChatListLoading,
        isActivityListLoading,
        summaryError,
        chatListError,
        activityListError,
        mutateSummary,
        mutateChatList,
        mutateActivityList,
        refresh,
    };
}
