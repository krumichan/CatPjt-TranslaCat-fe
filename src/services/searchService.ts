import {PageNumber} from "@/types/common";
import {Novel} from "@/types/novel";
import {apiClient} from "@/lib/apiClient";

export interface NovelSearchDetail {
    pageInfo: PageNumber;
    novels: Novel[];
}

export const searchService = {
    getSearchNovels: async (
        platformCode: string,
        keyword: string = "",
        page: number = 1
    ): Promise<NovelSearchDetail> => {
        const response = await apiClient(
            `/${platformCode}/search/novels?keyword=${keyword}&page=${page}`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to load novels.");
        }

        const data = await response.json();

        return data.body;
    }
};