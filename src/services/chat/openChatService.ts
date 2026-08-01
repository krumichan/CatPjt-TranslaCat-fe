import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    OpenChatMemberListResponse,
    OpenChatMemberProfile,
    OpenChatProfileUpdateRequest,
} from "@/types/chat";

export const openChatService = {
    getMyProfile: async (
        roomId: number,
    ): Promise<OpenChatMemberProfile> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/me/profile`,
            { method: "GET" },
        );

        return parseResponseBody<OpenChatMemberProfile>(
            response,
            "OpenChatMyProfile",
        );
    },

    updateMyProfile: async (
        roomId: number,
        request: OpenChatProfileUpdateRequest,
    ): Promise<OpenChatMemberProfile> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/me/profile`,
            {
                method: "PATCH",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<OpenChatMemberProfile>(
            response,
            "OpenChatMyProfile",
        );
    },

    uploadMyProfileImage: async (
        roomId: number,
        file: File,
    ): Promise<OpenChatMemberProfile> => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await apiClient(
            `/chat/open-rooms/${roomId}/me/profile-image`,
            {
                method: "POST",
                body: formData,
            },
        );

        return parseResponseBody<OpenChatMemberProfile>(
            response,
            "OpenChatProfileImage",
        );
    },

    deleteMyProfileImage: async (
        roomId: number,
    ): Promise<OpenChatMemberProfile> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/me/profile-image`,
            { method: "DELETE" },
        );

        return parseResponseBody<OpenChatMemberProfile>(
            response,
            "OpenChatProfileImage",
        );
    },

    getMembers: async (
        roomId: number,
    ): Promise<OpenChatMemberListResponse> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/members`,
            { method: "GET" },
        );

        return parseResponseBody<OpenChatMemberListResponse>(
            response,
            "OpenChatMemberList",
        );
    },

    getMemberProfile: async (
        roomId: number,
        openChatMemberId: number,
    ): Promise<OpenChatMemberProfile> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/members/${openChatMemberId}`,
            { method: "GET" },
        );

        return parseResponseBody<OpenChatMemberProfile>(
            response,
            "OpenChatMemberProfile",
        );
    },
};
