import type { DailyWritingSet } from "@/types/language-learning/daily";
import type {
    SpeakingEvaluation,
    SpeakingSession,
    SpeakingTurn,
} from "@/types/language-learning/speaking";

export type LearningSource = "WRITING" | "SPEAKING";
export type LearningHistorySourceFilter = "ALL" | LearningSource;

export interface LearningHistoryItem {
    activityId: string;
    source: LearningSource;
    learningDate: string;
    title: string;
    topic: string | null;
    durationSeconds: number;
    overallScore: number | null;
    completionStatus: string;
    evaluationStatus: string;
}

export interface SpeakingHistoryDetail {
    session: SpeakingSession;
    turns: SpeakingTurn[];
    evaluation: SpeakingEvaluation | null;
}

export interface WritingLearningHistoryDetail {
    activityId: string;
    source: "WRITING";
    detail: DailyWritingSet;
}

export interface SpeakingLearningHistoryDetail {
    activityId: string;
    source: "SPEAKING";
    detail: SpeakingHistoryDetail;
}

export type LearningHistoryDetail =
    | WritingLearningHistoryDetail
    | SpeakingLearningHistoryDetail;
