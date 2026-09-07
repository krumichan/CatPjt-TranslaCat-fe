import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    PracticeAnswerResult,
    PracticeDomain,
    PracticeSet,
    PracticeTodayModeStatus,
    VocabularyMasterySummary,
} from "@/types/language-learning/practice";

export const readingVocabularyService = {
    getToday: async (domain: PracticeDomain, mode: string): Promise<PracticeSet> => {
        const params = new URLSearchParams({ domain, mode });
        const response = await apiClient(
            `/language-learning/practice/today?${params.toString()}`,
            { method: "GET" },
        );
        return parseResponseBody<PracticeSet>(response, "ReadingVocabularyToday");
    },

    getTodayStatus: async (domain: PracticeDomain): Promise<PracticeTodayModeStatus[]> => {
        const params = new URLSearchParams({ domain });
        const response = await apiClient(
            `/language-learning/practice/today/status?${params.toString()}`,
            { method: "GET" },
        );
        return parseResponseBody<PracticeTodayModeStatus[]>(
            response,
            "ReadingVocabularyTodayStatus",
        );
    },

    getSet: async (setId: number): Promise<PracticeSet> => {
        const response = await apiClient(`/language-learning/practice/sets/${setId}`, {
            method: "GET",
        });
        return parseResponseBody<PracticeSet>(response, "ReadingVocabularySet");
    },

    submitAnswer: async (questionId: number, answer: string[]): Promise<PracticeAnswerResult> => {
        const response = await apiClient(
            `/language-learning/practice/questions/${questionId}/answers`,
            {
                method: "POST",
                body: JSON.stringify({ answer }),
            },
        );
        return parseResponseBody<PracticeAnswerResult>(response, "ReadingVocabularyAnswer");
    },

    getVocabularyMastery: async (): Promise<VocabularyMasterySummary> => {
        const response = await apiClient("/language-learning/practice/vocabulary/mastery", {
            method: "GET",
        });
        return parseResponseBody<VocabularyMasterySummary>(response, "VocabularyMastery");
    },
};
