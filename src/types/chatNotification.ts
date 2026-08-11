import type {
    ChatMessageType,
    ChatRoomSourceType,
    ChatRoomType,
} from "@/types/chat";

export type ChatNotificationActivityType =
    | "CHAT_INVITATION"
    | "OPEN_CHAT_KICKED"
    | "OPEN_CHAT_ROLE_CHANGED"
    | "OPEN_CHAT_ROOM_CLOSED";

export interface ChatNotificationSummary {
    unreadChatMessageCount: number;
    unreadChatRoomCount: number;
    unreadActivityCount: number;
    totalAttentionCount: number;
}

export interface ChatNotificationLatestMessage {
    id: number;
    senderDisplayName: string | null;
    messageType: ChatMessageType;
    contentPreview: string;
    createdAt: string;
}

export interface ChatNotificationChatItem {
    roomId: number;
    roomType: ChatRoomType;
    sourceType: ChatRoomSourceType;
    roomDisplayName: string;
    roomAvatarUrl: string | null;
    latestMessage: ChatNotificationLatestMessage;
    unreadCount: number;
    firstUnreadMessageId: number | null;
}

export interface ChatNotificationChatListResponse {
    items: ChatNotificationChatItem[];
    nextCursorMessageId: number | null;
    hasNext: boolean;
}

export interface ChatNotificationActivityItem {
    id: number;
    notificationType: ChatNotificationActivityType;
    roomId: number | null;
    payload: Record<string, unknown>;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
}

export interface ChatNotificationActivityListResponse {
    items: ChatNotificationActivityItem[];
    nextCursorId: number | null;
    hasNext: boolean;
}

export interface ChatNotificationActivityReadAllResponse {
    updatedCount: number;
}
