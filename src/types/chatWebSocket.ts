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
    | "chat.translation.failed"
    | "chat.error";

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
    translationId?: unknown;
    id?: unknown;
    languageCode?: unknown;
    translatedText?: string | null;
    translatedContent?: string | null;
    status?: ChatMessageTranslationStatus;
    failureReason?: string | null;
    completedAt?: string | null;
    occurredAt?: string | null;
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
    event.payload ??
    event.data ??
    event.message ??
    ((event as unknown) as T);

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

    const translationId =
        typeof payload.translation?.id === "number"
            ? payload.translation.id
            : typeof payload.translationId === "number"
                ? payload.translationId
                : typeof payload.id === "number"
                    ? payload.id
                    : 0;

    const completedAt =
        payload.completedAt ??
        payload.occurredAt ??
        (fallbackStatus === "COMPLETED" ? new Date().toISOString() : null);

    const translation: ChatMessageTranslation =
        payload.translation ??
        {
            id: translationId,
            languageCode,
            translatedContent:
                payload.translatedContent ?? payload.translatedText ?? null,
            status: payload.status ?? fallbackStatus,
            failureReason: payload.failureReason ?? null,
            completedAt,
        };

    return {
        messageId: payload.messageId,
        translation,
    };
};