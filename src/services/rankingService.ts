import {apiClient} from "@/lib/apiClient";
import {PageNumber} from "@/types/common";
import {Novel} from "@/types/novel";

export interface RankingPeriod {
    code: string;
    label: string;
}

export interface NovelRankingDetail {
    pageInfo: PageNumber;
    rankings: Novel[];
}

export const rankingService = {
    getPeriods: async (platformCode: string): Promise<RankingPeriod[]> => {
        const response = await apiClient(`/${platformCode}/ranking/periods`, {
           method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to load ranking period.");
        }

        const data = await response.json();

        return data.body;
    },

    getRankingNovels: async (
        platformCode: string,
        period: string,
        identifier: string,
        page: number = 1
    ): Promise<NovelRankingDetail> => {
        const response = await apiClient(
            `/${platformCode}/ranking/novels/${period}/${identifier}?page=${page}`,
        {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to load ranking novels.");
        }

        const data = await response.json();

        return data.body;
    }
}