import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type { LanguageLearningProfile } from "@/types/language-learning/profile";

export const languageLearningProfileService = {
    get: async (): Promise<LanguageLearningProfile> => {
        const response = await apiClient("/language-learning/profile", {
            method: "GET",
        });

        return parseResponseBody<LanguageLearningProfile>(
            response,
            "LanguageLearningProfile",
        );
    },
};
