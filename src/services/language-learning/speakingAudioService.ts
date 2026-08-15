import { apiClient } from "@/lib/apiClient";

function normalizeAudioEndpoint(url: string): string {
    if (url.startsWith("/api/v1/")) {
        return url.slice("/api/v1".length);
    }
    return url;
}

export const speakingAudioService = {
    load: async (url: string): Promise<Blob> => {
        const response = await apiClient(normalizeAudioEndpoint(url), {
            method: "GET",
        });
        if (!response.ok) {
            throw new Error(`Speaking audio request failed: ${response.status}`);
        }
        return response.blob();
    },
};
