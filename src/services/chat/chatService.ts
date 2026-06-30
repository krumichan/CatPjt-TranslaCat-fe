import { apiClient } from "@/lib/apiClient";
import type {
    ChatLanguageSettings,
    ChatLanguageSettingsUpdateRequest,
    ChatMessage,
    ChatMessageCreateRequest,
    ChatMessageListResponse,
    ChatMessageTranslation,
    ChatRoom,
    ChatRoomCreateRequest,
    ChatRoomListResponse,
    ChatRoomMemberListResponse,
} from "@/types/chat";
import type { ResponseDto } from "@/types/common";

async function parseBody<T>(response: Response): Promise<T> {
    if (!response.ok) {
        throw new Error(`Chat API request failed. status=${response.status}`);
    }

    const data = (await response.json()) as ResponseDto<T>;
    return data.body;
}

export const chatService = {
    createRoom: async (request: ChatRoomCreateRequest): Promise<ChatRoom> => {
        const response = await apiClient("/chat/rooms", {
            method: "POST",
            body: JSON.stringify(request),
        });

        return parseBody<ChatRoom>(response);
    },

    getRooms: async (): Promise<ChatRoomListResponse> => {
        const response = await apiClient("/chat/rooms", {
            method: "GET",
        });

        return parseBody<ChatRoomListResponse>(response);
    },

    getRoom: async (roomId: string | number): Promise<ChatRoom> => {
        const response = await apiClient(`/chat/rooms/${roomId}`, {
            method: "GET",
        });

        return parseBody<ChatRoom>(response);
    },

    getMembers: async (
        roomId: string | number,
    ): Promise<ChatRoomMemberListResponse> => {
        const response = await apiClient(`/chat/rooms/${roomId}/members`, {
            method: "GET",
        });

        return parseBody<ChatRoomMemberListResponse>(response);
    },

    getMyLanguageSettings: async (
        roomId: string | number,
    ): Promise<ChatLanguageSettings> => {
        const response = await apiClient(
            `/chat/rooms/${roomId}/members/me/language`,
            {
                method: "GET",
            },
        );

        return parseBody<ChatLanguageSettings>(response);
    },

    updateMyLanguageSettings: async (
        roomId: string | number,
        request: ChatLanguageSettingsUpdateRequest,
    ): Promise<ChatLanguageSettings> => {
        const response = await apiClient(
            `/chat/rooms/${roomId}/members/me/language`,
            {
                method: "PATCH",
                body: JSON.stringify(request),
            },
        );

        return parseBody<ChatLanguageSettings>(response);
    },

    resetMyLanguageSettings: async (
        roomId: string | number,
    ): Promise<ChatLanguageSettings> => {
        const response = await apiClient(
            `/chat/rooms/${roomId}/members/me/language`,
            {
                method: "DELETE",
            },
        );

        return parseBody<ChatLanguageSettings>(response);
    },

    getMessages: async (
        roomId: string | number,
        cursorId?: number | null,
    ): Promise<ChatMessageListResponse> => {
        const searchParams = new URLSearchParams();

        if (cursorId != null) {
            searchParams.set("cursorId", String(cursorId));
        }

        const query = searchParams.toString();
        const endpoint = query
            ? `/chat/rooms/${roomId}/messages?${query}`
            : `/chat/rooms/${roomId}/messages`;

        const response = await apiClient(endpoint, {
            method: "GET",
        });

        return parseBody<ChatMessageListResponse>(response);
    },

    createMessage: async (
        roomId: string | number,
        request: ChatMessageCreateRequest,
    ): Promise<ChatMessage> => {
        const response = await apiClient(`/chat/rooms/${roomId}/messages`, {
            method: "POST",
            body: JSON.stringify(request),
        });

        return parseBody<ChatMessage>(response);
    },

    retryMessageTranslation: async (
        roomId: string | number,
        messageId: string | number,
        languageCode: string,
    ): Promise<ChatMessageTranslation> => {
        const response = await apiClient(
            `/chat/rooms/${roomId}/messages/${messageId}/translations/${languageCode}/retry`,
            {
                method: "POST",
            },
        );

        return parseBody<ChatMessageTranslation>(response);
    },
};
