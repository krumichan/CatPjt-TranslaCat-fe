import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    AnswerResult,
    AnswerSubmitRequest,
    DailyWritingSet,
} from "@/types/language-learning/daily";
import type { DailyWritingType } from "@/types/language-learning/common";

export const dailyWritingService = {
    getToday: async (writingType: DailyWritingType): Promise<DailyWritingSet> => {
        const params = new URLSearchParams({ writingType });
        const response = await apiClient(
            `/language-learning/writing/daily?${params.toString()}`,
            { method: "GET" },
        );

        return parseResponseBody<DailyWritingSet>(
            response,
            "DailyWritingSet",
        );
    },

    getHistory: async (
        date: string,
        writingType: DailyWritingType = "FREE",
    ): Promise<DailyWritingSet> => {
        const params = new URLSearchParams({ writingType });
        const response = await apiClient(
            `/language-learning/writing/daily/history/${encodeURIComponent(date)}?${params.toString()}`,
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

    resumeEvaluation: async (itemId: number): Promise<void> => {
        const response = await apiClient(
            `/language-learning/writing/daily/items/${itemId}/evaluation/resume`,
            { method: "POST" },
        );

        await parseResponseBody<null>(
            response,
            "DailyWritingEvaluationResume",
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
