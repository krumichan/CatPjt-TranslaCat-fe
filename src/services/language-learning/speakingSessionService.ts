import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    SpeakingSession,
    SpeakingSessionCreateRequest,
    SpeakingSessionDetail,
} from "@/types/language-learning/speaking";

export const speakingSessionService = {
    getActive: async (): Promise<SpeakingSessionDetail | null> => {
        const response = await apiClient(
            "/language-learning/speaking/sessions/active",
            { method: "GET" },
        );

        return parseResponseBody<SpeakingSessionDetail | null>(
            response,
            "SpeakingActiveSession",
        );
    },

    get: async (sessionId: number): Promise<SpeakingSessionDetail> => {
        const response = await apiClient(
            `/language-learning/speaking/sessions/${sessionId}`,
            { method: "GET" },
        );

        return parseResponseBody<SpeakingSessionDetail>(
            response,
            "SpeakingSession",
        );
    },

    create: async (
        request: SpeakingSessionCreateRequest,
    ): Promise<SpeakingSession> => {
        const response = await apiClient(
            "/language-learning/speaking/sessions",
            {
                method: "POST",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<SpeakingSession>(
            response,
            "SpeakingSession",
        );
    },

    complete: async (sessionId: number): Promise<SpeakingSession> => {
        const response = await apiClient(
            `/language-learning/speaking/sessions/${sessionId}/complete`,
            { method: "POST" },
        );

        return parseResponseBody<SpeakingSession>(
            response,
            "SpeakingSessionCompletion",
        );
    },
};
