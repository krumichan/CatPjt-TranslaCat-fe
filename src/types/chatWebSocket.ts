import type { ChatMessageTranslation, ChatMessageTranslationStatus, ChatRoomMemberRole } from "@/types/chat";

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
    | "chat.read.updated"
    | "chat.member.read.updated"
    | "chat.members.changed"
    | "chat.open-profile.updated"
    | "chat.member.role.updated"
    | "chat.member.banned"
    | "chat.room.closed"
    | "chat.presence.changed"
    | "chat.notification.created"
    | "chat.error";

export interface ChatWebSocketEvent<T = unknown> {
    eventType?: ChatWebSocketEventType;
    type?: ChatWebSocketEventType;
    roomId?: number;
    chatRoomId?: number;
    payload?: T;
    data?: T;
    message?: T;
    notification?: T;
}

export interface ChatPresenceChangedEvent {
    eventType: "chat.presence.changed";
    roomId: number;
    roomType: "DIRECT" | "GROUP" | "OPEN";
    memberRef: string;
    online: boolean;
    occurredAt: string;
}

export interface ChatReadUpdatedEvent {
    eventType: "chat.read.updated";
    chatRoomId: number;
    userId: number;
    lastReadMessageId: number;
    lastReadAt: string;
    unreadCount: number;
    occurredAt: string;
}

export interface ChatMemberReadUpdatedEvent {
    eventType: "chat.member.read.updated";
    chatRoomId: number;
    readerUserId: number | null;
    readerOpenChatMemberId?: number | null;
    previousLastReadMessageId: number | null;
    lastReadMessageId: number;
    readAt: string;
    occurredAt: string;
}

export interface ChatRoomMembersChangedEvent {
    eventType: "chat.members.changed";
    roomId: number;
    occurredAt: string;
}

export interface OpenChatProfileUpdatedEvent {
    eventType: "chat.open-profile.updated";
    roomId: number;
    openChatMemberId: number;
    memberCode: string;
    nickname: string;
    profileImageUrl: string | null;
    role: ChatRoomMemberRole;
    occurredAt: string;
}

export interface OpenChatMemberRoleUpdatedEvent {
    eventType: "chat.member.role.updated";
    roomId: number;
    targetOpenChatMemberId: number;
    role: ChatRoomMemberRole;
    occurredAt: string;
}

export interface OpenChatMemberBannedEvent {
    eventType: "chat.member.banned";
    roomId: number;
    targetOpenChatMemberId: number;
    reason: string;
    bannedAt: string;
    occurredAt: string;
}

export interface OpenChatRoomClosedEvent {
    eventType: "chat.room.closed";
    roomId: number;
    closedAt: string;
    occurredAt: string;
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
