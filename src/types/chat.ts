export type ChatRoomType = "DIRECT" | "GROUP" | "OPEN";
export type ChatRoomMemberRole = "OWNER" | "ADMIN" | "MEMBER";
export type ChatRoomSourceType = "MANUAL" | "FRIEND" | "OPEN" | "AI";
export type ChatMessageSenderType = "USER" | "AI" | "SYSTEM";
export type ChatMessageType = "TEXT" | "SYSTEM";
export type ChatMessageStatus = "SENT" | "DELETED";
export type ChatMessageTranslationStatus =
    | "PENDING"
    | "COMPLETED"
    | "FAILED";

export type ChatLanguageSettingsSource =
    | "ROOM_OVERRIDE"
    | "DEFAULT"
    | "SYSTEM";

export interface DirectPartnerProfile {
    userId: number;
    publicId: string;
    displayName: string;
    profileImageUrl: string | null;
}

export interface ChatRoom {
    id: number;
    roomType: ChatRoomType;
    sourceType: ChatRoomSourceType;
    name: string;
    description: string | null;
    ownerId: number | null;
    active: boolean;
    /**
     * Legacy room-wide language fields.
     * FE #35부터 화면 로직에서는 채팅방별 내 언어 설정을 우선 사용한다.
     */
    originalLanguageCode: string;
    translationLanguageCode: string;
    roomLanguageSettingApplied: boolean;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
    /**
     * FRIEND DIRECT 방에서만 현재 로그인 사용자를 제외한 상대 사용자 정보.
     */
    directPartner?: DirectPartnerProfile | null;
}

export interface ChatRoomListItem {
    id: number;
    roomType: ChatRoomType;
    sourceType: ChatRoomSourceType;
    name: string | null;
    description: string | null;
    ownerId: number | null;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
    /**
     * FRIEND DIRECT 방에서만 현재 로그인 사용자를 제외한 상대 사용자 정보.
     */
    directPartner?: DirectPartnerProfile | null;
}

export interface ChatRoomListResponse {
    chatRooms: ChatRoomListItem[];
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

export interface ChatLanguageSettingsUpdateRequest {
    originalLanguageCode: string;
    translationLanguageCode: string;
    showOriginal: boolean;
    showTranslation: boolean;
}

export type ChatDefaultLanguageSettingsUpdateRequest =
    ChatLanguageSettingsUpdateRequest;

export interface ChatDefaultLanguageSettings {
    userId: number;
    originalLanguageCode: string;
    translationLanguageCode: string;
    showOriginal: boolean;
    showTranslation: boolean;
    /**
     * FE #35: 화면 표시용 적용 근거. BE 응답에는 없어도 된다.
     */
    source?: ChatLanguageSettingsSource;
}

export interface ChatLanguageSettings {
    chatRoomId: number;
    userId: number;
    originalLanguageCode: string;
    translationLanguageCode: string;
    showOriginal: boolean;
    showTranslation: boolean;
    /**
     * true면 채팅방별 내 override 설정이 저장되어 있다는 의미다.
     */
    roomLanguageSettingApplied: boolean;
    /**
     * FE #35: 화면 표시용 적용 근거. BE 응답에는 없어도 된다.
     */
    source?: ChatLanguageSettingsSource;
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
    senderProfileImageUrl: string | null;
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
