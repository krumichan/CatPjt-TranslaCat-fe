import { apiClient } from "@/lib/apiClient";
import type { ResponseDto } from "@/types/common";
import type { SpendingAnalysisPeriod, SpendingAnalysisRequest, SpendingAnalysisResponse, SpendingAnalysisSnapshot, SpendingAnalysisHistoryPage, SpendingAnalysisJob } from "@/types/accountBookAnalysis";

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

    async saved(accountBookId: number, analysisId: string, signal?: AbortSignal): Promise<SpendingAnalysisResponse> {
        const response = await apiClient(`/account-books/${accountBookId}/spending-analysis/history/${encodeURIComponent(analysisId)}`, { signal });
        if (!response.ok) throw new SpendingAnalysisError(response.status);
        return ((await response.json()) as ResponseDto<SpendingAnalysisResponse>).body;
    },

    async enqueue(accountBookId: number, request: SpendingAnalysisRequest): Promise<SpendingAnalysisJob> {
        // 화면의 수명과 독립적으로 서버에 작업을 접수한다.
        return jobResponse(accountBookId, "", { method: "POST", body: JSON.stringify(request) });
    },

    async currentJob(accountBookId: number): Promise<SpendingAnalysisJob | null> {
        return jobResponse(accountBookId, "/current");
    },

    async job(accountBookId: number, jobId: number, signal?: AbortSignal): Promise<SpendingAnalysisJob> {
        return jobResponse(accountBookId, `/${jobId}`, { signal });
    },

    async cancelJob(accountBookId: number, jobId: number): Promise<SpendingAnalysisJob> {
        return jobResponse(accountBookId, `/${jobId}/cancel`, { method: "POST" });
    },
};

async function jobResponse<T extends SpendingAnalysisJob | null>(accountBookId: number, path: string, init?: RequestInit): Promise<T> {
    const response = await apiClient(`/account-books/${accountBookId}/spending-analysis/jobs${path}`, init);
    if (!response.ok) throw new SpendingAnalysisError(response.status);
    return ((await response.json()) as ResponseDto<T>).body;
}
