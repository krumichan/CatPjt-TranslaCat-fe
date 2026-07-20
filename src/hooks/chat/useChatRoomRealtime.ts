"use client";

import { useCallback } from "react";

import { useChatRoomWebSocket } from "@/hooks/chat/useChatRoomWebSocket";
import type {
    ChatMessage,
    ChatMessageTranslation,
} from "@/types/chat";

interface UseChatRoomRealtimeParams {
    roomId: number;
    accessToken: string | null;
    isRestSending: boolean;
    restSendErrorCode: string | null;
    appendMessage: (message: ChatMessage) => void;
    applyTranslationCompleted: (
        messageId: number,
        translation: ChatMessageTranslation,
    ) => void;
    syncLatestMessages: () => Promise<void>;
    sendRestMessage: (
        content: string,
    ) => Promise<boolean>;
}

export function useChatRoomRealtime({
    roomId,
    accessToken,
    isRestSending,
    restSendErrorCode,
    appendMessage,
    applyTranslationCompleted,
    syncLatestMessages,
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
        onMessageCreated: handleMessageCreated,
        onTranslationCompleted:
            handleTranslationCompleted,
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
