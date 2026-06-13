import { apiClient } from "@/lib/apiClient";
import {
    AccountBookMonthlyChartResponse,
    AccountBookRankingChartResponse,
} from "@/types/accountBook";
import { ResponseDto } from "@/types/common";

type RankingChartPeriod = {
    year: number;
    month: number;
};

function buildPeriodQuery(period?: RankingChartPeriod) {
    if (!period) {
        return "";
    }

    const searchParams = new URLSearchParams();
    searchParams.set("year", String(period.year));
    searchParams.set("month", String(period.month));

    return `?${searchParams.toString()}`;
}

export const accountBookChartService = {
    async getMonthlyChart(
        accountBookId: number,
        year: number
    ): Promise<AccountBookMonthlyChartResponse> {
        const response = await apiClient(
            `/account-books/${accountBookId}/charts/monthly?year=${year}`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to get monthly chart.");
        }

        const data =
            (await response.json()) as ResponseDto<AccountBookMonthlyChartResponse>;

        return data.body;
    },

    async getCategoryChart(
        accountBookId: number,
        period?: RankingChartPeriod
    ): Promise<AccountBookRankingChartResponse> {
        const response = await apiClient(
            `/account-books/${accountBookId}/charts/categories${buildPeriodQuery(period)}`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to get category chart.");
        }

        const data =
            (await response.json()) as ResponseDto<AccountBookRankingChartResponse>;

        return data.body;
    },

    async getStoreChart(
        accountBookId: number,
        period?: RankingChartPeriod
    ): Promise<AccountBookRankingChartResponse> {
        const response = await apiClient(
            `/account-books/${accountBookId}/charts/stores${buildPeriodQuery(period)}`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to get store chart.");
        }

        const data =
            (await response.json()) as ResponseDto<AccountBookRankingChartResponse>;

        return data.body;
    },
};