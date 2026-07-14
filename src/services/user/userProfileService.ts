import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    UserProfile,
    UserProfileUpdateRequest,
} from "@/types/social";

async function parseProfileResponse(
    response: Response,
): Promise<UserProfile> {
    return parseResponseBody<UserProfile>(response, "UserProfile");
}

async function uploadImage(
    endpoint: string,
    file: File,
): Promise<UserProfile> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient(endpoint, {
        method: "POST",
        body: formData,
    });

    return parseProfileResponse(response);
}

async function deleteImage(endpoint: string): Promise<UserProfile> {
    const response = await apiClient(endpoint, {
        method: "DELETE",
    });

    return parseProfileResponse(response);
}

export const userProfileService = {
    getMyProfile: async (): Promise<UserProfile> => {
        const response = await apiClient("/users/me/profile", {
            method: "GET",
        });

        return parseProfileResponse(response);
    },

    updateMyProfile: async (
        request: UserProfileUpdateRequest,
    ): Promise<UserProfile> => {
        const response = await apiClient("/users/me/profile", {
            method: "PATCH",
            body: JSON.stringify(request),
        });

        return parseProfileResponse(response);
    },

    uploadProfileImage: async (file: File): Promise<UserProfile> =>
        uploadImage("/users/me/profile-image", file),

    deleteProfileImage: async (): Promise<UserProfile> =>
        deleteImage("/users/me/profile-image"),

    uploadProfileBackgroundImage: async (
        file: File,
    ): Promise<UserProfile> =>
        uploadImage("/users/me/profile-background-image", file),

    deleteProfileBackgroundImage: async (): Promise<UserProfile> =>
        deleteImage("/users/me/profile-background-image"),
};
