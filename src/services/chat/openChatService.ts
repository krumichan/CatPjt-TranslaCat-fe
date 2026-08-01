import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    OpenChatBanActionResponse,
    OpenChatBanCreateRequest,
    OpenChatBanListResponse,
    OpenChatJoinRequest,
    OpenChatMemberListResponse,
    OpenChatMemberProfile,
    OpenChatMembershipResponse,
    OpenChatOwnerTransferRequest,
    OpenChatProfileUpdateRequest,
    OpenChatRoomCreateRequest,
    OpenChatRoomDetail,
    OpenChatRoomListResponse,
} from "@/types/chat";

export const openChatService = {
    getPublicRooms: async ({
        keyword,
        cursorId,
        size = 20,
    }: {
        keyword?: string | null;
        cursorId?: number | null;
        size?: number;
    } = {}): Promise<OpenChatRoomListResponse> => {
        const searchParams = new URLSearchParams();
        const normalizedKeyword = keyword?.trim();

        if (normalizedKeyword) {
            searchParams.set("keyword", normalizedKeyword);
        }
        if (cursorId != null) {
            searchParams.set("cursorId", String(cursorId));
        }
        searchParams.set("size", String(size));

        const response = await apiClient(
            `/chat/open-rooms?${searchParams.toString()}`,
            { method: "GET" },
        );

        return parseResponseBody<OpenChatRoomListResponse>(
            response,
            "OpenChatRoomList",
        );
    },

    getRoomDetail: async (
        roomId: number,
    ): Promise<OpenChatRoomDetail> => {
        const response = await apiClient(`/chat/open-rooms/${roomId}`, {
            method: "GET",
        });

        return parseResponseBody<OpenChatRoomDetail>(
            response,
            "OpenChatRoomDetail",
        );
    },

    createRoom: async (
        request: OpenChatRoomCreateRequest,
    ): Promise<OpenChatRoomDetail> => {
        const response = await apiClient(
            "/chat/open-rooms",
            {
                method: "POST",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<OpenChatRoomDetail>(
            response,
            "OpenChatRoomCreate",
        );
    },

    joinRoom: async (
        roomId: number,
        request?: OpenChatJoinRequest | null,
    ): Promise<OpenChatRoomDetail> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/join`,
            {
                method: "POST",
                body: request ? JSON.stringify(request) : undefined,
            },
        );

        return parseResponseBody<OpenChatRoomDetail>(
            response,
            "OpenChatJoin",
        );
    },

    leaveRoom: async (
        roomId: number,
    ): Promise<OpenChatMembershipResponse> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/leave`,
            { method: "DELETE" },
        );

        return parseResponseBody<OpenChatMembershipResponse>(
            response,
            "OpenChatLeave",
        );
    },

    transferOwner: async (
        roomId: number,
        request: OpenChatOwnerTransferRequest,
    ): Promise<OpenChatRoomDetail> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/owner-transfer`,
            {
                method: "POST",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<OpenChatRoomDetail>(
            response,
            "OpenChatOwnerTransfer",
        );
    },

    closeRoom: async (
        roomId: number,
    ): Promise<OpenChatRoomDetail> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/close`,
            { method: "POST" },
        );

        return parseResponseBody<OpenChatRoomDetail>(
            response,
            "OpenChatClose",
        );
    },

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

    assignAdmin: async (
        roomId: number,
        openChatMemberId: number,
    ): Promise<OpenChatMemberProfile> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/admins/${openChatMemberId}`,
            { method: "POST" },
        );

        return parseResponseBody<OpenChatMemberProfile>(
            response,
            "OpenChatAssignAdmin",
        );
    },

    revokeAdmin: async (
        roomId: number,
        openChatMemberId: number,
    ): Promise<OpenChatMemberProfile> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/admins/${openChatMemberId}`,
            { method: "DELETE" },
        );

        return parseResponseBody<OpenChatMemberProfile>(
            response,
            "OpenChatRevokeAdmin",
        );
    },

    banMember: async (
        roomId: number,
        request: OpenChatBanCreateRequest,
    ): Promise<OpenChatBanActionResponse> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/bans`,
            {
                method: "POST",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<OpenChatBanActionResponse>(
            response,
            "OpenChatBan",
        );
    },

    getActiveBans: async (
        roomId: number,
        {
            keyword,
            cursorId,
            size = 20,
        }: {
            keyword?: string | null;
            cursorId?: number | null;
            size?: number;
        } = {},
    ): Promise<OpenChatBanListResponse> => {
        const searchParams = new URLSearchParams();
        const normalizedKeyword = keyword?.trim();

        if (normalizedKeyword) {
            searchParams.set("keyword", normalizedKeyword);
        }
        if (cursorId != null) {
            searchParams.set("cursor", String(cursorId));
        }
        searchParams.set("size", String(size));

        const response = await apiClient(
            `/chat/open-rooms/${roomId}/bans?${searchParams.toString()}`,
            { method: "GET" },
        );

        return parseResponseBody<OpenChatBanListResponse>(
            response,
            "OpenChatBanList",
        );
    },

    releaseBan: async (
        roomId: number,
        banId: number,
    ): Promise<OpenChatBanActionResponse> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/bans/${banId}/release`,
            { method: "PATCH" },
        );

        return parseResponseBody<OpenChatBanActionResponse>(
            response,
            "OpenChatBanRelease",
        );
    },
};
