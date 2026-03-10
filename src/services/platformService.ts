import {Platform} from "@/types/platform";
import {apiClient} from "@/lib/apiClient";

export const platformService = {
    async getPlatforms(): Promise<Platform[]> {
        const response = await apiClient("/platforms", {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to load platform list.")
        }

        const data = await response.json();

        return data.body;
    }
}