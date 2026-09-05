import type {
    LearningProfileState,
    LevelTestSessionType,
} from "@/types/language-learning/common";

export type LevelTestAssessmentVersion = "WRITING_ONLY" | "MULTI_SKILL";
export type LevelTestProficiencyBand =
    | "FOUNDATION"
    | "BASIC"
    | "INTERMEDIATE"
    | "UPPER_INTERMEDIATE"
    | "ADVANCED";
export type LevelTestSessionStatus =
    | "IN_PROGRESS"
    | "EVALUATING"
    | "COMPLETED"
    | "FAILED"
    | "ABANDONED";
export type LevelTestDomain =
    | "VOCABULARY"
    | "GRAMMAR"
    | "READING"
    | "LISTENING"
    | "WRITING"
    | "SPEAKING";
export type LevelTestAnswerMode = "CHOICE" | "TEXT" | "AUDIO";
export type LevelTestRecommendedDifficulty = "EASY" | "MY_LEVEL" | "CHALLENGE";
export type LevelTestItemStatus =
    | "READY"
    | "ANSWERED"
    | "EVALUATING"
    | "EVALUATED"
    | "EVALUATION_FAILED";
export type LevelTestItemType =
    | "VOCAB_CONTEXT_CHOICE"
    | "VOCAB_PARAPHRASE_CHOICE"
    | "GRAMMAR_FORM_CHOICE"
    | "GRAMMAR_SENTENCE_ORDER"
    | "READING_GIST"
    | "READING_DETAIL"
    | "READING_DISCOURSE_FUNCTION"
    | "READING_TEXT_INFERENCE"
    | "LISTENING_GIST_CHOICE"
    | "LISTENING_DETAIL_CHOICE"
    | "LISTENING_DICTATION"
    | "LISTENING_INTERPRETATION"
    | "WRITING_TRANSLATION"
    | "WRITING_GUIDED_SENTENCE"
    | "WRITING_SCENARIO_RESPONSE"
    | "WRITING_SHORT_PARAGRAPH"
    | "SPEAKING_REPEAT"
    | "SPEAKING_GUIDED_RESPONSE"
    | "SPEAKING_SHORT_RESPONSE";

export interface LevelTestStatus {
    profileState: LearningProfileState;
    initialLevelTestCompleted: boolean;
    recheckRecommended: boolean;
    activeSessionId: number | null;
    currentQuestionNumber: number | null;
    baseLevelScore: number | null;
    proficiencyBand: LevelTestProficiencyBand | null;
}

export interface LevelTestSession {
    sessionId: number;
    sessionType: LevelTestSessionType;
    assessmentVersion: LevelTestAssessmentVersion;
    status: LevelTestSessionStatus;
    totalQuestions: number;
    currentQuestionNumber: number;
    currentComplexityBand: number;
    baseLevelScore: number | null;
    proficiencyBand: LevelTestProficiencyBand | null;
    startedAt: string;
    completedAt: string | null;
}

export interface LevelTestOption {
    key: string;
    text: string;
}

export interface LevelTestTaskGuidance {
    providedFacts: string[];
    requiredIntents: string[];
    responseConstraints: string[];
}

export interface LevelTestQuestion {
    sessionId: number;
    sessionType: LevelTestSessionType;
    itemId: number;
    questionNumber: number;
    totalQuestions: number;
    domain: LevelTestDomain;
    itemType: LevelTestItemType;
    complexityBand: number;
    instruction: string;
    instructionLanguage: string;
    answerMode: LevelTestAnswerMode;
    answerLanguage: string | null;
    promptText: string;
    options: LevelTestOption[];
    emphasisText: string | null;
    taskGuidance: LevelTestTaskGuidance | null;
    referenceAudioAvailable: boolean;
    repeatReferenceText: string | null;
    referencePlaybackLimit: number | null;
    maxAnswerLength: number | null;
    maxAudioSeconds: number | null;
    status: LevelTestItemStatus;
    evaluationReasonCode: string | null;
}

export interface LevelTestStartRequest {
    type: LevelTestSessionType;
    idempotencyKey: string;
}

export interface LevelTestAnswerRequest {
    selectedOptionKey: string | null;
    selectedOptionKeys: string[];
    textAnswer: string | null;
    idempotencyKey: string;
}

export interface LevelTestAnswerResult {
    sessionId: number;
    itemId: number;
    questionNumber: number;
    evaluable: boolean;
    score: number | null;
    reasonCode: string | null;
    completed: boolean;
    nextQuestion: LevelTestQuestion | null;
}

export interface LevelTestAudioAnswerResult extends LevelTestAnswerResult {
    retentionUntil: string | null;
}

export interface LevelTestDomainScores {
    vocabulary: number | null;
    grammar: number | null;
    reading: number | null;
    listening: number | null;
    writing: number | null;
    speaking: number | null;
}

export interface LevelTestResult {
    sessionId: number;
    assessmentVersion: LevelTestAssessmentVersion;
    sessionType: LevelTestSessionType;
    overallScore: number | null;
    proficiencyBand: LevelTestProficiencyBand | null;
    domainScores: LevelTestDomainScores | null;
    recommendedDifficulty: LevelTestRecommendedDifficulty | null;
    completedAt: string | null;
}

export interface LevelTestHistoryItem {
    sessionId: number;
    assessmentVersion: LevelTestAssessmentVersion;
    sessionType: LevelTestSessionType;
    overallScore: number | null;
    proficiencyBand: LevelTestProficiencyBand | null;
    domainScores: LevelTestDomainScores | null;
    completedAt: string | null;
}

export interface LevelTestDetailedFeedback {
    category: string;
    severity: "INFO" | "STRENGTH" | "IMPROVEMENT" | "CORRECTION" | "OMISSION";
    original: string | null;
    corrected: string | null;
    explanation: string;
}

export interface LevelTestHistoryItemDetail {
    itemId: number;
    questionNumber: number;
    domain: LevelTestDomain;
    itemType: LevelTestItemType;
    complexityBand: number;
    instruction: string;
    promptText: string;
    options: LevelTestOption[];
    emphasisText: string | null;
    taskGuidance: LevelTestTaskGuidance | null;
    selectedOptionKey: string | null;
    selectedOptionKeys: string[];
    textAnswer: string | null;
    audioSubmitted: boolean;
    answerAudioAvailable: boolean;
    referenceAudioAvailable: boolean;
    transcript: string | null;
    recommendedAnswers: string[];
    detailedFeedback: LevelTestDetailedFeedback[];
    modelAnswerAudioAvailable: boolean;
    correctOptionKey: string | null;
    correctOrder: string[];
    evaluable: boolean;
    score: number | null;
    confidence: number | null;
    metrics: Array<Record<string, unknown>>;
    strengths: string[];
    improvements: string[];
    reasonCode: string | null;
}

export interface LevelTestHistoryDetail {
    summary: LevelTestHistoryItem;
    items: LevelTestHistoryItemDetail[];
}
