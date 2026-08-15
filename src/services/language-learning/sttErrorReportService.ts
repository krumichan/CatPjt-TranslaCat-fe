import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    SttErrorReport,
    SttErrorReportCreateRequest,
} from "@/types/language-learning/speaking";

export const sttErrorReportService = {
    create: async (
        sessionId: number,
        turnId: number,
        request: SttErrorReportCreateRequest,
    ): Promise<SttErrorReport> => {
        const response = await apiClient(
            `/language-learning/speaking/sessions/${sessionId}/turns/${turnId}/stt-reports`,
            {
                method: "POST",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<SttErrorReport>(
            response,
            "SpeakingSttErrorReport",
        );
    },

    requestSupport: async (reportId: number): Promise<SttErrorReport> => {
        const response = await apiClient(
            `/language-learning/speaking/stt-reports/${reportId}/support`,
            { method: "POST" },
        );

        return parseResponseBody<SttErrorReport>(
            response,
            "SpeakingSttErrorReportSupport",
        );
    },
};
