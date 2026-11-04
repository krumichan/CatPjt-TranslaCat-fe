import { apiClient } from "@/lib/apiClient";
import type { ResponseDto } from "@/types/common";
import type { SpendingAnalysisPeriod, SpendingAnalysisRequest, SpendingAnalysisResponse, SpendingAnalysisSnapshot, SpendingAnalysisHistoryPage } from "@/types/accountBookAnalysis";

export class SpendingAnalysisError extends Error {
    constructor(public readonly status: number) {
        super("Spending analysis request failed");
        this.name = "SpendingAnalysisError";
    }
}

export const accountBookSpendingAnalysisService = {
    async snapshot(accountBookId: number, period: SpendingAnalysisPeriod, signal?: AbortSignal): Promise<SpendingAnalysisSnapshot> {
        const params = new URLSearchParams({ periodType: period.periodType, year: String(period.year) });
        for (const key of ["month", "quarter", "half", "startDate", "endDate"] as const) {
            if (period[key] !== undefined) params.set(key, String(period[key]));
        }
        const response = await apiClient(`/account-books/${accountBookId}/spending-analysis/snapshot?${params}`, { signal });
        if (!response.ok) throw new SpendingAnalysisError(response.status);
        return ((await response.json()) as ResponseDto<SpendingAnalysisSnapshot>).body;
    },

    async history(accountBookId: number, page = 0): Promise<SpendingAnalysisHistoryPage> {
        const response = await apiClient(`/account-books/${accountBookId}/spending-analysis/history?page=${page}&size=10`);
        if (!response.ok) throw new SpendingAnalysisError(response.status);
        return ((await response.json()) as ResponseDto<SpendingAnalysisHistoryPage>).body;
    },

    async saved(accountBookId: number, analysisId: string, signal: AbortSignal): Promise<SpendingAnalysisResponse> {
        const response = await apiClient(`/account-books/${accountBookId}/spending-analysis/history/${encodeURIComponent(analysisId)}`, { signal });
        if (!response.ok) throw new SpendingAnalysisError(response.status);
        return ((await response.json()) as ResponseDto<SpendingAnalysisResponse>).body;
    },

    async analyze(accountBookId: number, request: SpendingAnalysisRequest, signal: AbortSignal): Promise<SpendingAnalysisResponse> {
        // 명시적인 사용자 실행에만 거래 분석 요청을 보내며 기간 변경·닫기 취소를 전달한다.
        const response = await apiClient(`/account-books/${accountBookId}/spending-analysis`, {
            method: "POST", body: JSON.stringify(request), signal,
        });
        if (!response.ok) throw new SpendingAnalysisError(response.status);
        return ((await response.json()) as ResponseDto<SpendingAnalysisResponse>).body;
    },
};
