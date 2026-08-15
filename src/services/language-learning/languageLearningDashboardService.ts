import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    DashboardPeriod,
    DashboardSourceFilter,
    LanguageLearningDashboard,
} from "@/types/language-learning/dashboard";

export const languageLearningDashboardService = {
    get: async (
        period: DashboardPeriod = "7d",
        source: DashboardSourceFilter = "ALL",
    ): Promise<LanguageLearningDashboard> => {
        const params = new URLSearchParams({ period, source });
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
