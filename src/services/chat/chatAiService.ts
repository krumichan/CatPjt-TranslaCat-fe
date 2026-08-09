import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    ChatAiMember,
    ChatAiMemberCreateRequest,
    ChatAiMemberListResponse,
    ChatAiMemberUpdateRequest,
    ChatRoomAiSetting,
    ChatRoomAiSettingUpdateRequest,
} from "@/types/chat";

export const chatAiService = {
    getMembers: async (roomId: number): Promise<ChatAiMemberListResponse> => {
        const response = await apiClient(`/chat/rooms/${roomId}/ai-members`, {
            method: "GET",
        });

        return parseResponseBody<ChatAiMemberListResponse>(
            response,
            "ChatAiMemberList",
        );
    },

    getMember: async (
        roomId: number,
        aiMemberId: number,
    ): Promise<ChatAiMember> => {
        const response = await apiClient(
            `/chat/rooms/${roomId}/ai-members/${aiMemberId}`,
            { method: "GET" },
        );

        return parseResponseBody<ChatAiMember>(response, "ChatAiMember");
    },

    createMember: async (
        roomId: number,
        request: ChatAiMemberCreateRequest,
    ): Promise<ChatAiMember> => {
        const response = await apiClient(`/chat/rooms/${roomId}/ai-members`, {
            method: "POST",
            body: JSON.stringify(request),
        });

        return parseResponseBody<ChatAiMember>(response, "ChatAiMemberCreate");
    },

    updateMember: async (
        roomId: number,
        aiMemberId: number,
        request: ChatAiMemberUpdateRequest,
    ): Promise<ChatAiMember> => {
        const response = await apiClient(
            `/chat/rooms/${roomId}/ai-members/${aiMemberId}`,
            {
                method: "PATCH",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<ChatAiMember>(response, "ChatAiMemberUpdate");
    },

    deleteMember: async (
        roomId: number,
        aiMemberId: number,
    ): Promise<ChatAiMember> => {
        const response = await apiClient(
            `/chat/rooms/${roomId}/ai-members/${aiMemberId}`,
            { method: "DELETE" },
        );

        return parseResponseBody<ChatAiMember>(response, "ChatAiMemberDelete");
    },

    uploadProfileImage: async (
        roomId: number,
        aiMemberId: number,
        file: File,
    ): Promise<ChatAiMember> => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await apiClient(
            `/chat/rooms/${roomId}/ai-members/${aiMemberId}/profile-image`,
            { method: "POST", body: formData },
        );

        return parseResponseBody<ChatAiMember>(response, "ChatAiProfileImage");
    },

    deleteProfileImage: async (
        roomId: number,
        aiMemberId: number,
    ): Promise<ChatAiMember> => {
        const response = await apiClient(
            `/chat/rooms/${roomId}/ai-members/${aiMemberId}/profile-image`,
            { method: "DELETE" },
        );

        return parseResponseBody<ChatAiMember>(response, "ChatAiProfileImage");
    },

    uploadBackgroundImage: async (
        roomId: number,
        aiMemberId: number,
        file: File,
    ): Promise<ChatAiMember> => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await apiClient(
            `/chat/rooms/${roomId}/ai-members/${aiMemberId}/profile-background-image`,
            { method: "POST", body: formData },
        );

        return parseResponseBody<ChatAiMember>(
            response,
            "ChatAiBackgroundImage",
        );
    },

    deleteBackgroundImage: async (
        roomId: number,
        aiMemberId: number,
    ): Promise<ChatAiMember> => {
        const response = await apiClient(
            `/chat/rooms/${roomId}/ai-members/${aiMemberId}/profile-background-image`,
            { method: "DELETE" },
        );

        return parseResponseBody<ChatAiMember>(
            response,
            "ChatAiBackgroundImage",
        );
    },

    getRoomSettings: async (roomId: number): Promise<ChatRoomAiSetting> => {
        const response = await apiClient(`/chat/rooms/${roomId}/ai-settings`, {
            method: "GET",
        });

        return parseResponseBody<ChatRoomAiSetting>(
            response,
            "ChatRoomAiSetting",
        );
    },

    updateRoomSettings: async (
        roomId: number,
        request: ChatRoomAiSettingUpdateRequest,
    ): Promise<ChatRoomAiSetting> => {
        const response = await apiClient(`/chat/rooms/${roomId}/ai-settings`, {
            method: "PATCH",
            body: JSON.stringify(request),
        });

        return parseResponseBody<ChatRoomAiSetting>(
            response,
            "ChatRoomAiSettingUpdate",
        );
    },
};
