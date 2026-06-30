import { apiClient } from "@/lib/apiClient";
import type { Friend, FriendApiResponse } from "@/types/social";
import { parseResponseBody } from "@/services/common/responseParser";

function toFriend(apiResponse: FriendApiResponse): Friend {
    return {
        id: apiResponse.id,
        friendUserId: apiResponse.friend.userId,
        publicId: apiResponse.friend.publicId,
        nickname: apiResponse.friend.nickname,
        profileImageUrl: apiResponse.friend.profileImageUrl,
        friendSince: apiResponse.createdAt,
    };
}

export const friendService = {
    getFriends: async (): Promise<Friend[]> => {
        const response = await apiClient("/friends", {
            method: "GET",
        });
        const body = await parseResponseBody<FriendApiResponse[]>(
            response,
            "Friend",
        );

        return body.map(toFriend);
    },

    deleteFriend: async (friendUserId: number): Promise<boolean> => {
        const response = await apiClient(`/friends/${friendUserId}`, {
            method: "DELETE",
        });

        return parseResponseBody<boolean>(response, "Friend");
    },
};
