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
    extractOpenChatMemberBannedEvent,
    extractOpenChatMemberRoleUpdatedEvent,
    extractOpenChatProfileUpdatedEvent,
    extractOpenChatRoomClosedEvent,
    extractTranslationResultFromEvent,
    getChatWebSocketEventType,
    type ChatMemberReadUpdatedEvent,
    type ChatReadUpdatedEvent,
    type ChatWebSocketConnectionStatus,
    type ChatWebSocketEvent,
    type OpenChatMemberBannedEvent,
    type OpenChatMemberRoleUpdatedEvent,
    type OpenChatProfileUpdatedEvent,
    type OpenChatRoomClosedEvent,
} from "@/types/chatWebSocket";
import { getChatWebSocketUrl } from "@/utils/websocket";

type ChatWebSocketSendErrorCode = "NOT_CONNECTED" | "SEND_FAILED";

interface UseChatRoomWebSocketParams {
    roomId: number;
    accessToken: string | null;
    enabled?: boolean;
    openChatEventsEnabled?: boolean;
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
    onOpenChatMemberRoleUpdated?: (
        event: OpenChatMemberRoleUpdatedEvent,
    ) => void;
    onOpenChatMemberBanned?: (
        event: OpenChatMemberBannedEvent,
    ) => void;
    onCurrentUserOpenChatMemberBanned?: (
        event: OpenChatMemberBannedEvent,
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
    enabled = true,
    openChatEventsEnabled = false,
    onMessageCreated,
    onTranslationCompleted,
    onReadUpdated,
    onMemberReadUpdated,
    onOpenChatProfileUpdated,
    onOpenChatMemberRoleUpdated,
    onOpenChatMemberBanned,
    onCurrentUserOpenChatMemberBanned,
    onOpenChatRoomClosed,
    onReconnectSyncRequested,
}: UseChatRoomWebSocketParams): UseChatRoomWebSocketResult => {
    const clientRef = useRef<Client | null>(null);
    const connectionKeyRef = useRef<string | null>(null);

    /**
     * 같은 roomId와 accessToken으로 Client가 다시 생성되더라도
     * 이전 Client의 지연된 close/error callback이 최신 상태를
     * 덮어쓰지 못하도록 연결 세대를 구분한다.
     */
    const connectionGenerationRef = useRef(0);

    const eventHandlersRef = useRef({
        onMessageCreated,
        onTranslationCompleted,
        onReadUpdated,
        onMemberReadUpdated,
        onOpenChatProfileUpdated,
        onOpenChatMemberRoleUpdated,
        onOpenChatMemberBanned,
        onCurrentUserOpenChatMemberBanned,
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
            onOpenChatMemberRoleUpdated,
            onOpenChatMemberBanned,
            onCurrentUserOpenChatMemberBanned,
            onOpenChatRoomClosed,
            onReconnectSyncRequested,
        };
    }, [
        onMemberReadUpdated,
        onMessageCreated,
        onOpenChatMemberBanned,
        onCurrentUserOpenChatMemberBanned,
        onOpenChatMemberRoleUpdated,
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
        if (!enabled || !roomId || !accessToken) {
            return null;
        }

        return `${roomId}:${accessToken}`;
    }, [accessToken, enabled, roomId]);

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

                if (eventType === "chat.member.role.updated") {
                    const roleUpdated =
                        extractOpenChatMemberRoleUpdatedEvent(parsed);

                    if (roleUpdated) {
                        eventHandlersRef.current.onOpenChatMemberRoleUpdated?.(
                            roleUpdated,
                        );
                    }
                    return;
                }

                if (eventType === "chat.member.banned") {
                    const memberBanned =
                        extractOpenChatMemberBannedEvent(parsed);

                    if (memberBanned) {
                        eventHandlersRef.current.onOpenChatMemberBanned?.(
                            memberBanned,
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

    const handlePrivateOpenChatMessage = useCallback(
        (message: IMessage) => {
            try {
                const parsed = JSON.parse(
                    message.body,
                ) as ChatWebSocketEvent<unknown>;
                const eventType = getChatWebSocketEventType(parsed);

                if (eventType !== "chat.member.banned") {
                    return;
                }

                const memberBanned =
                    extractOpenChatMemberBannedEvent(parsed);

                if (memberBanned) {
                    eventHandlersRef.current
                        .onCurrentUserOpenChatMemberBanned?.(memberBanned);
                }
            } catch (error) {
                console.error(
                    "Failed to parse private OPEN chat websocket message",
                    error,
                );
            }
        },
        [],
    );

    useEffect(() => {
        /*
         * Effect가 다시 실행될 때마다 새로운 세대를 발급한다.
         * 이전 Client의 callback은 세대가 달라지므로 무시된다.
         */
        const generation = ++connectionGenerationRef.current;

        if (!connectionKey || !accessToken) {
            clientRef.current = null;
            connectionKeyRef.current = null;
            return;
        }

        connectionKeyRef.current = connectionKey;

        /*
         * 재연결 여부와 STOMP 오류 여부는 Client별 상태다.
         * Hook 전체 Ref로 공유하면 이전 Client의 상태가
         * 새 Client에 영향을 줄 수 있으므로 지역 변수로 관리한다.
         */
        let hasConnectedOnce = false;
        let stoppedByStompError = false;

        const isCurrentConnection = () =>
            connectionGenerationRef.current === generation &&
            connectionKeyRef.current === connectionKey;

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
                if (!isCurrentConnection()) {
                    return;
                }

                const shouldSyncAfterReconnect = hasConnectedOnce;

                hasConnectedOnce = true;

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

                if (openChatEventsEnabled) {
                    client.subscribe(
                        `/user/queue/chat/open-rooms/${roomId}`,
                        handlePrivateOpenChatMessage,
                        {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    );
                }

                if (shouldSyncAfterReconnect) {
                    void eventHandlersRef.current
                        .onReconnectSyncRequested?.();
                }
            },

            onDisconnect: () => {
                if (!isCurrentConnection()) {
                    return;
                }

                setRawConnectionStatus("DISCONNECTED");
            },

            onStompError: (frame) => {
                if (!isCurrentConnection()) {
                    return;
                }

                console.error(
                    "Chat websocket STOMP error.",
                    frame,
                );

                stoppedByStompError = true;
                setRawConnectionStatus("ERROR");

                /*
                 * 서버가 STOMP ERROR를 명시적으로 반환한 경우에는
                 * 같은 요청을 반복하지 않도록 현재 Client의
                 * 자동 재연결을 중지한다.
                 */
                client.reconnectDelay = 0;
                void client.deactivate();
            },

            onWebSocketError: (event) => {
                if (!isCurrentConnection()) {
                    return;
                }

                console.error(
                    "Chat websocket error.",
                    event,
                );

                setRawConnectionStatus("ERROR");
            },

            onWebSocketClose: () => {
                /*
                 * 이전 Client가 늦게 종료되더라도
                 * 현재 Client의 CONNECTED 상태를 덮어쓰지 않는다.
                 */
                if (!isCurrentConnection()) {
                    return;
                }

                if (stoppedByStompError) {
                    setRawConnectionStatus("ERROR");
                    return;
                }

                setRawConnectionStatus("DISCONNECTED");
            },
        });

        clientRef.current = client;
        client.activate();

        return () => {
            /*
             * deactivate()를 호출하기 전에 현재 세대를 무효화한다.
             * deactivate 과정에서 onDisconnect/onWebSocketClose가
             * 늦게 호출되어도 상태를 변경하지 못한다.
             */
            if (connectionGenerationRef.current === generation) {
                connectionGenerationRef.current += 1;
                connectionKeyRef.current = null;
            }

            if (clientRef.current === client) {
                clientRef.current = null;
            }

            void client.deactivate();
        };
    }, [
        accessToken,
        connectionKey,
        handlePrivateOpenChatMessage,
        handleStompMessage,
        openChatEventsEnabled,
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
