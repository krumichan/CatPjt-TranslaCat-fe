import type { E2ETestUser } from "./test-users";

import { TEST_USERS } from "./test-users";

export const NOW = "2026-07-05T12:00:00.000Z";
export const LATER = "2026-07-05T12:05:00.000Z";

export const responseDto = <T>(
    body: T,
    resultCode = 200,
    message = "OK",
) => ({
    resultCode,
    message,
    body,
    guid: "e2e-guid",
    createDate: NOW,
});

export const errorDto = (
    errorCode: string,
    message = "E2E error",
) => ({
    resultCode: 400,
    message,
    body: {
        errorCode,
        path: "/e2e",
    },
    guid: "e2e-guid",
    createDate: NOW,
});

export const toSummaryProfile = (
    user: E2ETestUser,
) => ({
    userId: user.userId,
    publicId: user.publicId,
    nickname: user.nickname,
    profileImageUrl: null,
});

export const toProfile = (
    user: E2ETestUser,
) => ({
    ...toSummaryProfile(user),
    bio: `${user.nickname} bio`,
    createdAt: NOW,
    updatedAt: NOW,
});

export const toFriendApi = (
    user: E2ETestUser,
    relationId: number,
) => ({
    id: relationId,
    friend: toSummaryProfile(user),
    createdAt: NOW,
});

export const toFriendRequest = ({
    id,
    requester = TEST_USERS.A,
    receiver = TEST_USERS.B,
}: {
    id: number;
    requester?: E2ETestUser;
    receiver?: E2ETestUser;
}) => ({
    id,
    requesterUserId: requester.userId,
    receiverUserId: receiver.userId,
    status: "PENDING",
    requestedAt: NOW,
    respondedAt: null,
    requester: toSummaryProfile(requester),
    receiver: toSummaryProfile(receiver),
});

export const toBlockApi = (
    user: E2ETestUser,
    id = 9001,
) => ({
    id,
    blockedUser: toSummaryProfile(user),
    createdAt: NOW,
});

export const makeRoomListItem = ({
    id,
    roomType,
    sourceType,
    name,
    description = null,
    memberCount,
    unreadCount = 0,
}: {
    id: number;
    roomType: "DIRECT" | "GROUP" | "OPEN";
    sourceType: "MANUAL" | "FRIEND" | "OPEN" | "AI";
    name: string | null;
    description?: string | null;
    memberCount: number;
    unreadCount?: number;
}) => ({
    id,
    roomType,
    sourceType,
    name,
    description,
    ownerId: TEST_USERS.A.userId,
    memberCount,
    unreadCount,
    createdAt: NOW,
    updatedAt: LATER,
});

export const makeRoom = ({
    id = 501,
    roomType = "DIRECT",
    sourceType = "FRIEND",
    name = null,
    description = null,
    memberCount = 2,
    myRole = null,
    active = true,
    ownerId = TEST_USERS.A.userId,
}: {
    id?: number;
    roomType?: "DIRECT" | "GROUP" | "OPEN";
    sourceType?: "MANUAL" | "FRIEND" | "OPEN" | "AI";
    name?: string | null;
    description?: string | null;
    memberCount?: number;
    myRole?: "OWNER" | "ADMIN" | "MEMBER" | null;
    active?: boolean;
    ownerId?: number | null;
} = {}) => ({
    id,
    roomType,
    sourceType,
    name,
    description,
    ownerId,
    active,
    originalLanguageCode: "ko",
    translationLanguageCode: "ja",
    roomLanguageSettingApplied: true,
    memberCount,
    myRole,
    createdAt: NOW,
    updatedAt: LATER,
});

export const makeDefaultLanguageSettings = (
    overrides: Record<string, unknown> = {},
) => ({
    userId: TEST_USERS.A.userId,
    originalLanguageCode: "ko",
    translationLanguageCode: "ja",
    showOriginal: true,
    showTranslation: true,
    source: "DEFAULT",
    ...overrides,
});

export const makeLanguageSettings = (
    overrides: Record<string, unknown> = {},
) => ({
    chatRoomId: 501,
    userId: TEST_USERS.A.userId,
    originalLanguageCode: "ko",
    translationLanguageCode: "ja",
    showOriginal: true,
    showTranslation: true,
    roomLanguageSettingApplied: true,
    ...overrides,
});

export const makeTranslation = ({
    id = 7001,
    languageCode = "ja",
    translatedContent = "こんにちは",
    status = "COMPLETED",
}: {
    id?: number;
    languageCode?: string;
    translatedContent?: string | null;
    status?: "PENDING" | "COMPLETED" | "FAILED";
} = {}) => ({
    id,
    languageCode,
    translatedContent,
    status,
    failureReason:
        status === "FAILED"
            ? "E2E_FAILED"
            : null,
    completedAt:
        status === "COMPLETED"
            ? LATER
            : null,
});

export const makeMessage = ({
    id,
    roomId = 501,
    sender = TEST_USERS.B,
    content,
    translations = [],
    senderProfileImageUrl = null,
    senderAiMemberId = null,
    senderName = null,
    senderType = "USER",
    messageType = "TEXT",
    unreadMemberCount = senderType === "SYSTEM" ? null : 0,
}: {
    id: number;
    roomId?: number;
    sender?: E2ETestUser;
    content: string;
    translations?: ReturnType<
        typeof makeTranslation
    >[];
    senderProfileImageUrl?: string | null;
    senderAiMemberId?: number | null;
    senderName?: string | null;
    senderType?: "USER" | "AI" | "SYSTEM";
    messageType?: "TEXT" | "SYSTEM";
    unreadMemberCount?: number | null;
}) => ({
    id,
    chatRoomId: roomId,
    senderUserId: senderType === "USER" ? sender.userId : null,
    senderAiMemberId: senderType === "AI" ? senderAiMemberId : null,
    senderName:
        senderType === "USER"
            ? sender.nickname
            : senderType === "AI"
              ? senderName
              : null,
    senderEmail: senderType === "USER" ? sender.email : null,
    senderProfileImageUrl,
    senderType,
    messageType,
    content,
    status: "SENT",
    unreadMemberCount,
    translations,
    createdAt: NOW,
    updatedAt: LATER,
});


export const makeOpenChatProfile = ({
    openChatMemberId,
    memberCode,
    nickname,
    profileImageUrl = null,
    role = "MEMBER",
    active = true,
    joinedAt = NOW,
}: {
    openChatMemberId: number;
    memberCode: string;
    nickname: string;
    profileImageUrl?: string | null;
    role?: "OWNER" | "ADMIN" | "MEMBER";
    active?: boolean;
    joinedAt?: string;
}) => ({
    openChatMemberId,
    memberCode,
    nickname,
    profileImageUrl,
    role,
    active,
    joinedAt,
});

export const makeOpenChatRoomListItem = ({
    id,
    name = `OPEN room ${id}`,
    description = `OPEN room ${id} description`,
    visibility = "PUBLIC",
    status = "ACTIVE",
    memberCount = 2,
    maxMemberCount = 50,
    joined = false,
    joinable = true,
    joinBlockedReason = "NONE",
    ownerProfile = makeOpenChatProfile({
        openChatMemberId: id * 10 + 1,
        memberCode: `OC-${id}-OWNER`,
        nickname: `Owner ${id}`,
        role: "OWNER",
    }),
}: {
    id: number;
    name?: string;
    description?: string;
    visibility?: "PUBLIC" | "UNLISTED";
    status?: "ACTIVE" | "CLOSED";
    memberCount?: number;
    maxMemberCount?: number;
    joined?: boolean;
    joinable?: boolean;
    joinBlockedReason?:
        | "NONE"
        | "ALREADY_JOINED"
        | "ROOM_CLOSED"
        | "ROOM_FULL"
        | "BANNED";
    ownerProfile?: ReturnType<typeof makeOpenChatProfile>;
}) => ({
    id,
    roomType: "OPEN" as const,
    sourceType: "OPEN" as const,
    name,
    description,
    visibility,
    status,
    memberCount,
    maxMemberCount,
    joined,
    joinable,
    joinBlockedReason,
    lastActivityAt: LATER,
    ownerProfile,
});

export const makeOpenChatRoomDetail = ({
    id,
    name = `OPEN room ${id}`,
    description = `OPEN room ${id} description`,
    visibility = "PUBLIC",
    status = "ACTIVE",
    memberCount = 2,
    maxMemberCount = 50,
    joined = false,
    joinable = true,
    joinBlockedReason = "NONE",
    myRole = null,
    ownerProfile = makeOpenChatProfile({
        openChatMemberId: id * 10 + 1,
        memberCode: `OC-${id}-OWNER`,
        nickname: `Owner ${id}`,
        role: "OWNER",
    }),
    myOpenProfile = null,
}: {
    id: number;
    name?: string;
    description?: string;
    visibility?: "PUBLIC" | "UNLISTED";
    status?: "ACTIVE" | "CLOSED";
    memberCount?: number;
    maxMemberCount?: number;
    joined?: boolean;
    joinable?: boolean;
    joinBlockedReason?:
        | "NONE"
        | "ALREADY_JOINED"
        | "ROOM_CLOSED"
        | "ROOM_FULL"
        | "BANNED";
    myRole?: "OWNER" | "ADMIN" | "MEMBER" | null;
    ownerProfile?: ReturnType<typeof makeOpenChatProfile>;
    myOpenProfile?: ReturnType<typeof makeOpenChatProfile> | null;
}) => ({
    ...makeOpenChatRoomListItem({
        id,
        name,
        description,
        visibility,
        status,
        memberCount,
        maxMemberCount,
        joined,
        joinable,
        joinBlockedReason,
        ownerProfile,
    }),
    myRole,
    myOpenProfile,
    createdAt: NOW,
    updatedAt: LATER,
});

export const makeOpenChatMessage = ({
    id,
    roomId = 501,
    sender,
    content,
    translations = [],
    unreadMemberCount = 0,
}: {
    id: number;
    roomId?: number;
    sender: ReturnType<typeof makeOpenChatProfile>;
    content: string;
    translations?: ReturnType<typeof makeTranslation>[];
    unreadMemberCount?: number | null;
}) => ({
    id,
    chatRoomId: roomId,
    senderUserId: null,
    senderAiMemberId: null,
    senderName: null,
    senderEmail: null,
    senderProfileImageUrl: null,
    senderType: "USER" as const,
    messageType: "TEXT" as const,
    content,
    status: "SENT" as const,
    unreadMemberCount,
    translations,
    createdAt: NOW,
    updatedAt: LATER,
    sender: {
        openChatMemberId: sender.openChatMemberId,
        memberCode: sender.memberCode,
        nickname: sender.nickname,
        profileImageUrl: sender.profileImageUrl,
        role: sender.role,
    },
});
