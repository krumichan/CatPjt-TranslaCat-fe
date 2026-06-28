import { apiClient } from "@/lib/apiClient";
import type {
    UserProfile,
    UserProfileUpdateRequest,
} from "@/types/social";
import { parseResponseBody } from "@/services/common/responseParser";

export const userProfileService = {
    getMyProfile: async (): Promise<UserProfile> => {
        const response = await apiClient("/users/me/profile", {
            method: "GET",
        });

        return parseResponseBody<UserProfile>(response, "UserProfile");
    },

    updateMyProfile: async (
        request: UserProfileUpdateRequest,
    ): Promise<UserProfile> => {
        const response = await apiClient("/users/me/profile", {
            method: "PATCH",
            body: JSON.stringify(request),
        });

        return parseResponseBody<UserProfile>(response, "UserProfile");
    },
};
