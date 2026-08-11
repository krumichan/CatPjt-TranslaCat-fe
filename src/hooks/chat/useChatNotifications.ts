"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useChatRoomsRealtime } from "@/hooks/chat/useChatRoomsRealtime";
import { useQuery } from "@/hooks/useQuery";
import { chatNotificationService } from "@/services/chat/chatNotificationService";
import { chatService } from "@/services/chat/chatService";
import type { ChatMessage } from "@/types/chat";
import type {
    ChatNotificationActivityListResponse,
    ChatNotificationChatItem,
    ChatNotificationChatListResponse,
    ChatNotificationSummary,
} from "@/types/chatNotification";
import type { ChatReadUpdatedEvent } from "@/types/chatWebSocket";

const CHAT_NOTIFICATION_QUERY_CONFIG = {
    revalidateOnMount: true,
    revalidateIfStale: true,
    revalidateOnFocus: true,
    refreshInterval: 30000,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    dedupingInterval: 5000,
};

const CHAT_NOTIFICATION_ROOM_QUERY_CONFIG = {
    ...CHAT_NOTIFICATION_QUERY_CONFIG,
    refreshInterval: 60000,
};

const REALTIME_REFRESH_DEBOUNCE_MS = 120;

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

const normalizeEmail = (email: string | null | undefined) =>
    email?.trim().toLowerCase() ?? null;

export function useChatNotifications() {
    const { data: session } = useSession();
    const [processingChatRoomId, setProcessingChatRoomId] = useState<
        number | null
    >(null);
    const realtimeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

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

    const {
        data: roomDirectory,
        mutate: mutateRoomDirectory,
    } = useQuery({
        keys: ["chat-notification-room-directory"] as const,
        fetcher: () => chatService.getRooms(),
        config: CHAT_NOTIFICATION_ROOM_QUERY_CONFIG,
    });

    const roomIds = useMemo(
        () => roomDirectory?.chatRooms.map((room) => room.id) ?? [],
        [roomDirectory],
    );
    const currentUserEmail = normalizeEmail(session?.user?.email);

    const refreshChatProjection = useCallback(async () => {
        await Promise.all([
            mutateSummary((currentData) => currentData, true),
            mutateChatList((currentData) => currentData, true),
        ]);
    }, [mutateChatList, mutateSummary]);

    const scheduleRealtimeRefresh = useCallback(() => {
        if (realtimeRefreshTimerRef.current !== null) {
            return;
        }

        realtimeRefreshTimerRef.current = setTimeout(() => {
            realtimeRefreshTimerRef.current = null;
            void refreshChatProjection();
        }, REALTIME_REFRESH_DEBOUNCE_MS);
    }, [refreshChatProjection]);

    const handleMessageCreated = useCallback(
        (message: ChatMessage) => {
            const isSystemMessage =
                message.senderType === "SYSTEM" ||
                message.messageType === "SYSTEM";
            const isCurrentUserMessage =
                message.senderType === "USER" &&
                currentUserEmail !== null &&
                normalizeEmail(message.senderEmail) === currentUserEmail;

            if (isSystemMessage || isCurrentUserMessage) {
                return;
            }

            scheduleRealtimeRefresh();
        },
        [currentUserEmail, scheduleRealtimeRefresh],
    );

    const handleReadUpdated = useCallback(
        (_event: ChatReadUpdatedEvent) => {
            scheduleRealtimeRefresh();
        },
        [scheduleRealtimeRefresh],
    );

    useChatRoomsRealtime({
        roomIds,
        accessToken: session?.accessToken ?? null,
        onMessageCreated: handleMessageCreated,
        onReadUpdated: handleReadUpdated,
        onReconnectSyncRequested: refreshChatProjection,
    });

    useEffect(() => {
        return () => {
            if (realtimeRefreshTimerRef.current !== null) {
                clearTimeout(realtimeRefreshTimerRef.current);
            }
        };
    }, []);

    const markChatRoomAsRead = useCallback(
        async (item: ChatNotificationChatItem): Promise<boolean> => {
            if (processingChatRoomId !== null) {
                return false;
            }

            setProcessingChatRoomId(item.roomId);

            try {
                const response = await chatService.markRoomAsRead(item.roomId, {
                    lastReadMessageId: item.latestMessage.id,
                });
                const nextUnreadCount = Math.max(0, response.unreadCount);
                const removedUnreadCount = Math.max(
                    0,
                    item.unreadCount - nextUnreadCount,
                );

                await Promise.all([
                    mutateChatList((currentData) => {
                        if (!currentData) {
                            return currentData;
                        }

                        if (nextUnreadCount === 0) {
                            return {
                                ...currentData,
                                items: currentData.items.filter(
                                    (currentItem) =>
                                        currentItem.roomId !== item.roomId,
                                ),
                            };
                        }

                        return {
                            ...currentData,
                            items: currentData.items.map((currentItem) =>
                                currentItem.roomId === item.roomId
                                    ? {
                                          ...currentItem,
                                          unreadCount: nextUnreadCount,
                                      }
                                    : currentItem,
                            ),
                        };
                    }, false),
                    mutateSummary((currentData) => {
                        if (!currentData) {
                            return currentData;
                        }

                        const nextUnreadChatMessageCount = Math.max(
                            0,
                            currentData.unreadChatMessageCount -
                                removedUnreadCount,
                        );
                        const nextUnreadChatRoomCount = Math.max(
                            0,
                            currentData.unreadChatRoomCount -
                                (item.unreadCount > 0 && nextUnreadCount === 0
                                    ? 1
                                    : 0),
                        );

                        return {
                            ...currentData,
                            unreadChatMessageCount: nextUnreadChatMessageCount,
                            unreadChatRoomCount: nextUnreadChatRoomCount,
                            totalAttentionCount:
                                nextUnreadChatMessageCount +
                                currentData.unreadActivityCount,
                        };
                    }, false),
                ]);

                return true;
            } catch (error) {
                console.error(
                    "Failed to mark notification chat room as read.",
                    error,
                );
                return false;
            } finally {
                setProcessingChatRoomId(null);
            }
        },
        [mutateChatList, mutateSummary, processingChatRoomId],
    );

    const refresh = useCallback(async () => {
        await Promise.all([
            mutateSummary((currentData) => currentData, true),
            mutateChatList((currentData) => currentData, true),
            mutateActivityList((currentData) => currentData, true),
            mutateRoomDirectory((currentData) => currentData, true),
        ]);
    }, [
        mutateActivityList,
        mutateChatList,
        mutateRoomDirectory,
        mutateSummary,
    ]);

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
        processingChatRoomId,
        markChatRoomAsRead,
        mutateSummary,
        mutateChatList,
        mutateActivityList,
        refresh,
    };
}
