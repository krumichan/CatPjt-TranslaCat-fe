import type { DailyWritingType } from "@/types/language-learning/common";

export const WRITING_PREPARATION_REASONS = ["AUTOMATED_CHECK_ONLY", "CORE_CONTENT_FIXED", "CONTENT_CHECK_FAILED", "PROVIDER_FAILED", "EXECUTION_UNCERTAIN"] as const;
export interface WritingPreparationRequest {
    requestKey: string;
    writingType: DailyWritingType;
    targetBand: number;
    topicKey: string;
    repairOfRequestKey?: string;
    repairNotes?: string;
}
export interface WritingPreparation {
    requestKey: string;
    preparationId: string;
    status: "RUNNING" | "GENERATED" | "SUCCEEDED" | "FAILED" | "UNCERTAIN";
    policyVersion: "curated-writing-generation-v1" | "curated-writing-generation-v2";
    catalogId: string;
    reviewStatus: "DRAFT";
    qaOnly: true;
    failureCode: string | null;
    provider: string | null;
    model: string | null;
    requiresReconciliation: boolean;
    writingType: DailyWritingType;
    targetBand: number;
    topicKey: string;
    repairOfRequestKey: string | null;
    repairNotes: string | null;
    repairMode: "CORE_REPLACEMENT" | "CONTENT_REPAIR";
    canRepair: boolean;
    repairBlockedReason: "NOT_FINISHED" | "NO_SAVED_CONTENT" | "REPAIR_LIMIT" | "CONTENT_EXHAUSTED" | null;
    quality: {
        contractStatus: "PASSED" | "FAILED" | "PENDING";
        semanticStatus: "NOT_REVIEWED";
        humanReview: "NOT_PERFORMED";
        releaseStatus: "QA_ONLY";
        reasonCodes: (typeof WRITING_PREPARATION_REASONS[number])[];
    };
    candidate: null | {
        catalogId: string;
        contentHash: string;
        writingType: DailyWritingType;
        targetBand: number;
        topicKey: string;
        prompt: string;
        providedFacts: string[];
        requiredIntents: string[];
        responseConstraints: string[];
        visibleRequirements: string[];
    };
}
