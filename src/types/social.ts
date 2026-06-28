import type { ChatRoom } from "@/types/chat";

export type UserSearchFriendStatus =
    | "NONE"
    | "FRIEND"
    | "REQUEST_SENT"
    | "REQUEST_RECEIVED"
    | "BLOCKED"
    | "SELF";

export type FriendRequestStatus =
    | "PENDING"
    | "ACCEPTED"
    | "REJECTED"
    | "CANCELED";

export interface UserSummaryProfile {
    userId: number;
    publicId: string;
    nickname: string;
    profileImageUrl: string | null;
}

export interface UserProfile extends UserSummaryProfile {
    bio: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UserProfileUpdateRequest {
    nickname: string;
    profileImageUrl?: string | null;
    bio?: string | null;
}

export interface UserSearchResult {
    userId: number;
    publicId: string;
    nickname: string;
    profileImageUrl: string | null;
    friendStatus: UserSearchFriendStatus;
}

export interface FriendRequestSendRequest {
    receiverPublicId: string;
}

export interface FriendRequest {
    id: number;
    requesterUserId: number;
    receiverUserId: number;
    status: FriendRequestStatus;
    requestedAt: string;
    respondedAt: string | null;

    requester?: UserSummaryProfile;
    receiver?: UserSummaryProfile;

    requesterPublicId?: string;
    requesterNickname?: string;
    requesterProfileImageUrl?: string | null;

    receiverPublicId?: string;
    receiverNickname?: string;
    receiverProfileImageUrl?: string | null;
}

export interface Friend {
    friendUserId: number;
    publicId: string;
    nickname: string;
    profileImageUrl: string | null;
    friendSince: string;
}

export interface UserBlockCreateRequest {
    blockedPublicId: string;
}

export interface UserBlock {
    id: number;
    blockedUserId: number;
    blockedPublicId: string;
    blockedNickname: string;
    blockedProfileImageUrl: string | null;
    blockedAt: string;

    blockedUser?: UserSummaryProfile;
}

export interface FriendGroupChatRoomCreateRequest {
    name?: string | null;
    description?: string | null;
    memberUserIds: number[];
}

export type FriendDirectChatRoomResponse = ChatRoom;
export type FriendGroupChatRoomResponse = ChatRoom;
