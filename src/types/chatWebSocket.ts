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
    | "chat.translation.completed"
    | "chat.translation.failed";

export interface ChatWebSocketEvent<T = unknown> {
    eventType?: ChatWebSocketEventType;
    type?: ChatWebSocketEventType;
    roomId?: number;
    chatRoomId?: number;
    payload?: T;
    data?: T;
    message?: T;
}

export interface ChatTranslationResultPayload {
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

export interface ChatTranslationResult {
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

export const extractTranslationResultFromEvent = (
    event: ChatWebSocketEvent<ChatTranslationResultPayload>,
    fallbackStatus: ChatMessageTranslationStatus,
): ChatTranslationResult | null => {
    const payload = extractPayload(event);

    if (!payload || typeof payload.messageId !== "number") {
        return null;
    }

    const languageCode =
        typeof payload.languageCode === "string"
            ? payload.languageCode
            : payload.translation?.languageCode;

    if (!languageCode) {
        return null;
    }

    const translation: ChatMessageTranslation =
        payload.translation ??
        {
            id: 0,
            languageCode,
            translatedContent:
                payload.translatedContent ?? payload.translatedText ?? "",
            status: payload.status ?? fallbackStatus,
            failureReason: payload.failureReason ?? null,
            completedAt: payload.completedAt ?? new Date().toISOString(),
        };

    return {
        messageId: payload.messageId,
        translation,
    };
};