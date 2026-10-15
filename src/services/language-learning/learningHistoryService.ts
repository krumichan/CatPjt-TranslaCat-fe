import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    LearningHistoryDetail,
    LearningHistoryItem,
    LearningHistorySourceFilter,
} from "@/types/language-learning/history";
import type { ListeningTaskType } from "@/types/language-learning/listening";

interface LearningHistoryQuery {
    source: LearningHistorySourceFilter;
    period: string;
    status?: string | null;
    taskType?: ListeningTaskType | null;
}

export const learningHistoryService = {
    getAll: async ({
        source,
        period,
        status,
        taskType,
    }: LearningHistoryQuery, expectedLoginSessionId?: string): Promise<LearningHistoryItem[]> => {
        const params = new URLSearchParams({ period });
        if (source !== "ALL") params.set("source", source);
        if (status) params.set("status", status);
        if (taskType && (source === "ALL" || source === "LISTENING")) {
            params.set("taskType", taskType);
        }

        const response = await apiClient(
            `/language-learning/history?${params.toString()}`,
            { method: "GET" },
            expectedLoginSessionId,
        );

        return parseResponseBody<LearningHistoryItem[]>(
            response,
            "LanguageLearningHistory",
        );
    },

    getDetail: async (activityId: string, options: { signal?: AbortSignal; expectedLoginSessionId?: string } = {}): Promise<LearningHistoryDetail> => {
        const response = await apiClient(
            `/language-learning/history/${encodeURIComponent(activityId)}`,
            { method: "GET", signal: options.signal },
            options.expectedLoginSessionId,
        );

        return parseResponseBody<LearningHistoryDetail>(
            response,
            "LanguageLearningHistoryDetail",
        );
    },
};
