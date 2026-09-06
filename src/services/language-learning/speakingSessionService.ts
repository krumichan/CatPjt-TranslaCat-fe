import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    SpeakingPracticeModeStatus,
    SpeakingSession,
    SpeakingSessionCreateRequest,
    SpeakingSessionDetail,
} from "@/types/language-learning/speaking";

export const speakingSessionService = {
    getTodayStatus: async (): Promise<SpeakingPracticeModeStatus[]> => {
        const response = await apiClient(
            "/language-learning/speaking/sessions/today/status",
            { method: "GET" },
        );
        return parseResponseBody<SpeakingPracticeModeStatus[]>(
            response,
            "SpeakingTodayModeStatus",
        );
    },

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

    complete: async (
        sessionId: number,
        skipEvaluation = false,
    ): Promise<SpeakingSession> => {
        const response = await apiClient(
            `/language-learning/speaking/sessions/${sessionId}/complete`,
            {
                method: "POST",
                body: JSON.stringify({ skipEvaluation }),
            },
        );

        return parseResponseBody<SpeakingSession>(
            response,
            "SpeakingSessionCompletion",
        );
    },
};
