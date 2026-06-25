"use client";

import { Client, type IMessage } from "@stomp/stompjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatMessage } from "@/types/chat";
import type {
    ChatWebSocketConnectionStatus,
    ChatWebSocketEvent,
} from "@/types/chatWebSocket";
import { extractChatMessageFromEvent } from "@/types/chatWebSocket";
import { getChatWebSocketUrl } from "@/utils/websocket";

interface UseChatRoomWebSocketParams {
    roomId: string;
    accessToken: string | null;
    onMessageCreated: (message: ChatMessage) => void;
}

interface UseChatRoomWebSocketResult {
    connectionStatus: ChatWebSocketConnectionStatus;
    isConnected: boolean;
    sendMessage: (content: string) => boolean;
}

export function useChatRoomWebSocket({
    roomId,
    accessToken,
    onMessageCreated,
}: UseChatRoomWebSocketParams): UseChatRoomWebSocketResult {
    const clientRef = useRef<Client | null>(null);
    const connectionKeyRef = useRef<string | null>(null);

    const [rawConnectionStatus, setRawConnectionStatus] =
        useState<ChatWebSocketConnectionStatus>("IDLE");

    const [connectedConnectionKey, setConnectedConnectionKey] =
        useState<string | null>(null);

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
                ) as ChatWebSocketEvent<ChatMessage>;

                const eventType = parsed.eventType ?? parsed.type;

                if (eventType && eventType !== "chat.message.created") {
                    return;
                }

                const createdMessage = extractChatMessageFromEvent(parsed);

                if (!createdMessage) {
                    return;
                }

                onMessageCreated(createdMessage);
            } catch (error) {
                console.error("Failed to parse chat websocket message.", error);
            }
        },
        [onMessageCreated],
    );

    useEffect(() => {
        if (!connectionKey || !accessToken) {
            clientRef.current = null;
            connectionKeyRef.current = null;
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

                setConnectedConnectionKey(connectionKey);
                setRawConnectionStatus("CONNECTED");

                client.subscribe(
                    `/topic/chat/rooms/${roomId}`,
                    handleStompMessage,
                    {
                        Authorization: `Bearer ${accessToken}`,
                    },
                );
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
    }, [accessToken, connectionKey, handleStompMessage, roomId]);

    const sendMessage = useCallback(
        (content: string) => {
            const client = clientRef.current;
            const trimmedContent = content.trim();

            if (!client || !client.connected || !accessToken || !trimmedContent) {
                return false;
            }

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
        },
        [accessToken, roomId],
    );

    return {
        connectionStatus,
        isConnected: connectionStatus === "CONNECTED",
        sendMessage,
    };
}