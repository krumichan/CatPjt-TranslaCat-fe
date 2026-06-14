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
    },

    TranslateSoundAndSave: async (blob : Blob, groupId: string): Promise<TranslationUnit> => {
        const body = new FormData();
        body.append("groupId", groupId);
        body.append("sound", blob, `sound_${Date.now()}.wav`);

        console.log("@@@@@@@@@@@@");
// FormDataの中身をループで展開して確認する
        for (const pair of body.entries()) {
            console.log(pair[0] + ': ', pair[1]);
        }

        const response = await apiClient("/voice/translate/sound", {
            method: "POST",
            body: body
        });

        if (!response.ok) {
            throw new Error("Failed to save voice translation.");
        }

        const data = await response.json();

        return data.body.text;
    }
}