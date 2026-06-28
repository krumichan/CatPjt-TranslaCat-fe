import { apiClient } from "@/lib/apiClient";
import type { Friend } from "@/types/social";
import { parseResponseBody } from "@/services/common/responseParser";

export const friendService = {
    getFriends: async (): Promise<Friend[]> => {
        const response = await apiClient("/friends", {
            method: "GET",
        });

        return parseResponseBody<Friend[]>(response, "Friend");
    },

    deleteFriend: async (friendUserId: number): Promise<boolean> => {
        const response = await apiClient(`/friends/${friendUserId}`, {
            method: "DELETE",
        });

        return parseResponseBody<boolean>(response, "Friend");
    },
};
