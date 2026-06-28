import { apiClient } from "@/lib/apiClient";
import type {
    UserBlock,
    UserBlockCreateRequest,
} from "@/types/social";
import { parseResponseBody } from "@/services/common/responseParser";

export const userBlockService = {
    blockUser: async (request: UserBlockCreateRequest): Promise<UserBlock> => {
        const response = await apiClient("/blocks", {
            method: "POST",
            body: JSON.stringify(request),
        });

        return parseResponseBody<UserBlock>(response, "UserBlock");
    },

    getBlocks: async (): Promise<UserBlock[]> => {
        const response = await apiClient("/blocks", {
            method: "GET",
        });

        return parseResponseBody<UserBlock[]>(response, "UserBlock");
    },

    unblockUser: async (blockedUserId: number): Promise<boolean> => {
        const response = await apiClient(`/blocks/${blockedUserId}`, {
            method: "DELETE",
        });

        return parseResponseBody<boolean>(response, "UserBlock");
    },
};
