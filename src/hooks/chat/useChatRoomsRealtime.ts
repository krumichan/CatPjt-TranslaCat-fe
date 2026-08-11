"use client";

import { Client, type IMessage } from "@stomp/stompjs";
import { useCallback, useEffect, useMemo, useRef } from "react";

import type { ChatMessage } from "@/types/chat";
import type { ChatNotificationActivityItem } from "@/types/chatNotification";
import {
    extractChatMessageFromEvent,
    extractChatNotificationCreatedItem,
    extractChatReadUpdatedEvent,
    getChatWebSocketEventType,
    type ChatReadUpdatedEvent,
    type ChatWebSocketEvent,
} from "@/types/chatWebSocket";
import { getChatWebSocketUrl } from "@/utils/websocket";

const MAX_SEEN_MESSAGE_IDS = 500;

interface UseChatRoomsRealtimeParams {
    roomIds: number[];
    accessToken: string | null;
    onMessageCreated: (message: ChatMessage) => void;
    onReadUpdated: (event: ChatReadUpdatedEvent) => void;
    onNotificationCreated?: (
        notification: ChatNotificationActivityItem,
    ) => void;
    onReconnectSyncRequested: () => Promise<void>;
}

export function useChatRoomsRealtime({
    roomIds,
    accessToken,
    onMessageCreated,
    onReadUpdated,
    onNotificationCreated,
    onReconnectSyncRequested,
}: UseChatRoomsRealtimeParams) {
    const hasConnectedOnceRef = useRef(false);
    const seenMessageIdsRef = useRef(new Set<number>());

    const roomIdKey = Array.from(new Set(roomIds))
        .sort((a, b) => a - b)
        .join(",");

    const normalizedRoomIds = useMemo(
        () =>
            roomIdKey
                ? roomIdKey.split(",").map(Number)
                : [],
        [roomIdKey],
    );

    const connectionKey = useMemo(() => {
        if (!accessToken || normalizedRoomIds.length === 0) {
            return null;
        }

        return `${accessToken}:${normalizedRoomIds.join(",")}`;
    }, [accessToken, normalizedRoomIds]);

    const rememberMessageId = useCallback((messageId: number) => {
        const seenMessageIds = seenMessageIdsRef.current;

        if (seenMessageIds.has(messageId)) {
            return false;
        }

        seenMessageIds.add(messageId);

        if (seenMessageIds.size > MAX_SEEN_MESSAGE_IDS) {
            const oldestMessageId = seenMessageIds.values().next().value;
            if (typeof oldestMessageId === "number") {
                seenMessageIds.delete(oldestMessageId);
            }
        }

        return true;
    }, []);

    const handleStompMessage = useCallback(
        (message: IMessage) => {
            try {
                const parsed = JSON.parse(
                    message.body,
                ) as ChatWebSocketEvent<unknown>;
                const eventType = getChatWebSocketEventType(parsed);

                if (!eventType || eventType === "chat.message.created") {
                    const chatMessage = extractChatMessageFromEvent(parsed);

                    if (
                        chatMessage &&
                        rememberMessageId(chatMessage.id)
                    ) {
                        onMessageCreated(chatMessage);
                    }
                    return;
                }

                if (eventType === "chat.read.updated") {
                    const readUpdated = extractChatReadUpdatedEvent(parsed);

                    if (readUpdated) {
                        onReadUpdated(readUpdated);
                    }
                    return;
                }

                if (eventType === "chat.notification.created") {
                    const notification =
                        extractChatNotificationCreatedItem(parsed);

                    if (notification) {
                        onNotificationCreated?.(notification);
                    }
                }
            } catch (error) {
                console.error(
                    "Failed to parse chat room list websocket message.",
                    error,
                );
            }
        },
        [
            onMessageCreated,
            onNotificationCreated,
            onReadUpdated,
            rememberMessageId,
        ],
    );

    useEffect(() => {
        if (!connectionKey || !accessToken) {
            hasConnectedOnceRef.current = false;
            seenMessageIdsRef.current.clear();
            return;
        }

        let stoppedByStompError = false;

        const client = new Client({
            brokerURL: getChatWebSocketUrl(),
            connectHeaders: {
                Authorization: `Bearer ${accessToken}`,
            },
            reconnectDelay: 3000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            debug: (message) => {
                if (process.env.NODE_ENV === "development") {
                    console.debug("[chat room list websocket]", message);
                }
            },
            onConnect: () => {
                const shouldSyncAfterReconnect =
                    hasConnectedOnceRef.current;

                hasConnectedOnceRef.current = true;

                for (const roomId of normalizedRoomIds) {
                    client.subscribe(
                        `/topic/chat/rooms/${roomId}`,
                        handleStompMessage,
                        {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    );
                }

                client.subscribe(
                    "/user/queue/chat/read",
                    handleStompMessage,
                    {
                        Authorization: `Bearer ${accessToken}`,
                    },
                );

                client.subscribe(
                    "/user/queue/chat/notifications",
                    handleStompMessage,
                    {
                        Authorization: `Bearer ${accessToken}`,
                    },
                );

                if (shouldSyncAfterReconnect) {
                    void onReconnectSyncRequested();
                }
            },
            onStompError: (frame) => {
                console.error("Chat room list STOMP error.", frame);
                stoppedByStompError = true;
                client.reconnectDelay = 0;
                void client.deactivate();
            },
            onWebSocketError: (event) => {
                console.error("Chat room list websocket error.", event);
            },
            onWebSocketClose: () => {
                if (stoppedByStompError) {
                    return;
                }
            },
        });

        client.activate();

        return () => {
            void client.deactivate();
        };
    }, [
        accessToken,
        connectionKey,
        handleStompMessage,
        normalizedRoomIds,
        onReconnectSyncRequested,
    ]);
}
