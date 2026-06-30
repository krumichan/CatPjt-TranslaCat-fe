import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    FriendDirectChatRoomResponse,
    FriendGroupChatRoomCreateRequest,
    FriendGroupChatRoomResponse,
} from "@/types/social";

export const friendChatService = {
    createOrGetDirectRoom: async (
        friendUserId: number,
    ): Promise<FriendDirectChatRoomResponse> => {
        const response = await apiClient(
            `/chat/friends/${friendUserId}/direct-room`,
            {
                method: "POST",
            },
        );

        return parseResponseBody<FriendDirectChatRoomResponse>(
            response,
            "FriendChat",
        );
    },

    createGroupRoom: async (
        request: FriendGroupChatRoomCreateRequest,
    ): Promise<FriendGroupChatRoomResponse> => {
        const response = await apiClient("/chat/friends/group-rooms", {
            method: "POST",
            body: JSON.stringify(request),
        });

        return parseResponseBody<FriendGroupChatRoomResponse>(
            response,
            "FriendChat",
        );
    },
};
