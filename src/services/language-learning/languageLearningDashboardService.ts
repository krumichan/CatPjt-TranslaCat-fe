import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type { LanguageLearningDashboard } from "@/types/language-learning/dashboard";

export const languageLearningDashboardService = {
    get: async (): Promise<LanguageLearningDashboard> => {
        const response = await apiClient("/language-learning/dashboard", {
            method: "GET",
        });

        return parseResponseBody<LanguageLearningDashboard>(
            response,
            "LanguageLearningDashboard",
        );
    },
};
