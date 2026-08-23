import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    VoiceChannel,
    VoiceSegmentListResponse,
    VoiceSessionCreateRequest,
    VoiceSessionListResponse,
    VoiceSessionResponse,
    VoiceSessionUpdateRequest,
    VoiceTranslationRetryResponse,
    VoiceWebSocketTicketResponse,
} from "@/types/voice";

function withQuery(
    path: string,
    params: Record<string, string | number | null | undefined>,
) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
            query.set(key, String(value));
        }
    });

    const suffix = query.toString();
    return suffix ? `${path}?${suffix}` : path;
}

export const voiceSessionService = {
    create: async (
        request: VoiceSessionCreateRequest,
    ): Promise<VoiceSessionResponse> => {
        const response = await apiClient("/voice/sessions", {
            method: "POST",
            body: JSON.stringify(request),
        });

        return parseResponseBody<VoiceSessionResponse>(
            response,
            "VoiceSessionCreate",
        );
    },

    get: async (sessionId: string): Promise<VoiceSessionResponse> => {
        const response = await apiClient(`/voice/sessions/${sessionId}`, {
            method: "GET",
        });

        return parseResponseBody<VoiceSessionResponse>(
            response,
            "VoiceSession",
        );
    },

    listHistory: async (
        cursor: string | null = null,
        size = 50,
    ): Promise<VoiceSessionListResponse> => {
        const response = await apiClient(
            withQuery("/voice/sessions", { cursor, size }),
            { method: "GET" },
        );

        return parseResponseBody<VoiceSessionListResponse>(
            response,
            "VoiceSessionHistory",
        );
    },

    listSegments: async (
        sessionId: string,
        cursor: number | null = null,
        size = 50,
    ): Promise<VoiceSegmentListResponse> => {
        const response = await apiClient(
            withQuery(`/voice/sessions/${sessionId}/segments`, {
                cursor,
                size,
            }),
            { method: "GET" },
        );

        return parseResponseBody<VoiceSegmentListResponse>(
            response,
            "VoiceSegmentHistory",
        );
    },

    update: async (
        sessionId: string,
        request: VoiceSessionUpdateRequest,
    ): Promise<VoiceSessionResponse> => {
        const response = await apiClient(`/voice/sessions/${sessionId}`, {
            method: "PATCH",
            body: JSON.stringify(request),
        });

        return parseResponseBody<VoiceSessionResponse>(
            response,
            "VoiceSessionUpdate",
        );
    },

    complete: async (sessionId: string): Promise<VoiceSessionResponse> => {
        const response = await apiClient(
            `/voice/sessions/${sessionId}/complete`,
            { method: "POST" },
        );

        return parseResponseBody<VoiceSessionResponse>(
            response,
            "VoiceSessionComplete",
        );
    },

    delete: async (sessionId: string): Promise<void> => {
        const response = await apiClient(`/voice/sessions/${sessionId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            await parseResponseBody<never>(response, "VoiceSessionDelete");
        }
    },

    issueWebSocketTicket: async (
        sessionId: string,
        channel: VoiceChannel,
    ): Promise<VoiceWebSocketTicketResponse> => {
        const response = await apiClient(
            `/voice/sessions/${sessionId}/channels/${channel}/ticket`,
            { method: "POST" },
        );

        return parseResponseBody<VoiceWebSocketTicketResponse>(
            response,
            "VoiceWebSocketTicket",
        );
    },

    retryTranslation: async (
        sessionId: string,
        segmentId: number,
    ): Promise<VoiceTranslationRetryResponse> => {
        const response = await apiClient(
            `/voice/sessions/${sessionId}/segments/${segmentId}/retry-translation`,
            { method: "POST" },
        );

        return parseResponseBody<VoiceTranslationRetryResponse>(
            response,
            "VoiceTranslationRetry",
        );
    },
};
