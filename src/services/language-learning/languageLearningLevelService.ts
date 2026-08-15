import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    LevelTestAnswerRequest,
    LevelTestAnswerResult,
    LevelTestQuestion,
    LevelTestStatus,
} from "@/types/language-learning/level";
import type { LevelTestSessionType } from "@/types/language-learning/common";

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

    start: async (
        type: LevelTestSessionType,
    ): Promise<LevelTestQuestion> => {
        const response = await apiClient(
            `/language-learning/level-test/start?type=${encodeURIComponent(type)}`,
            { method: "POST" },
        );

        return parseResponseBody<LevelTestQuestion>(
            response,
            "LanguageLearningLevelTestStart",
        );
    },

    getCurrent: async (sessionId: number): Promise<LevelTestQuestion> => {
        const response = await apiClient(
            `/language-learning/level-test/sessions/${sessionId}/current`,
            { method: "GET" },
        );

        return parseResponseBody<LevelTestQuestion>(
            response,
            "LanguageLearningLevelTestCurrent",
        );
    },

    submitAnswer: async (
        sessionId: number,
        request: LevelTestAnswerRequest,
    ): Promise<LevelTestAnswerResult> => {
        const response = await apiClient(
            `/language-learning/level-test/sessions/${sessionId}/answers`,
            {
                method: "POST",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<LevelTestAnswerResult>(
            response,
            "LanguageLearningLevelTestAnswer",
        );
    },
};
