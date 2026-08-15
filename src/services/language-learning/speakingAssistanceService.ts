import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    SpeakingAssistanceRequest,
    SpeakingAssistanceResponse,
} from "@/types/language-learning/speaking";

export const speakingAssistanceService = {
    request: async (
        sessionId: number,
        request: SpeakingAssistanceRequest,
    ): Promise<SpeakingAssistanceResponse> => {
        const response = await apiClient(
            `/language-learning/speaking/sessions/${sessionId}/assistance`,
            {
                method: "POST",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<SpeakingAssistanceResponse>(
            response,
            "SpeakingAssistance",
        );
    },
};
