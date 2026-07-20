import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    ChatRoomGroupConversionRequest,
    ChatRoomInvitationResponse,
} from "@/types/chat";

export const chatRoomInvitationService = {
    convertDirectToGroup: async (
        roomId: number,
        request: ChatRoomGroupConversionRequest,
    ): Promise<ChatRoomInvitationResponse> => {
        const response = await apiClient(
            `/chat/rooms/${roomId}/group-conversion`,
            {
                method: "POST",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<ChatRoomInvitationResponse>(
            response,
            "ChatRoomGroupConversion",
        );
    },
};
