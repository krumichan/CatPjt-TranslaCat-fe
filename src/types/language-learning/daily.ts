import type {
    BilingualMessage,
    DailySetStatus,
    DailyWritingDifficulty,
    WritingCorrection,
    WritingEvaluationContext,
    WritingMetric,
} from "@/types/language-learning/common";

export interface WritingEvaluation {
    evaluationId: number;
    context: WritingEvaluationContext;
    overall: number;
    meaning: number;
    grammar: number;
    vocabulary: number;
    naturalness: number;
    expression: number;
    strengths: BilingualMessage[];
    weaknesses: BilingualMessage[];
    corrections: WritingCorrection[];
    recommendedAnswers: string[];
    explanation: BilingualMessage;
    evaluationRubricVersion: string;
    scoringPolicyVersion: string;
    promptVersion: string;
    evaluatedAt: string;
}

export interface WritingAnswerAttempt {
    answerId: number;
    attemptDate: string;
    answer: string;
    submittedAt: string;
    evaluation: WritingEvaluation | null;
}

export interface DailyWritingItem {
    itemId: number;
    order: number;
    difficulty: DailyWritingDifficulty;
    originText: string;
    keywords: string[];
    focusMetrics: WritingMetric[];
    focusReason: string;
    answered: boolean;
    answeredToday: boolean;
    canSubmit: boolean;
    attempts: WritingAnswerAttempt[];
}

export interface DailyWritingSet {
    dailySetId: number;
    learningDate: string;
    snapshotId: string;
    status: DailySetStatus;
    sentenceCount: number;
    regenerationCount: number;
    promptVersion: string | null;
    reviewAvailable: boolean;
    items: DailyWritingItem[];
}

export interface AnswerSubmitRequest {
    answer: string;
}

export interface AnswerResult {
    answerId: number;
    itemId: number;
    attemptDate: string;
    evaluation: WritingEvaluation;
}
