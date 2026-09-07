import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type { SpeakingReadAloudProblemEvaluation } from "@/types/language-learning/speaking";

export const speakingReadAloudService = {
    evaluateProblem: async (
        sessionId: number,
        problemIndex: number,
    ): Promise<SpeakingReadAloudProblemEvaluation> => {
        const response = await apiClient(
            `/language-learning/speaking/sessions/${sessionId}/read-aloud/problems/${problemIndex}/evaluate`,
            { method: "POST" },
        );
        return parseResponseBody<SpeakingReadAloudProblemEvaluation>(
            response,
            "SpeakingReadAloudProblemEvaluation",
        );
    },
};
