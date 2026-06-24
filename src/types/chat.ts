export type ChatRoomType = "DIRECT" | "GROUP" | "OPEN";

export type ChatMessageSenderType = "USER" | "AI" | "SYSTEM";

export type ChatMessageType = "TEXT" | "SYSTEM";

export type ChatMessageStatus = "SENT" | "DELETED";

export type ChatMessageTranslationStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface ApiResponse<T> {
    body: T;
    message?: string;
    status?: number;
}

export interface ChatRoom {
    id: number;
    roomType: ChatRoomType;
    name: string;
    description: string | null;
    ownerId: number | null;
    active: boolean;
    originalLanguageCode: string;
    translationLanguageCode: string;
    roomLanguageSettingApplied: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ChatMessageTranslation {
    id: number;
    languageCode: string;
    translatedContent: string | null;
    status: ChatMessageTranslationStatus;
    failureReason: string | null;
    completedAt: string | null;
}

export interface ChatMessage {
    id: number;
    chatRoomId: number;
    senderUserId: number | null;
    senderName: string | null;
    senderEmail: string | null;
    senderType: ChatMessageSenderType;
    messageType: ChatMessageType;
    content: string;
    status: ChatMessageStatus;
    translations: ChatMessageTranslation[];
    createdAt: string;
    updatedAt: string;
}

export interface ChatMessageListResponse {
    messages: ChatMessage[];
    nextCursorId: number | null;
    hasNext: boolean;
}

export interface ChatMessageCreateRequest {
    content: string;
}