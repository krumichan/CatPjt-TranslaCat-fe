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

type TypeGuard<T> = (value: unknown) => value is T;

export const getChatWebSocketEventType = (
    event: ChatWebSocketEvent<unknown>,
): ChatWebSocketEventType | null => event.eventType ?? event.type ?? null;

/**
 * STOMP 서버 응답은 payload/data/message 래퍼를 사용할 수도 있고,
 * 이벤트 객체 자체가 payload 형태로 전달될 수도 있다.
 * 각 후보 값을 순서대로 검사한 뒤 guard를 통과한 첫 값을 반환한다.
 */
const extractPayloadWithGuard = <T>(
    event: ChatWebSocketEvent<unknown>,
    guard: TypeGuard<T>,
): T | null => {
    const candidates: unknown[] = [
        event.payload,
        event.data,
        event.message,
        event,
    ];

    for (const candidate of candidates) {
        if (guard(candidate)) {
            return candidate;
        }
    }

    return null;
};

export const extractChatMessageFromEvent = (
    event: ChatWebSocketEvent<unknown>,
): ChatMessage | null =>
    extractPayloadWithGuard(event, isChatMessage);

export const extractTranslationResultFromEvent = (
    event: ChatWebSocketEvent<unknown>,
    fallbackStatus: ChatMessageTranslationStatus,
): ChatTranslationResult | null => {
    const payload = extractPayloadWithGuard(
        event,
        isChatTranslationResultPayload,
    );

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
        (fallbackStatus === "COMPLETED"
            ? new Date().toISOString()
            : null);

    const translation: ChatMessageTranslation =
        payload.translation ?? {
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

const isChatMessage = (value: unknown): value is ChatMessage => {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.id === "number" &&
        typeof value.chatRoomId === "number" &&
        isNullableNumber(value.senderUserId) &&
        isNullableString(value.senderName) &&
        isNullableString(value.senderEmail) &&
        typeof value.senderType === "string" &&
        typeof value.messageType === "string" &&
        typeof value.content === "string" &&
        typeof value.status === "string" &&
        Array.isArray(value.translations) &&
        value.translations.every(isChatMessageTranslation) &&
        typeof value.createdAt === "string" &&
        typeof value.updatedAt === "string"
    );
};

const isChatTranslationResultPayload = (
    value: unknown,
): value is ChatTranslationResultPayload => {
    if (!isRecord(value) || typeof value.messageId !== "number") {
        return false;
    }

    if (value.translation !== undefined) {
        return isChatMessageTranslation(value.translation);
    }

    return typeof value.languageCode === "string";
};

const isChatMessageTranslation = (
    value: unknown,
): value is ChatMessageTranslation => {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.id === "number" &&
        typeof value.languageCode === "string" &&
        isNullableString(value.translatedContent) &&
        typeof value.status === "string" &&
        isNullableString(value.failureReason) &&
        isNullableString(value.completedAt)
    );
};

const isRecord = (
    value: unknown,
): value is Record<string, unknown> =>
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value);

const isNullableString = (value: unknown): value is string | null =>
    value === null || typeof value === "string";

const isNullableNumber = (value: unknown): value is number | null =>
    value === null || typeof value === "number";
