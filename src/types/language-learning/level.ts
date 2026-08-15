import type {
    LearningProfileState,
    LevelTestDifficulty,
    LevelTestSessionType,
    WritingMetric,
} from "@/types/language-learning/common";
import type { WritingEvaluation } from "@/types/language-learning/daily";

export interface LevelTestStatus {
    profileState: LearningProfileState;
    initialLevelTestCompleted: boolean;
    recheckRecommended: boolean;
    activeSessionId: number | null;
    currentQuestionNumber: number | null;
    baseLevelScore: number | null;
}

export interface LevelTestQuestion {
    sessionId: number;
    sessionType: LevelTestSessionType;
    questionNumber: number;
    totalQuestions: number;
    difficulty: LevelTestDifficulty;
    originText: string;
    focusMetrics: WritingMetric[];
    focusReason: string;
    promptVersion: string;
}

export interface LevelTestAnswerRequest {
    answer: string;
}

export interface LevelTestAnswerResult {
    sessionId: number;
    questionNumber: number;
    evaluation: WritingEvaluation;
    completed: boolean;
    baseLevelScore: number | null;
    nextQuestion: LevelTestQuestion | null;
}
