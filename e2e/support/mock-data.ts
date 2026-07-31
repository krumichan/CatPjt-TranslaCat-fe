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
    roomType: "DIRECT" | "GROUP";
    sourceType: "MANUAL" | "FRIEND";
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
}: {
    id?: number;
    roomType?: "DIRECT" | "GROUP";
    sourceType?: "MANUAL" | "FRIEND";
    name?: string | null;
    description?: string | null;
    memberCount?: number;
    myRole?: "OWNER" | "ADMIN" | "MEMBER" | null;
} = {}) => ({
    id,
    roomType,
    sourceType,
    name,
    description,
    ownerId: TEST_USERS.A.userId,
    active: true,
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
    senderType?: "USER" | "AI" | "SYSTEM";
    messageType?: "TEXT" | "SYSTEM";
    unreadMemberCount?: number | null;
}) => ({
    id,
    chatRoomId: roomId,
    senderUserId: senderType === "USER" ? sender.userId : null,
    senderName: senderType === "USER" ? sender.nickname : null,
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
