import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    DashboardPeriod,
    DashboardSourceFilter,
    LanguageLearningDashboard,
} from "@/types/language-learning/dashboard";
import type { ListeningTaskType } from "@/types/language-learning/listening";

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function resolvePeriod(period: DashboardPeriod) {
    const to = new Date();
    const from = new Date(to);
    from.setDate(to.getDate() - (period === "7d" ? 6 : 29));
    return { from: formatLocalDate(from), to: formatLocalDate(to) };
}

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
