import type { FriendRelationStatus } from "@/types/friendship";

export type ChatRoomType =
    | "DIRECT"
    | "GROUP"
    | "OPEN";

export type ChatRoomMemberRole =
    | "OWNER"
    | "ADMIN"
    | "MEMBER";

export type ChatRoomSourceType =
    | "MANUAL"
    | "FRIEND"
    | "OPEN"
    | "AI";

export type ChatMessageSenderType =
    | "USER"
    | "AI"
    | "SYSTEM";

export type ChatMessageType =
    | "TEXT"
    | "SYSTEM";

export type ChatMessageStatus =
    | "SENT"
    | "DELETED";

export type ChatMessageTranslationStatus =
    | "PENDING"
    | "COMPLETED"
    | "FAILED";

export type ChatLanguageSettingsSource =
    | "ROOM_OVERRIDE"
    | "DEFAULT"
    | "SYSTEM";

export type OpenChatVisibility = "PUBLIC" | "UNLISTED";

export type OpenChatRoomStatus = "ACTIVE" | "CLOSED";

export type OpenChatJoinBlockedReason =
    | "NONE"
    | "ALREADY_JOINED"
    | "ROOM_CLOSED"
    | "ROOM_FULL"
    | "BANNED";

export interface OpenChatOwnerProfileCreateRequest {
    nickname: string;
    profileImageObjectKey: string | null;
}

export interface OpenChatRoomCreateRequest {
    name: string;
    description: string;
    visibility: OpenChatVisibility;
    maxMemberCount: number;
    ownerProfile: OpenChatOwnerProfileCreateRequest;
}

export interface OpenChatRoomDetail {
    id: number;
    roomType: "OPEN";
    sourceType: "OPEN";
    name: string;
    description: string;
    visibility: OpenChatVisibility;
    status: OpenChatRoomStatus;
    memberCount: number;
    maxMemberCount: number;
    joined: boolean;
    joinable: boolean;
    joinBlockedReason: OpenChatJoinBlockedReason;
    myRole: ChatRoomMemberRole | null;
    ownerProfile: OpenChatMemberProfile | null;
    myOpenProfile: OpenChatMemberProfile | null;
    lastActivityAt: string;
    createdAt: string;
    updatedAt: string;
    ai?: ChatAiRoomSummary | null;
}

export interface OpenChatRoomListItem {
    id: number;
    roomType: "OPEN";
    sourceType: "OPEN";
    name: string;
    description: string;
    visibility: OpenChatVisibility;
    status: OpenChatRoomStatus;
    memberCount: number;
    maxMemberCount: number;
    joined: boolean;
    joinable: boolean;
    joinBlockedReason: OpenChatJoinBlockedReason;
    lastActivityAt: string;
    ownerProfile: OpenChatMemberProfile;
    ai?: ChatAiRoomSummary | null;
}

export interface OpenChatRoomListResponse {
    openChatRooms: OpenChatRoomListItem[];
    nextCursorId: number | null;
    hasNext: boolean;
}

export interface OpenChatJoinProfileRequest {
    nickname: string;
    profileImageObjectKey: string | null;
}

export interface OpenChatJoinRequest {
    profile?: OpenChatJoinProfileRequest | null;
}

export interface OpenChatMembershipResponse {
    roomId: number;
    active: boolean;
    role: ChatRoomMemberRole;
    profile: OpenChatMemberProfile;
}

export interface OpenChatOwnerTransferRequest {
    targetOpenChatMemberId: number;
}

export interface OpenChatMemberProfile {
    openChatMemberId: number;
    memberCode: string;
    nickname: string;
    profileImageUrl: string | null;
    role: ChatRoomMemberRole;
    active: boolean;
    joinedAt: string;
    online?: boolean | null;
}

export type OpenChatProfileSnapshot = Pick<
    OpenChatMemberProfile,
    | "openChatMemberId"
    | "memberCode"
    | "nickname"
    | "profileImageUrl"
    | "role"
>;

export interface OpenChatMemberListResponse {
    members: OpenChatMemberProfile[];
    aiMembers?: ChatAiDisplayMember[];
    aiDisclosureType?: ChatAiDisclosureType | null;
}

export interface OpenChatBanCreateRequest {
    targetOpenChatMemberId: number;
    reason: string;
}

export interface OpenChatBanActionResponse {
    roomId: number;
    banId: number;
    targetOpenChatMemberId: number;
    active: boolean;
    bannedAt: string;
    releasedAt: string | null;
}

export interface OpenChatBanActor {
    openChatMemberId: number;
    nickname: string;
    role: ChatRoomMemberRole;
}

export interface OpenChatBanListItem {
    banId: number;
    targetOpenChatMemberId: number;
    memberCode: string;
    nickname: string;
    profileImageUrl: string | null;
    lastJoinedAt: string;
    bannedAt: string;
    bannedBy: OpenChatBanActor;
    reason: string;
    releasable: boolean;
}

export interface OpenChatBanListResponse {
    items: OpenChatBanListItem[];
    nextCursorId: number | null;
    hasNext: boolean;
}

export interface OpenChatMessageSender {
    openChatMemberId: number;
    memberCode: string;
    nickname: string;
    profileImageUrl: string | null;
    role: ChatRoomMemberRole;
}

export type OpenChatProfileFormMode =
    | "create-owner"
    | "join"
    | "rejoin"
    | "edit";

export interface OpenChatProfileFormValue {
    nickname: string;
    imageFile: File | null;
    removeImage: boolean;
}

export interface OpenChatProfileUpdateRequest {
    nickname: string;
}

export interface DirectPartnerProfile {
    userId: number;
    publicId: string;
    displayName: string;
    profileImageUrl: string | null;
    profileBackgroundImageUrl: string | null;
    bio: string | null;
    online?: boolean | null;
}

export interface ChatRoomMemberProfile {
    userId: number;
    publicId: string;
    displayName: string;
    profileImageUrl: string | null;
    profileBackgroundImageUrl: string | null;
    bio: string | null;
    friendStatus: FriendRelationStatus;
    online?: boolean | null;
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
     * 현재 로그인 사용자의 채팅방 역할.
     * BE #40 이후 채팅방 메뉴의 초대 권한 판단에 사용한다.
     */
    myRole?: ChatRoomMemberRole | null;

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
    unreadCount: number;
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
    publicId: string | null;
    displayName: string;
    profileImageUrl: string | null;
    role: ChatRoomMemberRole;
    active: boolean;
    joinedAt: string;
    leftAt: string | null;
    online?: boolean | null;

    /**
     * BE #40 이전 응답과의 과도기 호환 필드.
     */
    name?: string;
    email?: string;
}

export interface ChatRoomMemberListResponse {
    members: ChatRoomMember[];
    aiMembers?: ChatAiDisplayMember[];
    aiDisclosureType?: ChatAiDisclosureType | null;
}

export interface ChatRoomMemberInvitationRequest {
    targetUserIds: number[];
    targetPublicIds: string[];
}

export interface ChatRoomGroupConversionRequest
    extends ChatRoomMemberInvitationRequest {
    name: string;
    description?: string | null;
}

export interface ChatRoomInvitedMember {
    userId: number;
    publicId: string;
    displayName: string;
    profileImageUrl: string | null;
    joinedAt: string;
}

export interface ChatRoomInvitationResponse {
    roomId: number;
    createdNewGroupRoom: boolean;
    invitedMembers: ChatRoomInvitedMember[];
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
     * FE #35: 화면 표시용 적용 근거.
     * BE 응답에는 없어도 된다.
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
     * FE #35: 화면 표시용 적용 근거.
     * BE 응답에는 없어도 된다.
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
    senderAiMemberId: number | null;
    senderName: string | null;
    senderEmail: string | null;
    senderProfileImageUrl: string | null;
    senderType: ChatMessageSenderType;
    messageType: ChatMessageType;
    content: string;
    status: ChatMessageStatus;
    unreadMemberCount: number | null;
    translations: ChatMessageTranslation[];
    createdAt: string;
    updatedAt: string;
    sender?: OpenChatMessageSender | null;
}

export interface ChatMessageListResponse {
    messages: ChatMessage[];
    nextCursorId: number | null;
    hasNext: boolean;
}

export interface ChatMessageCreateRequest {
    content: string;
}

export interface ChatRoomReadRequest {
    lastReadMessageId: number;
}

export interface ChatRoomReadResponse {
    chatRoomId: number;
    lastReadMessageId: number;
    lastReadAt: string;
    unreadCount: number;
}

export type ChatAiDisclosureType = "PUBLIC" | "PRIVATE";

export type ChatAiMentionPermission =
    | "ALL_MEMBERS"
    | "OWNER_ADMIN_ONLY";

export interface ChatAiRoomSummary {
    aiEnabled: boolean;
    aiMemberCount: number;
    disclosureType: ChatAiDisclosureType | null;
}

export interface ChatAiDisplayMember {
    aiMemberId: number;
    nickname: string;
    profileImageUrl: string | null;
    role: ChatRoomMemberRole;
    active: boolean;
    joinedAt: string;
}

export interface ChatAiSafeProfile {
    aiMemberId: number;
    nickname: string;
    profileImageUrl: string | null;
    profileBackgroundImageUrl: string | null;
    bio: string | null;
    originalLanguageCode: string;
    active: boolean;
    joinedAt: string;
}

export interface ChatAiMember {
    aiMemberId: number;
    aiAgentId: number;
    chatRoomId: number;
    nickname: string;
    profileImageUrl: string | null;
    profileBackgroundImageUrl: string | null;
    bio: string | null;
    originalLanguageCode: string;
    personaPrompt: string;
    active: boolean;
    joinedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface ChatAiMemberListResponse {
    chatRoomId: number;
    currentCount: number;
    maxCount: number;
    members: ChatAiMember[];
}

export interface ChatAiMemberCreateRequest {
    nickname: string;
    bio: string | null;
    originalLanguageCode: string;
    personaPrompt: string;
}

export type ChatAiMemberUpdateRequest = ChatAiMemberCreateRequest;

export interface ChatRoomAiSetting {
    chatRoomId: number;
    aiEnabled: boolean;
    currentAiMemberCount: number;
    maxAiMembersPerRoom: number;
    disclosureType: ChatAiDisclosureType;
    mentionPermission: ChatAiMentionPermission;
    conversationEnabled: boolean;
    revivalEnabled: boolean;
}

export interface ChatRoomAiSettingUpdateRequest {
    disclosureType?: ChatAiDisclosureType;
    mentionPermission?: ChatAiMentionPermission;
    conversationEnabled?: boolean;
    revivalEnabled?: boolean;
}

export interface ChatAiSystemSetting {
    maxAiMembersPerRoom: number;
    conversationResponseRate: number;
    conversationCooldownSeconds: number;
    conversationMinHumanMessagesAfterAi: number;
    responseDelayEnabled: boolean;
    responseDelayMinMillis: number;
    responseDelayMaxMillis: number;
    revivalFirstDelayHours: number;
    revivalSecondDelayHours: number;
    revivalThirdDelayHours: number;
    revivalAllowedStartTime: string;
    revivalAllowedEndTime: string;
    contextMaxMessages: number;
    contextMaxCharacters: number;
    replyMaxCharacters: number;
    mentionRateLimitCount: number;
    mentionRateLimitWindowSeconds: number;
}

export type ChatAiSystemSettingUpdateRequest = Partial<ChatAiSystemSetting>;
