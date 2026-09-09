export type PracticeDomain = "READING" | "VOCABULARY";
export type ReadingMode = "COMPREHENSION" | "STRUCTURE" | "CONTEXT_INFERENCE";
export type VocabularyMode = "MEANING_RELATION" | "USAGE_DISTINCTION" | "COMPOSITION";
export type PracticeMode = ReadingMode | VocabularyMode;
export type PracticeQuestionType = "SINGLE_CHOICE" | "ORDERING";
export type PracticeDifficulty = "EASIER" | "CURRENT" | "CHALLENGE";
export type PracticeSetStatus = "ACTIVE" | "COMPLETED";
export type PracticeGenerationStatus = "PENDING" | "GENERATING" | "READY" | "PARTIAL" | "FAILED";

export interface PracticeOption {
    key: string;
    text: string;
}

export interface PracticeAttempt {
    attemptId: number;
    attemptNo: number;
    answer: string[];
    correct: boolean;
    official: boolean;
    submittedAt: string;
}

export interface PracticeQuestion {
    questionId: number;
    order: number;
    questionType: PracticeQuestionType;
    difficulty: PracticeDifficulty;
    complexityBand: number;
    passageId: string | null;
    passageText: string | null;
    prompt: string;
    options: PracticeOption[];
    skillTag: string;
    targetExpression: string | null;
    reviewTarget: boolean;
    vocabularyCandidates: string[];
    answered: boolean;
    correct: boolean;
    canRetry: boolean;
    attempts: PracticeAttempt[];
    correctAnswer: string[];
    evidenceText: string | null;
    explanationOrigin: string | null;
    explanationLearning: string | null;
}

export interface PracticeMetric {
    skillTag: string;
    score: number;
    sampleCount: number;
}

export interface PracticeSet {
    practiceSetId: number;
    learningDate: string;
    domain: PracticeDomain;
    mode: string;
    status: PracticeSetStatus;
    generationStatus?: PracticeGenerationStatus;
    generatedQuestionCount?: number;
    generationFailureMessage?: string | null;
    questionCount: number;
    answeredCount: number;
    correctCount: number;
    officialScore: number | null;
    complexityBand: number;
    promptVersion: string | null;
    metrics: PracticeMetric[];
    questions: PracticeQuestion[];
}

export interface PracticeTodayModeStatus {
    mode: string;
    practiceSetId: number;
    status: PracticeSetStatus;
    generationStatus?: PracticeGenerationStatus;
    generatedQuestionCount?: number;
    generationFailureMessage?: string | null;
    answeredCount: number;
    questionCount: number;
    officialScore: number | null;
}

export interface PracticeAnswerResult {
    questionId: number;
    attemptNo: number;
    correct: boolean;
    official: boolean;
    setCompleted: boolean;
    officialScore: number | null;
    correctAnswer: string[];
    evidenceText: string | null;
    explanationOrigin: string | null;
    explanationLearning: string | null;
}

export interface VocabularyMasteryItem {
    canonicalKey: string;
    displayExpression: string;
    score: number;
    stage: "NEW" | "LEARNING" | "FAMILIAR" | "STRONG" | "MASTERED";
    evaluationCount: number;
}

export interface VocabularyMasterySummary {
    total: number;
    averageScore: number;
    newCount: number;
    learningCount: number;
    familiarCount: number;
    strongCount: number;
    masteredCount: number;
    weakest: VocabularyMasteryItem[];
}
