import { apiClient } from "@/lib/apiClient";
import {
    getApiErrorCode,
    parseResponseBody,
} from "@/services/common/responseParser";
import type { SpeakingEvaluation } from "@/types/language-learning/speaking";

export const speakingEvaluationService = {
    get: async (sessionId: number): Promise<SpeakingEvaluation | null> => {
        const response = await apiClient(
            `/language-learning/speaking/sessions/${sessionId}/evaluation`,
            { method: "GET" },
        );

        try {
            return await parseResponseBody<SpeakingEvaluation | null>(
                response,
                "SpeakingEvaluation",
            );
        } catch (error) {
            // BE intentionally reports EVALUATION_PENDING while the async
            // evaluation row has not been materialized yet. That is a normal
            // polling state, not a page-level load failure.
            if (getApiErrorCode(error) === "EVALUATION_PENDING") {
                return null;
            }
            throw error;
        }
    },

    retry: async (sessionId: number): Promise<void> => {
        const response = await apiClient(
            `/language-learning/speaking/sessions/${sessionId}/evaluation/retry`,
            { method: "POST" },
        );

        await parseResponseBody<null>(response, "SpeakingEvaluationRetry");
    },
};
