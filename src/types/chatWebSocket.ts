import type { ChatMessage } from "@/types/chat";

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
    chatRoomId?: number;
    payload?: T;
    data?: T;
    message?: T;
}

export function extractChatMessageFromEvent(
    event: ChatWebSocketEvent<ChatMessage>,
): ChatMessage | null {
    return event.payload ?? event.data ?? event.message ?? null;
}