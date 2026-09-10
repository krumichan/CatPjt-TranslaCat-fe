import { resolvePeriod } from "@/features/language-learning/dashboard/dashboardPeriod";
import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    DashboardPeriod,
    DashboardSourceFilter,
    LanguageLearningDashboard,
} from "@/types/language-learning/dashboard";
import type { ListeningTaskType } from "@/types/language-learning/listening";

export const languageLearningDashboardService = {
    get: async (
        period: DashboardPeriod = "30d",
        source: DashboardSourceFilter = "ALL",
        taskType: ListeningTaskType | null = null,
    ): Promise<LanguageLearningDashboard> => {
        const range = resolvePeriod(period);
        const params = new URLSearchParams({
            from: range.from,
            to: range.to,
            source,
        });
        if (taskType && (source === "ALL" || source === "LISTENING")) {
            params.set("taskType", taskType);
        }

        const response = await apiClient(
            `/language-learning/dashboard?${params.toString()}`,
            { method: "GET" },
        );

        return parseResponseBody<LanguageLearningDashboard>(
            response,
            "LanguageLearningDashboard",
        );
    },
};
