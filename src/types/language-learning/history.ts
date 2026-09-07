import type { DailyWritingSet } from "@/types/language-learning/daily";
import type { ListeningHistoryDetail } from "@/types/language-learning/listening";
import type { LevelTestHistoryDetail } from "@/types/language-learning/level";
import type { PracticeSet } from "@/types/language-learning/practice";
import type {
    SpeakingEvaluation,
    SpeakingSession,
    SpeakingTurn,
} from "@/types/language-learning/speaking";

export type LearningSource =
    | "WRITING"
    | "SPEAKING"
    | "LISTENING"
    | "READING"
    | "VOCABULARY"
    | "LEVEL_TEST";
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

export interface LevelTestLearningHistoryDetail {
    activityId: string;
    source: "LEVEL_TEST";
    detail: LevelTestHistoryDetail;
}

export interface ReadingLearningHistoryDetail {
    activityId: string;
    source: "READING";
    detail: PracticeSet;
}

export interface VocabularyLearningHistoryDetail {
    activityId: string;
    source: "VOCABULARY";
    detail: PracticeSet;
}

export type LearningHistoryDetail =
    | WritingLearningHistoryDetail
    | SpeakingLearningHistoryDetail
    | ListeningLearningHistoryDetail
    | LevelTestLearningHistoryDetail
    | ReadingLearningHistoryDetail
    | VocabularyLearningHistoryDetail;
