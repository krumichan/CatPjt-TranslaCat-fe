import {apiClient} from "@/lib/apiClient";

export interface FriendDetail {
    profileId: string;
    nickname: string;
    comment: string;
    iconPath: string | null;
    backgroundPath: string | null;
    status: string;
}

const apiPrefix = "/chat/friends";

export const friendService = {
    checkActivation: async (): Promise<boolean> => {
        const response = await apiClient(`${apiPrefix}/check-activation`, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to check activation.");
        }

        const data = await response.json();

        return data.body;
    },

    getFriendTypes: async (): Promise<string[]> => {
        const response = await apiClient(`${apiPrefix}/types`, {
            method: "GET"
        });

        if (!response.ok) {
            throw new Error("Failed to fetch friends types");
        }

        const data = await response.json();

        return data.body;
    },

    getFriends: async (status: string): Promise<FriendDetail[]> => {
        const requestParameters = status != null ? `?status=${status}` : null;

        const response = await apiClient(`${apiPrefix}${requestParameters}`, {
            method: "GET"
        });

        if (!response.ok) {
            throw new Error("Failed to fetch friends.");
        }

        const data = await response.json();

        return data.body;
    },
}