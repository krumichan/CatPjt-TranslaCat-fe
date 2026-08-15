import type { LearningProfileState } from "@/types/language-learning/common";

export interface SkillScores {
    meaning: number | null;
    grammar: number | null;
    vocabulary: number | null;
    naturalness: number | null;
    expression: number | null;
}

export interface DifficultyPerformance {
    review: number | null;
    normal: number | null;
    challenge: number | null;
}

export interface KeywordMastery {
    canonicalKey: string;
    score: number;
    evaluationCount: number;
    selectedCount: number;
    lastSelectedDate: string | null;
}

export interface ProfileSignal {
    key: string;
    occurrenceCount: number;
}

export interface LanguageLearningProfile {
    profileVersion: string;
    state: LearningProfileState;
    baseLevelScore: number | null;
    calibrationStartedDate: string | null;
    calibrationCompletedDate: string | null;
    skillScores: SkillScores;
    difficultyPerformance: DifficultyPerformance;
    confidence: number;
    trend: string;
    keywordMasteries: KeywordMastery[];
    grammarWeaknesses: ProfileSignal[];
    errorPatterns: ProfileSignal[];
    strengths: ProfileSignal[];
    weaknesses: ProfileSignal[];
    recommendedFocus: ProfileSignal[];
}
