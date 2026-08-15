import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    AnswerResult,
    AnswerSubmitRequest,
    DailyWritingSet,
} from "@/types/language-learning/daily";

export const dailyWritingService = {
    getToday: async (): Promise<DailyWritingSet> => {
        const response = await apiClient("/language-learning/writing/daily", {
            method: "GET",
        });

        return parseResponseBody<DailyWritingSet>(
            response,
            "DailyWritingSet",
        );
    },

    getHistory: async (date: string): Promise<DailyWritingSet> => {
        const response = await apiClient(
            `/language-learning/writing/daily/history/${encodeURIComponent(date)}`,
            { method: "GET" },
        );

        return parseResponseBody<DailyWritingSet>(
            response,
            "DailyWritingHistory",
        );
    },

    regenerateUnanswered: async (
        dailySetId: number,
    ): Promise<DailyWritingSet> => {
        const response = await apiClient(
            `/language-learning/writing/daily/${dailySetId}/regenerate`,
            { method: "POST" },
        );

        return parseResponseBody<DailyWritingSet>(
            response,
            "DailyWritingRegeneration",
        );
    },

    submitAnswer: async (
        itemId: number,
        request: AnswerSubmitRequest,
    ): Promise<AnswerResult> => {
        const response = await apiClient(
            `/language-learning/writing/daily/items/${itemId}/answers`,
            {
                method: "POST",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<AnswerResult>(
            response,
            "DailyWritingAnswer",
        );
    },
};
