import {apiClient} from "@/lib/apiClient";
import {PageNumber, TranslationUnit} from "@/types/common";

export interface RawEpisode {
    sequence: number;
    identifier: string;
    title: TranslationUnit;
}

export interface NovelDetail {
    pageInfo: PageNumber;
    title: TranslationUnit;
    author: TranslationUnit;
    synopsis: TranslationUnit;
    episodes: RawEpisode[];
}

export const novelService = {
    getNovelDetail: async (
        platformCode: string,
        identifier: string,
        page: number = 1
    ): Promise<NovelDetail> => {
        const response = await apiClient(
            `/${platformCode.toLowerCase()}/novels/${identifier}?page=${page}`, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to load novels detail.");
        }

        const data = await response.json();

        return data.body;
    }
}