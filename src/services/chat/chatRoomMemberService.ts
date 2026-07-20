import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    ChatRoomInvitationResponse,
    ChatRoomMemberInvitationRequest,
    ChatRoomMemberListResponse,
    ChatRoomMemberProfile,
} from "@/types/chat";

export const chatRoomMemberService = {
    getMembers: async (
        roomId: number,
    ): Promise<ChatRoomMemberListResponse> => {
        const response = await apiClient(
            `/chat/rooms/${roomId}/members`,
            {
                method: "GET",
            },
        );

        return parseResponseBody<ChatRoomMemberListResponse>(
            response,
            "ChatRoomMemberList",
        );
    },

    getMemberProfile: async (
        roomId: number,
        userId: number,
    ): Promise<ChatRoomMemberProfile> => {
        const response = await apiClient(
            `/chat/rooms/${roomId}/members/${userId}/profile`,
            {
                method: "GET",
            },
        );

        return parseResponseBody<ChatRoomMemberProfile>(
            response,
            "ChatRoomMemberProfile",
        );
    },

    inviteMembers: async (
        roomId: number,
        request: ChatRoomMemberInvitationRequest,
    ): Promise<ChatRoomInvitationResponse> => {
        const response = await apiClient(
            `/chat/rooms/${roomId}/members/invitations`,
            {
                method: "POST",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<ChatRoomInvitationResponse>(
            response,
            "ChatRoomInvitation",
        );
    },
};
