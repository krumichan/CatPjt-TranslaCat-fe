import type { FriendRequest, UserSummaryProfile } from "@/types/social";

export function getRequesterProfile(
    request: FriendRequest,
): UserSummaryProfile {
    return {
        userId: request.requester?.userId ?? request.requesterUserId,
        publicId:
            request.requester?.publicId ??
            request.requesterPublicId ??
            "-",
        nickname:
            request.requester?.nickname ??
            request.requesterNickname ??
            request.requesterPublicId ??
            "-",
        profileImageUrl:
            request.requester?.profileImageUrl ??
            request.requesterProfileImageUrl ??
            null,
        bio: request.requester?.bio ?? null,
    };
}

export function getReceiverProfile(
    request: FriendRequest,
): UserSummaryProfile {
    return {
        userId: request.receiver?.userId ?? request.receiverUserId,
        publicId:
            request.receiver?.publicId ??
            request.receiverPublicId ??
            "-",
        nickname:
            request.receiver?.nickname ??
            request.receiverNickname ??
            request.receiverPublicId ??
            "-",
        profileImageUrl:
            request.receiver?.profileImageUrl ??
            request.receiverProfileImageUrl ??
            null,
        bio: request.receiver?.bio ?? null,
    };
}