"use client";

import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    UserBlock,
    UserBlockCreateRequest,
    UserSummaryProfile,
} from "@/types/social";

type UserBlockApiResponse = {
    id: number;
    blockedUser: UserSummaryProfile;
    createdAt: string;
};

function toUserBlock(response: UserBlockApiResponse): UserBlock {
    return {
        id: response.id,
        blockedUserId: response.blockedUser.userId,
        blockedPublicId: response.blockedUser.publicId,
        blockedNickname: response.blockedUser.nickname,
        blockedProfileImageUrl: response.blockedUser.profileImageUrl,
        blockedAt: response.createdAt,
        blockedUser: response.blockedUser,
    };
}

export const userBlockService = {
    blockUser: async (
        request: UserBlockCreateRequest,
    ): Promise<UserBlock> => {
        const response = await apiClient("/blocks", {
            method: "POST",
            body: JSON.stringify(request),
        });
        const body = await parseResponseBody<UserBlockApiResponse>(
            response,
            "UserBlock",
        );

        return toUserBlock(body);
    },

    getBlocks: async (): Promise<UserBlock[]> => {
        const response = await apiClient("/blocks", {
            method: "GET",
        });
        const body = await parseResponseBody<UserBlockApiResponse[]>(
            response,
            "UserBlock",
        );

        return body.map(toUserBlock);
    },

    unblockUser: async (blockedUserId: number): Promise<boolean> => {
        const response = await apiClient(`/blocks/${blockedUserId}`, {
            method: "DELETE",
        });

        return parseResponseBody<boolean>(response, "UserBlock");
    },
};
