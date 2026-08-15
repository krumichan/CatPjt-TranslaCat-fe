import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    LanguageLearningKeyword,
    LanguageLearningKeywordCreateRequest,
    LanguageLearningKeywordList,
    LanguageLearningKeywordUpdateRequest,
    SystemKeywordSelectionRequest,
} from "@/types/language-learning/keyword";

export const languageLearningKeywordService = {
    getAll: async (): Promise<LanguageLearningKeywordList> => {
        const response = await apiClient("/language-learning/keywords", {
            method: "GET",
        });

        return parseResponseBody<LanguageLearningKeywordList>(
            response,
            "LanguageLearningKeywordList",
        );
    },

    createCustom: async (
        request: LanguageLearningKeywordCreateRequest,
    ): Promise<LanguageLearningKeyword> => {
        const response = await apiClient("/language-learning/keywords/custom", {
            method: "POST",
            body: JSON.stringify(request),
        });

        return parseResponseBody<LanguageLearningKeyword>(
            response,
            "LanguageLearningCustomKeyword",
        );
    },

    updateCustom: async (
        keywordId: number,
        request: LanguageLearningKeywordUpdateRequest,
    ): Promise<LanguageLearningKeyword> => {
        const response = await apiClient(
            `/language-learning/keywords/custom/${keywordId}`,
            {
                method: "PATCH",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<LanguageLearningKeyword>(
            response,
            "LanguageLearningCustomKeyword",
        );
    },

    deleteCustom: async (keywordId: number): Promise<boolean> => {
        const response = await apiClient(
            `/language-learning/keywords/custom/${keywordId}`,
            { method: "DELETE" },
        );

        return parseResponseBody<boolean>(
            response,
            "LanguageLearningCustomKeyword",
        );
    },

    updateSystemSelection: async (
        keywordId: number,
        request: SystemKeywordSelectionRequest,
    ): Promise<LanguageLearningKeyword> => {
        const response = await apiClient(
            `/language-learning/keywords/system/${keywordId}/selection`,
            {
                method: "PUT",
                body: JSON.stringify(request),
            },
        );

        return parseResponseBody<LanguageLearningKeyword>(
            response,
            "LanguageLearningSystemKeywordSelection",
        );
    },
};
