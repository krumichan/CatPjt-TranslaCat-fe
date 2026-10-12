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

export type ParagraphRelationCheck = "PRESERVED" | "CONFLICT" | "NOT_APPLICABLE" | "UNCERTAIN";
export type ParagraphRelationChecks = Record<"causality" | "chronology" | "specificity" | "stance", ParagraphRelationCheck>;

export interface ParagraphRequirementPart {
    requirementQuote: string;
    status: "PRESENT" | "ABSENT" | "CONFLICT" | "UNCERTAIN";
    evidence: { segmentId: string; quote: string }[];
    taskFactIds: string[];
    taskConditionIds?: string[];
}

export interface ParagraphFeedbackPatch {
    original: string;
    replacement: string;
}

export interface ParagraphFeedbackResult {
    policyVersion: "curated-writing-feedback-v1" | "curated-writing-feedback-v2" | "curated-writing-feedback-v3" | "curated-writing-feedback-v4" | "curated-writing-feedback-v5" | "curated-writing-feedback-v6" | "curated-writing-feedback-v7" | "curated-writing-feedback-v8" | "curated-writing-feedback-v9";
    resultPolicy: "REFERENCE_ONLY";
    observations: (ParagraphFeedbackText & { requirementId: string; status: "MET" | "UNMET" | "UNCERTAIN"; evidenceKind?: "LEARNER_TEXT" | "MISSING_REQUIREMENT"; segmentIds: string[]; answerQuotes: string[]; relationChecks?: ParagraphRelationChecks; requirementParts?: ParagraphRequirementPart[] })[];
    necessaryCorrections: (ParagraphFeedbackText & { requirementId: string; segmentId: string; original: string; replacement: string; issueType?: "LANGUAGE_FORM" | "TASK_FACT_CONFLICT" | "TASK_CONDITION_CONFLICT"; sourceFactId?: string; sourceAuthorityId?: string; formReason?: "SPELLING" | "INFLECTION" | "SYNTAX" | "NONE"; patch?: ParagraphFeedbackPatch })[];
    optionalAlternatives: (ParagraphFeedbackText & { suggestionKind?: "EXPRESSION_ONLY" | "HYPOTHETICAL_EXAMPLE"; segmentId: string; original: string; replacement: string; relationChecks?: ParagraphRelationChecks; requirementId?: string; patch?: ParagraphFeedbackPatch })[];
    uncertainties: (ParagraphFeedbackText & { requirementId: string })[];
}

export interface ParagraphWritingAttempt extends CuratedWritingAttempt {
    feedback?: { status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "UNCERTAIN"; result: ParagraphFeedbackResult | null; failureCode: string | null; canRetry: boolean };
}

export interface ParagraphWritingItem extends Omit<CuratedWritingItem, "attempts"> {
    attempts: ParagraphWritingAttempt[];
    taskRequirements?: string[];
    workload: {
        sourceCharacterCount: number;
        estimatedAnswerCharacters: null;
        estimateStatus: "NOT_SPECIFIED";
    };
}

export interface ParagraphWritingPlan extends Omit<ParagraphWritingPreview, "canStart" | "requiresPartialConsent" | "qaOnly"> {
    activity?: {
        referenceId: string;
        status: "IN_PROGRESS" | "COMPLETED";
        learningDate: string;
        metadata: {
            activityUnit: "PLAN";
            planId: number;
            policyVersion: typeof PARAGRAPH_WRITING_POLICY;
            resultPolicy: "REFERENCE_ONLY";
            writingType: DailyWritingType;
            originLanguage: string;
            learningLanguage: string;
            targetItemCount: number;
            acquiredItemCount: number;
            submittedItemCount: number;
            durationStatus: "NOT_MEASURED";
        };
    } | null;
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
