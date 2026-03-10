import {apiClient} from "@/lib/apiClient";
import {TranslationUnit} from "@/types/common";

export interface RecentView {
    id: number;
    platformCode: string;
    type: string;
    novelId: string;
    episodeId?: string;
    title: TranslationUnit;
    viewedAt: string;
}

export const recentViewService = {
    deleteRecentView: async (
        id: number,
    ): Promise<void> => {
        const response = await apiClient(
        `/recent/${id}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error("Failed to delete recent view.");
        }
    },
    getTop10: async(): Promise<RecentView[]> => {
        try {
            const response = await apiClient(
                `/recent/top10`, {
                    method: "GET",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to load top 10 of recent view");
            }

            const data = await response.json();

            return data.body ?? [];
        } catch (error) {
            console.error("RecentView Service Error:", error);
            return [];
        }
    },
    saveRecent: async(
        platformCode: string,
        type: string,
        novelId: string,
        episodeId: string | null,
        title: string,
        titleJa: string,
        titleKo: string,
    ): Promise<void> => {
        const body = {
            platformCode,
            type,
            novelId,
            episodeId,
            title,
            titleJa,
            titleKo,
        };

        const response = await apiClient(
            `/recent/save`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            throw new Error("Failed to save recent view");
        }
    }
}