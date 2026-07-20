import type { ChatRoom } from "@/types/chat";
import type { FriendRelationStatus } from "@/types/friendship";

export type UserSearchFriendStatus = FriendRelationStatus;

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
    profileBackgroundImageUrl: string | null;
    bio: string | null;
}

export interface UserProfile extends UserSummaryProfile {
    createdAt: string;
    updatedAt: string;
}

export interface UserProfileUpdateRequest {
    nickname: string;
    bio?: string | null;
}

export interface UserSearchResult {
    userId: number;
    publicId: string;
    nickname: string;
    profileImageUrl: string | null;
    profileBackgroundImageUrl?: string | null;
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

    requester?: UserSummaryProfile | null;
    receiver?: UserSummaryProfile | null;

    /*
     * 기존 평탄화 응답과의 호환을 위한 fallback 필드.
     * requester/receiver 객체가 항상 제공되는 구조로 완전히 전환한 후
     * 제거 여부를 검토할 수 있다.
     */
    requesterPublicId?: string;
    requesterNickname?: string;
    requesterProfileImageUrl?: string | null;
    requesterProfileBackgroundImageUrl?: string | null;

    receiverPublicId?: string;
    receiverNickname?: string;
    receiverProfileImageUrl?: string | null;
    receiverProfileBackgroundImageUrl?: string | null;
}

/**
 * FE 친구 목록 화면에서 사용하는 평탄화된 타입.
 *
 * BE의 친구 목록 응답은 FriendResponseDto 형태이며,
 * `{ id, friend: UserSummaryProfileResponseDto, createdAt }` 구조다.
 * 화면에서는 사용하기 편하도록 friendService에서 아래 구조로 변환한다.
 */
export interface Friend {
    id: number;
    friendUserId: number;
    publicId: string;
    nickname: string;
    profileImageUrl: string | null;
    profileBackgroundImageUrl: string | null;
    bio: string | null;
    friendSince: string;
}

export interface FriendApiResponse {
    id: number;
    friend: UserSummaryProfile;
    createdAt: string;
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
    blockedProfileBackgroundImageUrl?: string | null;
    blockedAt: string;
    blockedUser?: UserSummaryProfile | null;
}

export interface FriendGroupChatRoomCreateRequest {
    name: string;
    description?: string;
    memberUserIds: number[];
}

export type FriendDirectChatRoomResponse = ChatRoom;

export type FriendGroupChatRoomResponse = ChatRoom;