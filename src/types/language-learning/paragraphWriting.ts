import type { DailyWritingDifficulty, DailyWritingType } from "@/types/language-learning/common";
import type { CuratedWritingAttempt, CuratedWritingItem } from "@/types/language-learning/curatedWriting";

export const PARAGRAPH_WRITING_POLICY = "curated-writing-variable-n-v1" as const;
export type ParagraphDistribution = Record<DailyWritingDifficulty, number>;

export interface ParagraphWritingConfig {
    policyVersion: typeof PARAGRAPH_WRITING_POLICY;
    defaultTargetItemCount: number;
    minTargetItemCount: number;
    maxTargetItemCount: number;
    workerBatchSize: number;
    pageSize: number;
    answerMaxLength: number;
    qaOnly: boolean;
    personalizedFeedbackEnabled: boolean;
    distribution: ParagraphDistribution;
}

export interface ParagraphWritingShortage {
    difficulty: DailyWritingDifficulty;
    targetBand: number;
    missingCount: number;
}

export interface ParagraphWritingPreview {
    policyVersion: typeof PARAGRAPH_WRITING_POLICY;
    resultPolicy: "REFERENCE_ONLY";
    writingType: DailyWritingType;
    baseBand: number;
    targetItemCount: number;
    acquiredItemCount: number;
    remainingItemCount: number;
    desiredDistribution: ParagraphDistribution;
    actualDistribution: ParagraphDistribution;
    distributionDeviation: ParagraphDistribution;
    shortages: ParagraphWritingShortage[];
    canStart: boolean;
    requiresPartialConsent: boolean;
    rePractice: boolean;
    qaOnly: boolean;
}

export interface ParagraphFeedbackText {
    originText: string;
    learningText: string;
}

export interface ParagraphFeedbackResult {
    policyVersion: "curated-writing-feedback-v1";
    resultPolicy: "REFERENCE_ONLY";
    observations: (ParagraphFeedbackText & { requirementId: string; status: "MET" | "UNMET" | "UNCERTAIN"; segmentIds: string[]; answerQuotes: string[] })[];
    necessaryCorrections: (ParagraphFeedbackText & { requirementId: string; segmentId: string; original: string; replacement: string })[];
    optionalAlternatives: (ParagraphFeedbackText & { segmentId: string; original: string; replacement: string })[];
    uncertainties: (ParagraphFeedbackText & { requirementId: string })[];
}

export interface ParagraphWritingAttempt extends CuratedWritingAttempt {
    feedback?: { status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "UNCERTAIN"; result: ParagraphFeedbackResult | null; failureCode: string | null; canRetry: boolean };
}

export interface ParagraphWritingItem extends Omit<CuratedWritingItem, "attempts"> {
    attempts: ParagraphWritingAttempt[];
    workload: {
        sourceCharacterCount: number;
        estimatedAnswerCharacters: null;
        estimateStatus: "NOT_SPECIFIED";
    };
}

export interface ParagraphWritingPlan extends Omit<ParagraphWritingPreview, "canStart" | "requiresPartialConsent" | "qaOnly"> {
    dailySetId: number;
    learningDate: string;
    releaseId: string;
    originLanguage: string;
    learningLanguage: string;
    status: "READY" | "PARTIAL" | "COMPLETED" | "BLOCKED";
    sentenceCount: number;
    generatedItemCount: number;
    submittedItemCount: number;
    feedbackCompletedItemCount: number;
    planRevision: number;
    replacementCount: number;
    reviewAvailable: boolean;
    personalizedFeedbackStatus: "DISABLED_PENDING_QUALITY_GATE" | "ACTIVE_QA";
    supplyStopReason: "CANCELLED" | "DEADLINE" | "BUDGET_EXHAUSTED" | null;
    items: ParagraphWritingItem[];
}
