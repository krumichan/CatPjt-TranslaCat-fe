import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    AssistanceType,
    SpeakingTurn,
    SpeakingTurnProcessRequest,
    SpeakingTurnUploadGrant,
} from "@/types/language-learning/speaking";

export const speakingTurnService = {
    createUploadGrant: async (
        sessionId: number,
        turnIndex: number,
        idempotencyKey: string,
    ): Promise<SpeakingTurnUploadGrant> => {
        const response = await apiClient(
            `/language-learning/speaking/sessions/${sessionId}/turns/upload-url`,
            {
                method: "POST",
                body: JSON.stringify({
                    turnIndex,
                    idempotencyKey,
                }),
            },
        );

        return parseResponseBody<SpeakingTurnUploadGrant>(
            response,
            "SpeakingTurnUploadGrant",
        );
    },

    process: async (
        sessionId: number,
        grant: SpeakingTurnUploadGrant,
        audio: Blob,
        durationSeconds: number,
        assistanceUsage: AssistanceType[],
    ): Promise<SpeakingTurn> => {
        const context: SpeakingTurnProcessRequest = {
            turnId: grant.turnId,
            uploadToken: grant.uploadToken,
            durationSeconds,
            assistanceUsage,
        };
        const formData = new FormData();
        formData.append(
            "context",
            new Blob([JSON.stringify(context)], {
                type: "application/json",
            }),
        );
        formData.append(
            "audio",
            audio,
            `speaking-turn-${grant.turnIndex}.webm`,
        );

        const response = await apiClient(
            `/language-learning/speaking/sessions/${sessionId}/turns`,
            {
                method: "POST",
                body: formData,
            },
        );

        return parseResponseBody<SpeakingTurn>(
            response,
            "SpeakingTurn",
        );
    },

    get: async (
        sessionId: number,
        turnId: number,
    ): Promise<SpeakingTurn> => {
        const response = await apiClient(
            `/language-learning/speaking/sessions/${sessionId}/turns/${turnId}`,
            { method: "GET" },
        );

        return parseResponseBody<SpeakingTurn>(response, "SpeakingTurn");
    },

    retry: async (
        sessionId: number,
        turnId: number,
    ): Promise<SpeakingTurn> => {
        const response = await apiClient(
            `/language-learning/speaking/sessions/${sessionId}/turns/${turnId}/retry`,
            { method: "POST" },
        );

        return parseResponseBody<SpeakingTurn>(
            response,
            "SpeakingTurnRetry",
        );
    },

    exclude: async (
        sessionId: number,
        turnId: number,
    ): Promise<SpeakingTurn> => {
        const response = await apiClient(
            `/language-learning/speaking/sessions/${sessionId}/turns/${turnId}/exclude`,
            { method: "POST" },
        );

        return parseResponseBody<SpeakingTurn>(
            response,
            "SpeakingTurnExclusion",
        );
    },
};
