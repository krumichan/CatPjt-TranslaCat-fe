import { apiClient } from "@/lib/apiClient";
import type { ResponseDto } from "@/types/common";
import type { SpendingAnalysisPeriod, SpendingAnalysisRequest, SpendingAnalysisResponse, SpendingAnalysisSnapshot } from "@/types/accountBookAnalysis";

export class SpendingAnalysisError extends Error {
    constructor(public readonly status: number) {
        super("Spending analysis request failed");
        this.name = "SpendingAnalysisError";
    }
}

export const accountBookSpendingAnalysisService = {
    async snapshot(accountBookId: number, period: SpendingAnalysisPeriod, signal?: AbortSignal): Promise<SpendingAnalysisSnapshot> {
        const params = new URLSearchParams({ periodType: period.periodType, year: String(period.year) });
        if (period.periodType === "MONTHLY" && period.month) params.set("month", String(period.month));
        const response = await apiClient(`/account-books/${accountBookId}/spending-analysis/snapshot?${params}`, { signal });
        if (!response.ok) throw new SpendingAnalysisError(response.status);
        return ((await response.json()) as ResponseDto<SpendingAnalysisSnapshot>).body;
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
