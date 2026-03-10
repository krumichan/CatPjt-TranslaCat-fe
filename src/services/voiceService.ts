import {apiClient} from "@/lib/apiClient";
import {TranslationUnit} from "@/types/common";

export const voiceService = {
    translateAndSave: async (groupId: string, text: string): Promise<TranslationUnit> => {
        const body = {groupId, text};

        const response = await apiClient("/voice/translate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error("Failed to save voice translation.");
        }

        const data = await response.json();

        return data.body.text;
    }
}