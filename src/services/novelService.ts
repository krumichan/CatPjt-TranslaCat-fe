import {apiClient} from "@/lib/apiClient";
import type {PageNumber, TranslationUnit} from "@/types/common";
import type { NovelTargetLanguage } from "@/features/novel/translationLanguage";

export interface NovelTranslationUnit extends Omit<TranslationUnit, "ko"> {
    ko: string | null;
    translatedText?: string | null;
    targetLanguage?: NovelTargetLanguage;
}

export interface RawEpisode {
    sequence: number;
    identifier: string;
    title: NovelTranslationUnit;
}

export interface NovelDetail {
    pageInfo: PageNumber;
    title: NovelTranslationUnit;
    author: NovelTranslationUnit;
    synopsis: NovelTranslationUnit;
    episodes: RawEpisode[];
}

export const novelService = {
    getNovelDetail: async (
        platformCode: string,
        identifier: string,
        page: number = 1,
        targetLanguage: NovelTargetLanguage = "ko"
    ): Promise<NovelDetail> => {
        const response = await apiClient(
            `/${platformCode.toLowerCase()}/novels/${identifier}?page=${page}${targetLanguage === "en" ? "&targetLanguage=en" : ""}`, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to load novels detail.");
        }

        const data = await response.json();

        // 영어 조회가 구 한국어 캐시를 반환하면 제목·목차에도 잘못된 언어를 표시하지 않는다.
        if (targetLanguage === "en") {
            const detail = data.body as NovelDetail;
            const fields = [detail.title, detail.author, detail.synopsis, ...detail.episodes.map(episode => episode.title)];
            if (fields.some(field => field.targetLanguage !== "en" || field.ko !== null)) throw new Error("INVALID_TRANSLATION_TARGET");
        }

        return data.body;
    }
}
