"use client";

import { Client, type IMessage } from "@stomp/stompjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
    ChatMessage,
    ChatMessageTranslation,
} from "@/types/chat";
import {
    extractChatMessageFromEvent,
    extractTranslationResultFromEvent,
    getChatWebSocketEventType,
    type ChatTranslationResultPayload,
    type ChatWebSocketConnectionStatus,
    type ChatWebSocketEvent,
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
    onReconnectSyncRequested,
}: UseChatRoomWebSocketParams): UseChatRoomWebSocketResult => {
    const clientRef = useRef<Client | null>(null);
    const connectionKeyRef = useRef<string | null>(null);
    const hasConnectedOnceRef = useRef(false);

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
                const parsed = JSON.parse(message.body) as ChatWebSocketEvent<unknown>;
                const eventType = getChatWebSocketEventType(parsed);

                if (!eventType || eventType === "chat.message.created") {
                    const chatMessage = extractChatMessageFromEvent(
                        parsed as ChatWebSocketEvent<ChatMessage>,
                    );

                    if (!chatMessage) {
                        return;
                    }

                    onMessageCreated(chatMessage);
                    return;
                }

                if (
                    eventType === "chat.translation.completed" ||
                    eventType === "chat.translation.failed"
                ) {
                    const completed = extractTranslationResultFromEvent(
                        parsed as ChatWebSocketEvent<ChatTranslationResultPayload>,
                        eventType === "chat.translation.failed" ? "FAILED" : "COMPLETED",
                    );

                    if (!completed) {
                        return;
                    }

                    onTranslationCompleted?.(
                        completed.messageId,
                        completed.translation,
                    );
                }
            } catch (error) {
                console.error("Failed to parse chat websocket message", error);
            }
        },
        [onMessageCreated, onTranslationCompleted],
    );

    useEffect(() => {
        if (!connectionKey || !accessToken) {
            clientRef.current = null;
            connectionKeyRef.current = null;
            hasConnectedOnceRef.current = false;
            return;
        }

        connectionKeyRef.current = connectionKey;

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

                if (shouldSyncAfterReconnect) {
                    void onReconnectSyncRequested?.();
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
        onReconnectSyncRequested,
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
}