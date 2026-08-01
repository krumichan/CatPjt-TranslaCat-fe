"use client";

import { useCallback } from "react";

import { useChatRoomWebSocket } from "@/hooks/chat/useChatRoomWebSocket";
import type {
    ChatMessage,
    ChatMessageTranslation,
} from "@/types/chat";
import type {
    ChatMemberReadUpdatedEvent,
    ChatReadUpdatedEvent,
    OpenChatMemberBannedEvent,
    OpenChatMemberRoleUpdatedEvent,
    OpenChatProfileUpdatedEvent,
    OpenChatRoomClosedEvent,
} from "@/types/chatWebSocket";

interface UseChatRoomRealtimeParams {
    roomId: number;
    accessToken: string | null;
    enabled?: boolean;
    openChatEventsEnabled?: boolean;
    isRestSending: boolean;
    restSendErrorCode: string | null;
    appendMessage: (message: ChatMessage) => void;
    applyTranslationCompleted: (
        messageId: number,
        translation: ChatMessageTranslation,
    ) => void;
    syncLatestMessages: () => Promise<void>;
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
    sendRestMessage: (
        content: string,
    ) => Promise<boolean>;
}

export function useChatRoomRealtime({
    roomId,
    accessToken,
    enabled = true,
    openChatEventsEnabled = false,
    isRestSending,
    restSendErrorCode,
    appendMessage,
    applyTranslationCompleted,
    syncLatestMessages,
    onReadUpdated,
    onMemberReadUpdated,
    onOpenChatProfileUpdated,
    onOpenChatMemberRoleUpdated,
    onOpenChatMemberBanned,
    onCurrentUserOpenChatMemberBanned,
    onOpenChatRoomClosed,
    sendRestMessage,
}: UseChatRoomRealtimeParams) {
    const handleMessageCreated = useCallback(
        (message: ChatMessage) => {
            appendMessage(message);
        },
        [appendMessage],
    );

    const handleTranslationCompleted =
        useCallback(
            (
                messageId: number,
                translation: ChatMessageTranslation,
            ) => {
                applyTranslationCompleted(
                    messageId,
                    translation,
                );
            },
            [applyTranslationCompleted],
        );

    const {
        connectionStatus,
        isConnected,
        isSending: isWebSocketSending,
        sendErrorCode: webSocketSendErrorCode,
        sendMessage: sendWebSocketMessage,
    } = useChatRoomWebSocket({
        roomId,
        accessToken,
        enabled,
        openChatEventsEnabled,
        onMessageCreated: handleMessageCreated,
        onTranslationCompleted:
            handleTranslationCompleted,
        onReadUpdated,
        onMemberReadUpdated,
        onOpenChatProfileUpdated,
        onOpenChatMemberRoleUpdated,
        onOpenChatMemberBanned,
        onCurrentUserOpenChatMemberBanned,
        onOpenChatRoomClosed,
        onReconnectSyncRequested:
            syncLatestMessages,
    });

    const sendMessage = useCallback(
        async (content: string) => {
            if (isConnected) {
                return sendWebSocketMessage(content);
            }

            return sendRestMessage(content);
        },
        [
            isConnected,
            sendRestMessage,
            sendWebSocketMessage,
        ],
    );

    return {
        connectionStatus,
        isConnected,
        isSending: isConnected
            ? isWebSocketSending
            : isRestSending,
        sendErrorCode:
            webSocketSendErrorCode ??
            restSendErrorCode,
        sendMessage,
    };
}
