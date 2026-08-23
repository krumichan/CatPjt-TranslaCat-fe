import type { DailyWritingSet } from "@/types/language-learning/daily";
import type { ListeningHistoryDetail } from "@/types/language-learning/listening";
import type {
    SpeakingEvaluation,
    SpeakingSession,
    SpeakingTurn,
} from "@/types/language-learning/speaking";

export type LearningSource = "WRITING" | "SPEAKING" | "LISTENING" | "READING";
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

export interface ListeningLearningHistoryDetail {
    activityId: string;
    source: "LISTENING";
    detail: ListeningHistoryDetail;
}

export interface ReadingLearningHistoryDetail {
    activityId: string;
    source: "READING";
    detail: unknown;
}

export type LearningHistoryDetail =
    | WritingLearningHistoryDetail
    | SpeakingLearningHistoryDetail
    | ListeningLearningHistoryDetail
    | ReadingLearningHistoryDetail;
