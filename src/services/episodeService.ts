import {TranslationUnit} from "@/types/common";
import {apiClient} from "@/lib/apiClient";

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
        const episodeIdentifierParams =
            episodeIdentifier === null || episodeIdentifier === "0" ? "" : "/" + episodeIdentifier;

        const response = await apiClient(
            `/${platformCode}/${novelIdentifier}/episodes${episodeIdentifierParams}`, {
                method:"GET"
            });

        if (!response.ok) {
            throw new Error("Failed to load episode detail.");
        }

        const data = await response.json();

        return data.body;
    }
}