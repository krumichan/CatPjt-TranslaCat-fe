export type LearningProfileState =
    | "LEVEL_TEST_REQUIRED"
    | "CALIBRATING"
    | "ACTIVE";

export type KeywordSource = "SYSTEM" | "CUSTOM";
export type KeywordType = "TOPIC" | "VOCABULARY";

export type DailySetStatus =
    | "GENERATING"
    | "READY"
    | "COMPLETED"
    | "FAILED";

export type DailyWritingDifficulty =
    | "REVIEW"
    | "NORMAL"
    | "CHALLENGE";

export type WritingMetric =
    | "MEANING"
    | "GRAMMAR"
    | "VOCABULARY"
    | "NATURALNESS"
    | "EXPRESSION"
    | "OVERALL";

export type WritingEvaluationContext = "DAILY" | "LEVEL_TEST";

export type LevelTestSessionType = "INITIAL" | "RECHECK";

export type LevelTestDifficulty =
    | "EASY"
    | "NORMAL"
    | "CHALLENGE";

export interface BilingualMessage {
    originText: string;
    learningText: string;
}

export interface WritingCorrection {
    original: string;
    corrected: string;
    category: string;
    explanation: BilingualMessage;
}
