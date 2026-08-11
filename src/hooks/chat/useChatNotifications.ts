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
const MAX_SEEN_ACTIVITY_NOTIFICATION_IDS = 500;

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
    const [processingActivityId, setProcessingActivityId] = useState<
        number | null
    >(null);
    const [isProcessingAllActivities, setIsProcessingAllActivities] =
        useState(false);
    const realtimeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const seenActivityNotificationIdsRef = useRef(new Set<number>());

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

    const handleNotificationCreated = useCallback(
        (notification: ChatNotificationActivityListResponse["items"][number]) => {
            const seenIds = seenActivityNotificationIdsRef.current;
            if (seenIds.has(notification.id)) {
                return;
            }

            seenIds.add(notification.id);
            if (seenIds.size > MAX_SEEN_ACTIVITY_NOTIFICATION_IDS) {
                const oldestId = seenIds.values().next().value;
                if (typeof oldestId === "number") {
                    seenIds.delete(oldestId);
                }
            }

            void mutateActivityList((currentData) => {
                const base = currentData ?? EMPTY_ACTIVITY_LIST;
                if (base.items.some((item) => item.id === notification.id)) {
                    return base;
                }

                return {
                    ...base,
                    items: [notification, ...base.items],
                };
            }, false);

            if (!notification.isRead) {
                void mutateSummary((currentData) => {
                    if (!currentData) {
                        return currentData;
                    }

                    const unreadActivityCount =
                        currentData.unreadActivityCount + 1;

                    return {
                        ...currentData,
                        unreadActivityCount,
                        totalAttentionCount:
                            currentData.unreadChatMessageCount +
                            unreadActivityCount,
                    };
                }, false);
            }

            // 초대/강퇴/Role 변경/Room 종료는 참여 가능한 Room 목록도 바꿀 수 있다.
            void mutateRoomDirectory((currentData) => currentData, true);
            // Optimistic count가 서버와 경합하더라도 최종적으로 BE Summary에 재수렴한다.
            void mutateSummary((currentData) => currentData, true);
        },
        [mutateActivityList, mutateRoomDirectory, mutateSummary],
    );

    const handleReconnectSyncRequested = useCallback(async () => {
        await Promise.all([
            refreshChatProjection(),
            mutateActivityList((currentData) => currentData, true),
            mutateRoomDirectory((currentData) => currentData, true),
        ]);
    }, [
        mutateActivityList,
        mutateRoomDirectory,
        refreshChatProjection,
    ]);

    useChatRoomsRealtime({
        roomIds,
        accessToken: session?.accessToken ?? null,
        onMessageCreated: handleMessageCreated,
        onReadUpdated: handleReadUpdated,
        onNotificationCreated: handleNotificationCreated,
        onReconnectSyncRequested: handleReconnectSyncRequested,
    });

    useEffect(() => {
        for (const item of activityList.items) {
            seenActivityNotificationIdsRef.current.add(item.id);
        }
    }, [activityList.items]);

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

    const markActivityAsRead = useCallback(
        async (
            item: ChatNotificationActivityListResponse["items"][number],
        ): Promise<boolean> => {
            if (item.isRead) {
                return true;
            }
            if (processingActivityId !== null || isProcessingAllActivities) {
                return false;
            }

            setProcessingActivityId(item.id);
            try {
                const updated =
                    await chatNotificationService.markActivityAsRead(item.id);

                await Promise.all([
                    mutateActivityList((currentData) => {
                        if (!currentData) {
                            return currentData;
                        }

                        return {
                            ...currentData,
                            items: currentData.items.map((currentItem) =>
                                currentItem.id === item.id
                                    ? updated
                                    : currentItem,
                            ),
                        };
                    }, false),
                    mutateSummary((currentData) => {
                        if (!currentData) {
                            return currentData;
                        }

                        const unreadActivityCount = Math.max(
                            0,
                            currentData.unreadActivityCount - 1,
                        );

                        return {
                            ...currentData,
                            unreadActivityCount,
                            totalAttentionCount:
                                currentData.unreadChatMessageCount +
                                unreadActivityCount,
                        };
                    }, false),
                ]);

                return true;
            } catch (error) {
                console.error(
                    "Failed to mark chat activity notification as read.",
                    error,
                );
                return false;
            } finally {
                setProcessingActivityId(null);
            }
        },
        [
            isProcessingAllActivities,
            mutateActivityList,
            mutateSummary,
            processingActivityId,
        ],
    );

    const markAllActivitiesAsRead = useCallback(async (): Promise<boolean> => {
        if (isProcessingAllActivities || processingActivityId !== null) {
            return false;
        }
        if (summary.unreadActivityCount <= 0) {
            return true;
        }

        setIsProcessingAllActivities(true);
        try {
            await chatNotificationService.markAllActivitiesAsRead();
            const readAt = new Date().toISOString();

            await Promise.all([
                mutateActivityList((currentData) => {
                    if (!currentData) {
                        return currentData;
                    }

                    return {
                        ...currentData,
                        items: currentData.items.map((item) =>
                            item.isRead
                                ? item
                                : { ...item, isRead: true, readAt },
                        ),
                    };
                }, false),
                mutateSummary((currentData) => {
                    if (!currentData) {
                        return currentData;
                    }

                    return {
                        ...currentData,
                        unreadActivityCount: 0,
                        totalAttentionCount:
                            currentData.unreadChatMessageCount,
                    };
                }, false),
            ]);

            // 현재 Page 밖의 Activity까지 모두 읽음 처리되므로 서버 상태를 재확인한다.
            await Promise.all([
                mutateActivityList((currentData) => currentData, true),
                mutateSummary((currentData) => currentData, true),
            ]);
            return true;
        } catch (error) {
            console.error(
                "Failed to mark all chat activity notifications as read.",
                error,
            );
            return false;
        } finally {
            setIsProcessingAllActivities(false);
        }
    }, [
        isProcessingAllActivities,
        mutateActivityList,
        mutateSummary,
        processingActivityId,
        summary.unreadActivityCount,
    ]);

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
        processingActivityId,
        isProcessingAllActivities,
        markChatRoomAsRead,
        markActivityAsRead,
        markAllActivitiesAsRead,
        mutateSummary,
        mutateChatList,
        mutateActivityList,
        refresh,
    };
}
