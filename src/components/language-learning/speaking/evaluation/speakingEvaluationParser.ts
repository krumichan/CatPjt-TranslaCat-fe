import type {
    SpeakingEvaluationEvidence,
    SpeakingPronunciationPractice,
    SpeakingRecommendedExpression,
} from "@/types/language-learning/speaking";

export function parseJsonArray<T>(value: string | null): T[] {
    if (!value) return [];
    try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
        return [];
    }
}

export const parseEvidence = (value: string | null) =>
    parseJsonArray<SpeakingEvaluationEvidence>(value);
export const parseRecommendedExpressions = (value: string | null) =>
    parseJsonArray<SpeakingRecommendedExpression>(value);
export const parsePronunciationPractice = (value: string | null) =>
    parseJsonArray<SpeakingPronunciationPractice>(value);
export const parseTextList = (value: string | null) => parseJsonArray<string>(value);
