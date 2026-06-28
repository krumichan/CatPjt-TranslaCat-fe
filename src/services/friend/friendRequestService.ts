import { apiClient } from "@/lib/apiClient";
import type {
    FriendRequest,
    FriendRequestSendRequest,
} from "@/types/social";
import { parseResponseBody } from "@/services/common/responseParser";

export const friendRequestService = {
    sendFriendRequest: async (
        request: FriendRequestSendRequest,
    ): Promise<FriendRequest> => {
        const response = await apiClient("/friend-requests", {
            method: "POST",
            body: JSON.stringify(request),
        });

        return parseResponseBody<FriendRequest>(response, "FriendRequest");
    },

    getReceivedPendingRequests: async (): Promise<FriendRequest[]> => {
        const response = await apiClient("/friend-requests/received", {
            method: "GET",
        });

        return parseResponseBody<FriendRequest[]>(response, "FriendRequest");
    },

    getSentPendingRequests: async (): Promise<FriendRequest[]> => {
        const response = await apiClient("/friend-requests/sent", {
            method: "GET",
        });

        return parseResponseBody<FriendRequest[]>(response, "FriendRequest");
    },

    acceptFriendRequest: async (requestId: number): Promise<FriendRequest> => {
        const response = await apiClient(`/friend-requests/${requestId}/accept`, {
            method: "PATCH",
        });

        return parseResponseBody<FriendRequest>(response, "FriendRequest");
    },

    rejectFriendRequest: async (requestId: number): Promise<FriendRequest> => {
        const response = await apiClient(`/friend-requests/${requestId}/reject`, {
            method: "PATCH",
        });

        return parseResponseBody<FriendRequest>(response, "FriendRequest");
    },

    cancelFriendRequest: async (requestId: number): Promise<FriendRequest> => {
        const response = await apiClient(`/friend-requests/${requestId}/cancel`, {
            method: "PATCH",
        });

        return parseResponseBody<FriendRequest>(response, "FriendRequest");
    },
};
