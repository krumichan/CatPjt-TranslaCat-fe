import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type { ChatRoomMemberProfile } from "@/types/chat";

export const chatRoomMemberService = {
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
};
