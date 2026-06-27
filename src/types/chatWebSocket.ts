import type {
    ChatMessage,
    ChatMessageTranslation,
    ChatMessageTranslationStatus,
} from "@/types/chat";

export type ChatWebSocketConnectionStatus =
    | "IDLE"
    | "CONNECTING"
    | "CONNECTED"
    | "DISCONNECTED"
    | "ERROR";

export type ChatWebSocketEventType =
    | "chat.message.created"
    | "chat.translation.completed";

export interface ChatWebSocketEvent<T = unknown> {
    eventType?: ChatWebSocketEventType;
    type?: ChatWebSocketEventType;
    roomId?: number;
    chatRoomId?: number;
    payload?: T;
    data?: T;
    message?: T;
}

export interface ChatTranslationCompletedPayload {
    roomId?: number;
    chatRoomId?: number;
    messageId?: unknown;
    languageCode?: unknown;
    translatedText?: string | null;
    translatedContent?: string | null;
    status?: ChatMessageTranslationStatus;
    failureReason?: string | null;
    completedAt?: string | null;
    translation?: ChatMessageTranslation;
}

export interface ChatTranslationCompleted {
    messageId: number;
    translation: ChatMessageTranslation;
}

export const getChatWebSocketEventType = (
    event: ChatWebSocketEvent,
): ChatWebSocketEventType | null => event.eventType ?? event.type ?? null;

const extractPayload = <T>(event: ChatWebSocketEvent<T>): T | null =>
    event.payload ?? event.data ?? event.message ?? null;

export const extractChatMessageFromEvent = (
    event: ChatWebSocketEvent<ChatMessage>,
): ChatMessage | null => extractPayload(event);

export const extractTranslationCompletedFromEvent = (
    event: ChatWebSocketEvent<ChatTranslationCompletedPayload>,
): ChatTranslationCompleted | null => {
    const payload = extractPayload(event);

    if (
        !payload ||
        typeof payload.messageId !== "number" ||
        typeof payload.languageCode !== "string" ||
        !payload.languageCode
    ) {
        return null;
    }

    const translation: ChatMessageTranslation =
        payload.translation ??
        {
            id: 0,
            languageCode: payload.languageCode,
            translatedContent:
                payload.translatedContent ?? payload.translatedText ?? "",
            status: payload.status ?? "COMPLETED",
            failureReason: payload.failureReason ?? null,
            completedAt: payload.completedAt ?? new Date().toISOString(),
        };

    return {
        messageId: payload.messageId,
        translation,
    };
};