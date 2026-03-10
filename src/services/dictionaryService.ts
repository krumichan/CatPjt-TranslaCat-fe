import {apiClient} from "@/lib/apiClient";

export const dictionaryService = {
    register: async(surface: string, reading: string): Promise<void> => {
        const body = {surface, reading};

        const response = await apiClient("/dictionary/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error("Failed to save dictionary.");
        }
    }
}