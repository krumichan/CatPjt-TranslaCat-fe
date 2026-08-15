import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    LearningHistoryDetail,
    LearningHistoryItem,
    LearningHistorySourceFilter,
} from "@/types/language-learning/history";

interface LearningHistoryQuery {
    source: LearningHistorySourceFilter;
    period: string;
    status?: string | null;
}

export const learningHistoryService = {
    getAll: async ({
        source,
        period,
        status,
    }: LearningHistoryQuery): Promise<LearningHistoryItem[]> => {
        const params = new URLSearchParams({ period });
        if (source !== "ALL") {
            params.set("source", source);
        }
        if (status) {
            params.set("status", status);
        }

        const response = await apiClient(
            `/language-learning/history?${params.toString()}`,
            { method: "GET" },
        );

        return parseResponseBody<LearningHistoryItem[]>(
            response,
            "LanguageLearningHistory",
        );
    },

    getDetail: async (activityId: string): Promise<LearningHistoryDetail> => {
        const response = await apiClient(
            `/language-learning/history/${encodeURIComponent(activityId)}`,
            { method: "GET" },
        );

        return parseResponseBody<LearningHistoryDetail>(
            response,
            "LanguageLearningHistoryDetail",
        );
    },
};
