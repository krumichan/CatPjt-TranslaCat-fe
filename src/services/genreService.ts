import {apiClient} from "@/lib/apiClient";


export interface Genre {
    id: number;
    identifier: string;
    nameJa: string;
    nameKo: string;
}

export const genreService = {
    async getGenres(platformCode: string): Promise<Genre[]> {
        const response = await apiClient(`/${platformCode.toLowerCase()}/genres`);

        if (!response.ok) {
            throw new Error("Failed to fetch genres");
        }

        const data = await response.json();

        return data.body;
    }
}