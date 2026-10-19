"use client";

import { Client, type IMessage } from "@stomp/stompjs";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { isTemporaryAuthError, isTerminalAuthError } from "@/lib/authError";
import { getChatWebSocketSession } from "@/lib/chatWebSocketSession";
import { AUTH_SIGN_OUT_STARTED_EVENT, AUTH_UNAUTHORIZED_EVENT } from "@/lib/authEvents";

import type { ChatMessage } from "@/types/chat";
import type { ChatNotificationActivityItem } from "@/types/chatNotification";
import type { ChatReadUpdatedEvent, ChatWebSocketEvent } from "@/types/chatWebSocket";
import {
    extractChatMessageFromEvent,
    extractChatNotificationCreatedItem,
    extractChatReadUpdatedEvent,
    getChatWebSocketEventType,
} from "@/utils/chat/chatWebSocketParser";
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
    const { data: session } = useSession();
    const loginSessionId = session?.loginSessionId ?? null;
    const hasConnectedOnceRef = useRef(false);
    const seenMessageIdsRef = useRef(new Set<number>());
    const seenSessionRef = useRef<string | null>(null);
    const connectionGenerationRef = useRef(0);

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

    const shouldSubscribeNotifications =
        onNotificationCreated !== undefined;

    const connectionKey = useMemo(() => {
        if (
            !accessToken || !loginSessionId ||
            (normalizedRoomIds.length === 0 &&
                !shouldSubscribeNotifications)
        ) {
            return null;
        }

        return `${loginSessionId}:${accessToken}:${normalizedRoomIds.join(",")}:${
            shouldSubscribeNotifications ? "notifications" : "rooms"
        }`;
    }, [
        accessToken,
        loginSessionId,
        normalizedRoomIds,
        shouldSubscribeNotifications,
    ]);

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
        const generation = ++connectionGenerationRef.current;
        if (seenSessionRef.current !== loginSessionId) {
            seenSessionRef.current = loginSessionId;
            hasConnectedOnceRef.current = false;
            seenMessageIdsRef.current.clear();
        }
        if (!connectionKey || !accessToken) {
            hasConnectedOnceRef.current = false;
            seenMessageIdsRef.current.clear();
            return;
        }

        let stoppedByStompError = false;
        let stoppedForSession = false;
        let connectedAccessToken: string | null = null;
        const sessionLookupAbort = new AbortController();
        let sessionLookupFailures = 0;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;

        const cancelSessionRetry = () => {
            if (retryTimer !== null) clearTimeout(retryTimer);
            retryTimer = null;
        };
        const isCurrentConnection = () => !stoppedForSession && connectionGenerationRef.current === generation;
        const stopForSession = () => {
            if (!isCurrentConnection()) return;
            stoppedForSession = true;
            cancelSessionRetry();
            sessionLookupAbort.abort();
            connectedAccessToken = null;
            client.connectHeaders = {};
            client.reconnectDelay = 0;
            void client.deactivate();
        };

        const retrySessionLookup = () => {
            if (!isCurrentConnection()) return;
            connectedAccessToken = null;
            client.connectHeaders = {};
            const delay = Math.min(3000 * 2 ** Math.min(sessionLookupFailures++, 4), 30_000);

            // deactivate가 완료되기 전에 activate하면 기존 연결 시도가 살아날 수 있다.
            void client.deactivate().catch(() => {}).then(() => {
                if (!isCurrentConnection()) return;
                cancelSessionRetry();
                retryTimer = setTimeout(() => {
                    retryTimer = null;
                    if (isCurrentConnection()) client.activate();
                }, delay);
            });
        };

        const client = new Client({
            brokerURL: getChatWebSocketUrl(),
            beforeConnect: async () => {
                // 매 CONNECT 전에 갱신한 세션을 조회하고 로그아웃·계정 변경 뒤 늦은 결과를 폐기한다.
                if (!isCurrentConnection()) return;
                try {
                    const currentSession = await getChatWebSocketSession({
                        isCurrent: isCurrentConnection, signal: sessionLookupAbort.signal,
                    });
                    if (!isCurrentConnection()) return;
                    if (!currentSession
                        || currentSession.loginSessionId !== loginSessionId
                        || isTerminalAuthError(currentSession.error)) {
                        stopForSession();
                        return;
                    }

                    const expires = currentSession.user?.accessTokenExpires;
                    if (!currentSession.accessToken || typeof expires !== "number"
                        || !Number.isFinite(expires) || expires <= Date.now()) {
                        // 일시적인 갱신 장애일 때 만료 토큰을 보내지 않고 지연 후 다시 조회한다.
                        if (isTemporaryAuthError(currentSession.error)) retrySessionLookup();
                        else stopForSession();
                        return;
                    }

                    connectedAccessToken = currentSession.accessToken;
                    client.connectHeaders = { Authorization: `Bearer ${connectedAccessToken}` };
                    sessionLookupFailures = 0;
                } catch {
                    retrySessionLookup();
                }
            },
            reconnectDelay: 3000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            debug: () => {},
            onConnect: () => {
                if (!isCurrentConnection() || !connectedAccessToken) return;
                const shouldSyncAfterReconnect =
                    hasConnectedOnceRef.current;

                hasConnectedOnceRef.current = true;

                for (const roomId of normalizedRoomIds) {
                    client.subscribe(
                        `/topic/chat/rooms/${roomId}`,
                        (message) => { if (isCurrentConnection()) handleStompMessage(message); },
                        {
                            Authorization: `Bearer ${connectedAccessToken}`,
                        },
                    );
                }

                if (normalizedRoomIds.length > 0) {
                    client.subscribe(
                        "/user/queue/chat/read",
                        (message) => { if (isCurrentConnection()) handleStompMessage(message); },
                        {
                            Authorization: `Bearer ${connectedAccessToken}`,
                        },
                    );
                }

                if (shouldSubscribeNotifications) {
                    client.subscribe(
                        "/user/queue/chat/notifications",
                        (message) => { if (isCurrentConnection()) handleStompMessage(message); },
                        {
                            Authorization: `Bearer ${connectedAccessToken}`,
                        },
                    );
                }

                if (shouldSyncAfterReconnect) {
                    void onReconnectSyncRequested();
                }
            },
            onStompError: () => {
                if (!isCurrentConnection()) return;
                console.error("Chat room list STOMP request was rejected.");
                stoppedByStompError = true;
                stopForSession();
            },
            onWebSocketError: (event) => {
                if (!isCurrentConnection()) return;
                console.error("Chat room list websocket error.", event);
            },
            onWebSocketClose: () => {
                if (!isCurrentConnection() || stoppedByStompError) {
                    return;
                }
            },
        });

        if (typeof window !== "undefined") {
            window.addEventListener(AUTH_SIGN_OUT_STARTED_EVENT, stopForSession);
            window.addEventListener(AUTH_UNAUTHORIZED_EVENT, stopForSession);
        }

        client.activate();

        return () => {
            cancelSessionRetry();
            sessionLookupAbort.abort();
            if (connectionGenerationRef.current === generation) connectionGenerationRef.current += 1;
            if (typeof window !== "undefined") {
                window.removeEventListener(AUTH_SIGN_OUT_STARTED_EVENT, stopForSession);
                window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, stopForSession);
            }
            void client.deactivate();
        };
    }, [
        accessToken,
        connectionKey,
        handleStompMessage,
        loginSessionId,
        normalizedRoomIds,
        onReconnectSyncRequested,
        shouldSubscribeNotifications,
    ]);
}
