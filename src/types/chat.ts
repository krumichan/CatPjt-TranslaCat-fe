export type ChatRoomType = "DIRECT" | "GROUP" | "OPEN";

export type ChatRoomMemberRole = "OWNER" | "ADMIN" | "MEMBER";

export type ChatMessageSenderType = "USER" | "AI" | "SYSTEM";

export type ChatMessageType = "TEXT" | "SYSTEM";

export type ChatMessageStatus = "SENT" | "DELETED";

export type ChatMessageTranslationStatus = "PENDING" | "COMPLETED" | "FAILED";

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

export type ChatRoomResponse = ChatRoom;

export interface ChatRoomListResponse {
    chatRooms: ChatRoom[];
}

export interface ChatRoomCreateRequest {
    roomType: ChatRoomType;
    name?: string | null;
    description?: string | null;
    memberUserIds: number[];
}

export interface ChatRoomMember {
    id: number;
    chatRoomId: number;
    userId: number;
    name: string;
    email: string;
    role: ChatRoomMemberRole;
    active: boolean;
    joinedAt: string;
    leftAt: string | null;
}

export interface ChatRoomMemberListResponse {
    members: ChatRoomMember[];
}

export interface ChatLanguageSettings {
    chatRoomId: number;
    userId: number;
    originalLanguageCode: string;
    translationLanguageCode: string;
    showOriginal: boolean;
    showTranslation: boolean;
    roomLanguageSettingApplied: boolean;
}

export interface ChatLanguageSettingsUpdateRequest {
    originalLanguageCode: string;
    translationLanguageCode: string;
    showOriginal: boolean;
    showTranslation: boolean;
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