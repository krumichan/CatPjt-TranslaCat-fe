import type {
    DifficultyPerformance,
    KeywordMastery,
    ProfileSignal,
    SkillScores,
} from "@/types/language-learning/profile";
import type { LearningSource } from "@/types/language-learning/history";

export type DashboardSourceFilter = "ALL" | LearningSource;
export type DashboardPeriod = "7d" | "30d";

export interface ScorePoint {
    date: string;
    overall: number;
    meaning: number;
    grammar: number;
    vocabulary: number;
    naturalness: number;
    expression: number;
}

export interface RecentLearning {
    learningDate: string;
    sentenceCount: number;
    status: string;
    averageScore: number | null;
}

export interface MonthlyReport {
    month: string;
    evaluatedSentenceCount: number;
    overallAverage: number | null;
    strongestMetric: string | null;
    weakestMetric: string | null;
}

export interface SpeakingTodayProgress {
    completedSessions: number;
    completedMinutes: number;
    goalMinutes: number;
    status: string;
}

export interface LearningStreak {
    current: number;
    longest: number;
    lastStudyDate: string | null;
}

export interface SpeakingFeatureSummary {
    sessions: number;
    totalMinutes: number;
    overallAverage: number | null;
    fluencyAverage: number | null;
    pronunciationAverage: number | null;
    interactionAverage: number | null;
    collectingData: boolean;
}

export interface DashboardMetricPoint {
    date: string;
    score: number;
}

export interface SourceSkillTrend {
    source: DashboardSourceFilter;
    sampleCount: number;
    confidence: number;
    collectingData: boolean;
    metrics: Record<string, DashboardMetricPoint[]>;
}

export interface UnifiedDashboardInsight {
    patternKey: string;
    direction: string;
    evidenceCount: number;
    weightedEvidence: number;
    sources: LearningSource[];
    unified: boolean;
    recommendedFocus: string | null;
}

export interface DashboardInsights {
    strengths: UnifiedDashboardInsight[];
    weaknesses: UnifiedDashboardInsight[];
    recommendedFocus: string[];
}

export interface LanguageLearningDashboard {
    todayCompleted: number;
    todayTotal: number;
    currentStreak: number;
    totalStudySentenceCount: number;
    weeklyAverageScore: number | null;
    monthlyAverageScore: number | null;
    skillRadar: SkillScores;
    metricTrend: ScorePoint[];
    difficultyPerformance: DifficultyPerformance;
    keywordMastery: KeywordMastery[];
    grammarWeaknesses: ProfileSignal[];
    errorPatterns: ProfileSignal[];
    recentLearningHistory: RecentLearning[];
    monthlyReport: MonthlyReport;
    speakingToday: SpeakingTodayProgress;
    streak: LearningStreak;
    speakingSummary: SpeakingFeatureSummary;
    sourceSkillTrend: SourceSkillTrend;
    insights: DashboardInsights;
    source: DashboardSourceFilter;
}
