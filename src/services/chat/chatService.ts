import { apiClient } from "@/lib/apiClient";
import type {
    ApiResponse,
    ChatMessage,
    ChatMessageCreateRequest,
    ChatMessageListResponse,
    ChatRoom,
} from "@/types/chat";

async function parseBody<T>(response: Response): Promise<T> {
    if (!response.ok) {
        throw new Error(`Chat API request failed. status=${response.status}`);
    }

    const data = (await response.json()) as ApiResponse<T>;

    return data.body;
}

export const chatService = {
    getRoom: async (roomId: string): Promise<ChatRoom> => {
        const response = await apiClient(`/chat/rooms/${roomId}`);

        return parseBody<ChatRoom>(response);
    },

    getMessages: async (
        roomId: string,
        cursorId?: number | null,
    ): Promise<ChatMessageListResponse> => {
        const searchParams = new URLSearchParams();

        if (cursorId) {
            searchParams.set("cursorId", String(cursorId));
        }

        const query = searchParams.toString();
        const endpoint = query
            ? `/chat/rooms/${roomId}/messages?${query}`
            : `/chat/rooms/${roomId}/messages`;

        const response = await apiClient(endpoint);

        return parseBody<ChatMessageListResponse>(response);
    },

    createMessage: async (
        roomId: string,
        request: ChatMessageCreateRequest,
    ): Promise<ChatMessage> => {
        const response = await apiClient(`/chat/rooms/${roomId}/messages`, {
            method: "POST",
            body: JSON.stringify(request),
        });

        return parseBody<ChatMessage>(response);
    },
};