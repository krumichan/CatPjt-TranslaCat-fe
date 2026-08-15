import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    LanguageLearningAdminSetting,
    LanguageLearningAdminSettingUpdateRequest,
} from "@/types/language-learning/setting";

export const adminLanguageLearningSettingService = {
    get: async (): Promise<LanguageLearningAdminSetting> => {
        const response = await apiClient("/admin/language-learning/settings", {
            method: "GET",
        });

        return parseResponseBody<LanguageLearningAdminSetting>(
            response,
            "AdminLanguageLearningSetting",
        );
    },

    update: async (
        request: LanguageLearningAdminSettingUpdateRequest,
    ): Promise<LanguageLearningAdminSetting> => {
        const response = await apiClient("/admin/language-learning/settings", {
            method: "PATCH",
            body: JSON.stringify(request),
        });

        return parseResponseBody<LanguageLearningAdminSetting>(
            response,
            "AdminLanguageLearningSetting",
        );
    },
};
