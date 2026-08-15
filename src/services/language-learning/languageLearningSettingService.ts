import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    LanguageLearningUserSetting,
    LanguageLearningUserSettingUpdateRequest,
} from "@/types/language-learning/setting";

export const languageLearningSettingService = {
    get: async (): Promise<LanguageLearningUserSetting> => {
        const response = await apiClient("/language-learning/settings", {
            method: "GET",
        });

        return parseResponseBody<LanguageLearningUserSetting>(
            response,
            "LanguageLearningSetting",
        );
    },

    update: async (
        request: LanguageLearningUserSettingUpdateRequest,
    ): Promise<LanguageLearningUserSetting> => {
        const response = await apiClient("/language-learning/settings", {
            method: "PATCH",
            body: JSON.stringify(request),
        });

        return parseResponseBody<LanguageLearningUserSetting>(
            response,
            "LanguageLearningSetting",
        );
    },
};
