import type {
    DifficultyPerformance,
    KeywordMastery,
    ProfileSignal,
    SkillScores,
} from "@/types/language-learning/profile";

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
}
