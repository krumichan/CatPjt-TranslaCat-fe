import type { DailyWritingDifficulty, DailyWritingType } from "@/types/language-learning/common";

export interface CuratedWritingReference {
    checklist: string[];
    referenceAnswers: string[];
    alternativeNote: string;
    isOnlyCorrectAnswer: false;
}

export interface CuratedWritingAttempt {
    answerId: number;
    attemptDate: string;
    answer: string;
    submittedAt: string;
    resultPolicy: "REFERENCE_ONLY";
    evaluation: null;
}

export interface CuratedWritingItem {
    itemId: number;
    order: number;
    difficulty: DailyWritingDifficulty;
    targetBand: number;
    catalogId: string;
    catalogVersion: number;
    contentRevision: string;
    originText: string;
    providedFacts: string[];
    requiredIntents: string[];
    responseConstraints: string[];
    topicKey: string;
    answered: boolean;
    canSubmit: boolean;
    attempts: CuratedWritingAttempt[];
    reference?: CuratedWritingReference;
}

export interface CuratedWritingSet {
    dailySetId: number;
    learningDate: string;
    writingType: DailyWritingType;
    policyVersion: "curated-writing-v1";
    resultPolicy: "REFERENCE_ONLY";
    releaseId: string;
    originLanguage: string;
    learningLanguage: string;
    baseBand: number;
    status: "READY" | "COMPLETED";
    sentenceCount: 5;
    generatedItemCount: 5;
    replacementCount: number;
    rePractice: boolean;
    reviewAvailable: boolean;
    personalizedFeedbackStatus: "DISABLED_PENDING_QUALITY_GATE";
    items: CuratedWritingItem[];
}
