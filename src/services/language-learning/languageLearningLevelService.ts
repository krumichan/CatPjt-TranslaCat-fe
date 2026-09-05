import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    LevelTestAnswerRequest,
    LevelTestAnswerResult,
    LevelTestAudioAnswerResult,
    LevelTestHistoryDetail,
    LevelTestHistoryItem,
    LevelTestQuestion,
    LevelTestResult,
    LevelTestSession,
    LevelTestStartRequest,
    LevelTestStatus,
} from "@/types/language-learning/level";

function jsonBody(value: unknown): RequestInit {
    return {
        method: "POST",
        body: JSON.stringify(value),
    };
}

export const languageLearningLevelService = {
    getStatus: async (): Promise<LevelTestStatus> => {
        const response = await apiClient("/language-learning/level-test/status", {
            method: "GET",
        });

        return parseResponseBody<LevelTestStatus>(
            response,
            "LanguageLearningLevelStatus",
        );
    },

    start: async (request: LevelTestStartRequest): Promise<LevelTestSession> => {
        const response = await apiClient(
            "/language-learning/level-test/sessions",
            jsonBody(request),
        );

        return parseResponseBody<LevelTestSession>(
            response,
            "LanguageLearningLevelTestStart",
        );
    },

    getSession: async (sessionId: number): Promise<LevelTestSession> => {
        const response = await apiClient(
            `/language-learning/level-test/sessions/${sessionId}`,
            { method: "GET" },
        );

        return parseResponseBody<LevelTestSession>(
            response,
            "LanguageLearningLevelTestSession",
        );
    },

    getCurrent: async (sessionId: number): Promise<LevelTestQuestion> => {
        const response = await apiClient(
            `/language-learning/level-test/sessions/${sessionId}/current-item`,
            { method: "GET" },
        );

        return parseResponseBody<LevelTestQuestion>(
            response,
            "LanguageLearningLevelTestCurrent",
        );
    },

    fetchReferenceAudio: async (itemId: number): Promise<Blob> => {
        const response = await apiClient(
            `/language-learning/level-test/items/${itemId}/reference-audio`,
            { method: "GET" },
        );
        if (!response.ok) {
            await parseResponseBody<never>(response, "LanguageLearningLevelTestAudio");
            throw new Error("Level Test reference audio request failed.");
        }
        return response.blob();
    },

    fetchAnswerAudio: async (itemId: number): Promise<Blob> => {
        const response = await apiClient(
            `/language-learning/level-test/items/${itemId}/answer-audio`,
            { method: "GET" },
        );
        if (!response.ok) {
            await parseResponseBody<never>(response, "LanguageLearningLevelTestAnswerAudio");
            throw new Error("Level Test answer audio request failed.");
        }
        return response.blob();
    },

    fetchModelAnswerAudio: async (itemId: number): Promise<Blob> => {
        const response = await apiClient(
            `/language-learning/level-test/items/${itemId}/model-answer-audio`,
            { method: "GET" },
        );
        if (!response.ok) {
            await parseResponseBody<never>(response, "LanguageLearningLevelTestModelAnswerAudio");
            throw new Error("Level Test model answer audio request failed.");
        }
        return response.blob();
    },

    submitAnswer: async (
        sessionId: number,
        itemId: number,
        request: LevelTestAnswerRequest,
    ): Promise<LevelTestAnswerResult> => {
        const response = await apiClient(
            `/language-learning/level-test/sessions/${sessionId}/items/${itemId}/answers`,
            jsonBody(request),
        );

        return parseResponseBody<LevelTestAnswerResult>(
            response,
            "LanguageLearningLevelTestAnswer",
        );
    },

    submitAudio: async (
        sessionId: number,
        itemId: number,
        audio: Blob,
        durationMs: number,
        idempotencyKey: string,
    ): Promise<LevelTestAudioAnswerResult> => {
        const formData = new FormData();
        formData.append("audio", audio, "level-test-speaking.webm");
        const params = new URLSearchParams({
            durationMs: String(Math.max(1, Math.round(durationMs))),
            idempotencyKey,
        });
        const response = await apiClient(
            `/language-learning/level-test/sessions/${sessionId}/items/${itemId}/answers/audio?${params.toString()}`,
            { method: "POST", body: formData },
        );

        return parseResponseBody<LevelTestAudioAnswerResult>(
            response,
            "LanguageLearningLevelTestAudioAnswer",
        );
    },

    retryEvaluation: async (
        sessionId: number,
        itemId: number,
    ): Promise<LevelTestAnswerResult> => {
        const response = await apiClient(
            `/language-learning/level-test/sessions/${sessionId}/items/${itemId}/evaluation/retry`,
            { method: "POST" },
        );

        return parseResponseBody<LevelTestAnswerResult>(
            response,
            "LanguageLearningLevelTestRetry",
        );
    },

    getResult: async (sessionId: number): Promise<LevelTestResult> => {
        const response = await apiClient(
            `/language-learning/level-test/sessions/${sessionId}/result`,
            { method: "GET" },
        );

        return parseResponseBody<LevelTestResult>(
            response,
            "LanguageLearningLevelTestResult",
        );
    },

    getHistory: async (): Promise<LevelTestHistoryItem[]> => {
        const response = await apiClient("/language-learning/level-test/history", {
            method: "GET",
        });

        return parseResponseBody<LevelTestHistoryItem[]>(
            response,
            "LanguageLearningLevelTestHistory",
        );
    },

    getHistoryDetail: async (
        sessionId: number,
    ): Promise<LevelTestHistoryDetail> => {
        const response = await apiClient(
            `/language-learning/level-test/history/${sessionId}`,
            { method: "GET" },
        );

        return parseResponseBody<LevelTestHistoryDetail>(
            response,
            "LanguageLearningLevelTestHistoryDetail",
        );
    },
};
