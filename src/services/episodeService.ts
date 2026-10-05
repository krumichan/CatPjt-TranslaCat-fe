import {TranslationUnit} from "@/types/common";
import {apiClient} from "@/lib/apiClient";
import {episodeBasePath} from "@/features/novel/readerModel";

export interface PagerInfo {
    prevIdentifier: string | null;
    listIdentifier: string;
    nextIdentifier: string | null;
}

export interface EpisodeDetail {
    pagerInfo: PagerInfo | null;
    title: TranslationUnit;
    contents: TranslationUnit[];
}

export const episodeService = {
    getEpisodeDetail: async (
        platformCode: string,
        novelIdentifier: string,
        episodeIdentifier?: string,
    ): Promise<EpisodeDetail> => {
        const response = await apiClient(
            episodeBasePath(platformCode, novelIdentifier, episodeIdentifier), {
                method:"GET"
            });

        if (!response.ok) {
            throw new Error("Failed to load episode detail.");
        }

        const data = await response.json();

        return data.body;
    }
}
