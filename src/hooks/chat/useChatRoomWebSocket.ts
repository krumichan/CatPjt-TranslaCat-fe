"use client";

import { Client, type IMessage } from "@stomp/stompjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
    ChatMessage,
    ChatMessageTranslation,
} from "@/types/chat";
import {
    extractChatMemberReadUpdatedEvent,
    extractChatMessageFromEvent,
    extractChatReadUpdatedEvent,
    extractOpenChatProfileUpdatedEvent,
    extractOpenChatRoomClosedEvent,
    extractTranslationResultFromEvent,
    getChatWebSocketEventType,
    type ChatMemberReadUpdatedEvent,
    type ChatReadUpdatedEvent,
    type ChatWebSocketConnectionStatus,
    type ChatWebSocketEvent,
    type OpenChatProfileUpdatedEvent,
    type OpenChatRoomClosedEvent,
} from "@/types/chatWebSocket";
import { getChatWebSocketUrl } from "@/utils/websocket";

type ChatWebSocketSendErrorCode = "NOT_CONNECTED" | "SEND_FAILED";

interface UseChatRoomWebSocketParams {
    roomId: number;
    accessToken: string | null;
    onMessageCreated: (message: ChatMessage) => void;
    onTranslationCompleted?: (
        messageId: number,
        translation: ChatMessageTranslation,
    ) => void;
    onReadUpdated?: (event: ChatReadUpdatedEvent) => void;
    onMemberReadUpdated?: (
        event: ChatMemberReadUpdatedEvent,
    ) => void;
    onOpenChatProfileUpdated?: (
        event: OpenChatProfileUpdatedEvent,
    ) => void;
    onOpenChatRoomClosed?: (
        event: OpenChatRoomClosedEvent,
    ) => void;
    onReconnectSyncRequested?: () => Promise<void>;
}

interface UseChatRoomWebSocketResult {
    connectionStatus: ChatWebSocketConnectionStatus;
    isConnected: boolean;
    isSending: boolean;
    sendErrorCode: ChatWebSocketSendErrorCode | null;
    sendMessage: (content: string) => Promise<boolean>;
}

export const useChatRoomWebSocket = ({
    roomId,
    accessToken,
    onMessageCreated,
    onTranslationCompleted,
    onReadUpdated,
    onMemberReadUpdated,
    onOpenChatProfileUpdated,
    onOpenChatRoomClosed,
    onReconnectSyncRequested,
}: UseChatRoomWebSocketParams): UseChatRoomWebSocketResult => {
    const clientRef = useRef<Client | null>(null);
    const connectionKeyRef = useRef<string | null>(null);
    const hasConnectedOnceRef = useRef(false);
    const stoppedByStompErrorRef = useRef(false);
    const eventHandlersRef = useRef({
        onMessageCreated,
        onTranslationCompleted,
        onReadUpdated,
        onMemberReadUpdated,
        onOpenChatProfileUpdated,
        onOpenChatRoomClosed,
        onReconnectSyncRequested,
    });

    useEffect(() => {
        eventHandlersRef.current = {
            onMessageCreated,
            onTranslationCompleted,
            onReadUpdated,
            onMemberReadUpdated,
            onOpenChatProfileUpdated,
            onOpenChatRoomClosed,
            onReconnectSyncRequested,
        };
    }, [
        onMemberReadUpdated,
        onMessageCreated,
        onOpenChatProfileUpdated,
        onOpenChatRoomClosed,
        onReadUpdated,
        onReconnectSyncRequested,
        onTranslationCompleted,
    ]);

    const [rawConnectionStatus, setRawConnectionStatus] =
        useState<ChatWebSocketConnectionStatus>("IDLE");
    const [connectedConnectionKey, setConnectedConnectionKey] =
        useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [sendErrorCode, setSendErrorCode] =
        useState<ChatWebSocketSendErrorCode | null>(null);

    const connectionKey = useMemo(() => {
        if (!roomId || !accessToken) {
            return null;
        }

        return `${roomId}:${accessToken}`;
    }, [accessToken, roomId]);

    const connectionStatus = useMemo<ChatWebSocketConnectionStatus>(() => {
        if (!connectionKey) {
            return "IDLE";
        }

        if (rawConnectionStatus === "ERROR") {
            return "ERROR";
        }

        if (connectedConnectionKey !== connectionKey) {
            return "CONNECTING";
        }

        return rawConnectionStatus;
    }, [connectedConnectionKey, connectionKey, rawConnectionStatus]);

    const handleStompMessage = useCallback(
        (message: IMessage) => {
            try {
                const parsed = JSON.parse(
                    message.body,
                ) as ChatWebSocketEvent<unknown>;
                const eventType = getChatWebSocketEventType(parsed);

                if (!eventType || eventType === "chat.message.created") {
                    const chatMessage = extractChatMessageFromEvent(parsed);

                    if (!chatMessage) {
                        return;
                    }

                    eventHandlersRef.current.onMessageCreated(chatMessage);
                    return;
                }

                if (eventType === "chat.read.updated") {
                    const readUpdated = extractChatReadUpdatedEvent(parsed);

                    if (readUpdated) {
                        eventHandlersRef.current.onReadUpdated?.(readUpdated);
                    }
                    return;
                }

                if (eventType === "chat.member.read.updated") {
                    const memberReadUpdated =
                        extractChatMemberReadUpdatedEvent(parsed);

                    if (memberReadUpdated) {
                        eventHandlersRef.current.onMemberReadUpdated?.(
                            memberReadUpdated,
                        );
                    }
                    return;
                }

                if (eventType === "chat.open-profile.updated") {
                    const profileUpdated =
                        extractOpenChatProfileUpdatedEvent(parsed);

                    if (profileUpdated) {
                        eventHandlersRef.current.onOpenChatProfileUpdated?.(
                            profileUpdated,
                        );
                    }
                    return;
                }

                if (eventType === "chat.room.closed") {
                    const roomClosed =
                        extractOpenChatRoomClosedEvent(parsed);

                    if (roomClosed) {
                        eventHandlersRef.current.onOpenChatRoomClosed?.(
                            roomClosed,
                        );
                    }
                    return;
                }

                if (
                    eventType === "chat.translation.completed" ||
                    eventType === "chat.translation.failed"
                ) {
                    const completed = extractTranslationResultFromEvent(
                        parsed,
                        eventType === "chat.translation.failed"
                            ? "FAILED"
                            : "COMPLETED",
                    );

                    if (!completed) {
                        return;
                    }

                    eventHandlersRef.current.onTranslationCompleted?.(
                        completed.messageId,
                        completed.translation,
                    );
                }
            } catch (error) {
                console.error("Failed to parse chat websocket message", error);
            }
        },
        [],
    );

    useEffect(() => {
        if (!connectionKey || !accessToken) {
            clientRef.current = null;
            connectionKeyRef.current = null;
            hasConnectedOnceRef.current = false;
            stoppedByStompErrorRef.current = false;
            return;
        }

        connectionKeyRef.current = connectionKey;
        stoppedByStompErrorRef.current = false;

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
                    console.debug("[chat websocket]", message);
                }
            },
            onConnect: () => {
                if (connectionKeyRef.current !== connectionKey) {
                    return;
                }

                const shouldSyncAfterReconnect = hasConnectedOnceRef.current;

                hasConnectedOnceRef.current = true;
                setConnectedConnectionKey(connectionKey);
                setRawConnectionStatus("CONNECTED");

                client.subscribe(
                    `/topic/chat/rooms/${roomId}`,
                    handleStompMessage,
                    {
                        Authorization: `Bearer ${accessToken}`,
                    },
                );

                client.subscribe(
                    "/user/queue/chat/read",
                    handleStompMessage,
                    {
                        Authorization: `Bearer ${accessToken}`,
                    },
                );

                if (shouldSyncAfterReconnect) {
                    void eventHandlersRef.current.onReconnectSyncRequested?.();
                }
            },
            onDisconnect: () => {
                if (connectionKeyRef.current !== connectionKey) {
                    return;
                }

                setRawConnectionStatus("DISCONNECTED");
            },
            onStompError: (frame) => {
                if (connectionKeyRef.current !== connectionKey) {
                    return;
                }

                console.error("Chat websocket STOMP error.", frame);
                setRawConnectionStatus("ERROR");
                stoppedByStompErrorRef.current = true;

                /*
                 * STOMP ERROR는 서버가 CONNECT/SUBSCRIBE/SEND 프레임 처리 중
                 * 명시적으로 오류를 반환한 상태다.
                 * 그대로 reconnectDelay에 맡기면 같은 ERROR가 3초마다 반복되므로,
                 * 현재 세션에서는 자동 재연결을 멈추고 REST 송신 fallback을 사용한다.
                 */
                client.reconnectDelay = 0;
                void client.deactivate();
            },
            onWebSocketError: (event) => {
                if (connectionKeyRef.current !== connectionKey) {
                    return;
                }

                console.error("Chat websocket error.", event);
                setRawConnectionStatus("ERROR");
            },
            onWebSocketClose: () => {
                if (connectionKeyRef.current !== connectionKey) {
                    return;
                }

                if (stoppedByStompErrorRef.current) {
                    setRawConnectionStatus("ERROR");
                    return;
                }

                setRawConnectionStatus("DISCONNECTED");
            },
        });

        clientRef.current = client;
        client.activate();

        return () => {
            clientRef.current = null;
            void client.deactivate();
        };
    }, [
        accessToken,
        connectionKey,
        handleStompMessage,
        roomId,
    ]);

    const sendMessage = useCallback(
        async (content: string) => {
            const client = clientRef.current;
            const trimmedContent = content.trim();

            if (!trimmedContent) {
                return false;
            }

            if (!client || !client.connected || !accessToken) {
                setSendErrorCode("NOT_CONNECTED");
                return false;
            }

            setIsSending(true);
            setSendErrorCode(null);

            try {
                client.publish({
                    destination: `/app/chat/rooms/${roomId}/messages`,
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        content: trimmedContent,
                    }),
                });

                return true;
            } catch (error) {
                console.error("Failed to send chat websocket message.", error);
                setSendErrorCode("SEND_FAILED");
                return false;
            } finally {
                setIsSending(false);
            }
        },
        [accessToken, roomId],
    );

    return {
        connectionStatus,
        isConnected: connectionStatus === "CONNECTED",
        isSending,
        sendErrorCode,
        sendMessage,
    };
};
