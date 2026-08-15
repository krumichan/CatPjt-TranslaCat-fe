import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    SpeakingTopic,
    SpeakingTopicCategory,
} from "@/types/language-learning/speaking";

interface SpeakingTopicQuery {
    learningLanguage?: string | null;
    category?: SpeakingTopicCategory | null;
}

export const speakingTopicService = {
    getAll: async ({
        learningLanguage,
        category,
    }: SpeakingTopicQuery = {}): Promise<SpeakingTopic[]> => {
        const params = new URLSearchParams();

        if (learningLanguage) {
            params.set("learningLanguage", learningLanguage);
        }
        if (category) {
            params.set("category", category);
        }

        const query = params.toString();
        const response = await apiClient(
            `/language-learning/speaking/topics${query ? `?${query}` : ""}`,
            { method: "GET" },
        );

        return parseResponseBody<SpeakingTopic[]>(response, "SpeakingTopic");
    },
};
