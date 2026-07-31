import { apiClient } from "@/lib/apiClient";

import type {
    ChatDefaultLanguageSettings,
    ChatDefaultLanguageSettingsUpdateRequest,
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
    ChatRoomReadRequest,
    ChatRoomReadResponse,
} from "@/types/chat";
import type { ResponseDto } from "@/types/common";
import { normalizeChatLanguageSettingsRequest } from "@/utils/chat/chatLanguageSettings";

export class ChatApiError extends Error {
    status: number;

    constructor(status: number) {
        super(`Chat API request failed. status=${status}`);
        this.name = "ChatApiError";
        this.status = status;
    }
}

export const isChatApiNotFoundError = (error: unknown) =>
    error instanceof ChatApiError && error.status === 404;

async function parseBody<T>(response: Response): Promise<T> {
    if (!response.ok) {
        throw new ChatApiError(response.status);
    }

    const data = (await response.json()) as ResponseDto<T>;
    return data.body;
}

async function requestWithLegacyFallback<T>(
    primaryRequest: () => Promise<T>,
    legacyRequest: () => Promise<T>,
): Promise<T> {
    try {
        return await primaryRequest();
    } catch (error) {
        if (isChatApiNotFoundError(error)) {
            return legacyRequest();
        }

        throw error;
    }
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

    getMyDefaultLanguageSettings:
        async (): Promise<ChatDefaultLanguageSettings> => {
            const response = await apiClient(
                "/users/me/chat-language-settings",
                {
                    method: "GET",
                },
            );
            return parseBody<ChatDefaultLanguageSettings>(response);
        },

    updateMyDefaultLanguageSettings: async (
        request: ChatDefaultLanguageSettingsUpdateRequest,
    ): Promise<ChatDefaultLanguageSettings> => {
        const response = await apiClient("/users/me/chat-language-settings", {
            method: "PATCH",
            body: JSON.stringify(
                normalizeChatLanguageSettingsRequest(request),
            ),
        });
        return parseBody<ChatDefaultLanguageSettings>(response);
    },

    getMyLanguageSettings: async (
        roomId: string | number,
    ): Promise<ChatLanguageSettings> => {
        return requestWithLegacyFallback(
            async () => {
                const response = await apiClient(
                    `/chat/rooms/${roomId}/language-settings`,
                    {
                        method: "GET",
                    },
                );
                return parseBody<ChatLanguageSettings>(response);
            },
            async () => {
                const response = await apiClient(
                    `/chat/rooms/${roomId}/members/me/language`,
                    {
                        method: "GET",
                    },
                );
                return parseBody<ChatLanguageSettings>(response);
            },
        );
    },

    updateMyLanguageSettings: async (
        roomId: string | number,
        request: ChatLanguageSettingsUpdateRequest,
    ): Promise<ChatLanguageSettings> => {
        const normalizedRequest = normalizeChatLanguageSettingsRequest(request);

        return requestWithLegacyFallback(
            async () => {
                const response = await apiClient(
                    `/chat/rooms/${roomId}/language-settings`,
                    {
                        method: "PATCH",
                        body: JSON.stringify(normalizedRequest),
                    },
                );
                return parseBody<ChatLanguageSettings>(response);
            },
            async () => {
                const response = await apiClient(
                    `/chat/rooms/${roomId}/members/me/language`,
                    {
                        method: "PATCH",
                        body: JSON.stringify(normalizedRequest),
                    },
                );
                return parseBody<ChatLanguageSettings>(response);
            },
        );
    },

    resetMyLanguageSettings: async (
        roomId: string | number,
    ): Promise<ChatLanguageSettings> => {
        return requestWithLegacyFallback(
            async () => {
                const response = await apiClient(
                    `/chat/rooms/${roomId}/language-settings`,
                    {
                        method: "DELETE",
                    },
                );
                return parseBody<ChatLanguageSettings>(response);
            },
            async () => {
                const response = await apiClient(
                    `/chat/rooms/${roomId}/members/me/language`,
                    {
                        method: "DELETE",
                    },
                );
                return parseBody<ChatLanguageSettings>(response);
            },
        );
    },

    markRoomAsRead: async (
        roomId: string | number,
        request: ChatRoomReadRequest,
    ): Promise<ChatRoomReadResponse> => {
        const response = await apiClient(`/chat/rooms/${roomId}/read`, {
            method: "PATCH",
            body: JSON.stringify(request),
        });
        return parseBody<ChatRoomReadResponse>(response);
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
        const normalizedLanguageCode = languageCode.trim().toLowerCase();
        if (!normalizedLanguageCode) {
            throw new Error("languageCode is required to retry translation.");
        }

        const response = await apiClient(
            `/chat/rooms/${roomId}/messages/${messageId}/translations/${normalizedLanguageCode}/retry`,
            {
                method: "POST",
            },
        );
        return parseBody<ChatMessageTranslation>(response);
    },
};
