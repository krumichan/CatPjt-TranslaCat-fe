import type { LearningSource } from "@/types/language-learning/history";
import type {
    ListeningProfileMetric,
    ListeningRecommendationStatus,
    ListeningTaskType,
} from "@/types/language-learning/listening";

export type DashboardSourceFilter = "ALL" | LearningSource;
export type DashboardPeriod = "7d" | "30d";

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

export interface DashboardAbilityMetric {
    metric: string;
    score: number | null;
    sampleCount: number;
    confidence: string;
    collectingData: boolean;
}

export interface DashboardAbilityGroup {
    group: string;
    score: number | null;
    measuredMetricCount: number;
}

export interface DashboardIntegratedAbility {
    overall: number | null;
    confidence: string;
    measuredMetricCount: number;
    totalMetricCount: number;
    groups: DashboardAbilityGroup[];
    metrics: DashboardAbilityMetric[];
}

export interface DashboardCoverage {
    evaluated: number;
    total: number;
}

export interface DashboardTodayProgress {
    completed: number;
    target: number;
    unit: string;
}

export interface DashboardActivityPerformanceItem {
    recentScore: number | null;
    coverage: DashboardCoverage;
    today: DashboardTodayProgress;
    sampleCount: number;
    collectingData: boolean;
}

export interface DashboardActivityPerformance {
    writing: DashboardActivityPerformanceItem;
    speaking: DashboardActivityPerformanceItem;
    listening: DashboardActivityPerformanceItem;
    reading: DashboardActivityPerformanceItem;
}

export interface DashboardGrowth {
    metric: string;
    source: string;
    taskType: ListeningTaskType | null;
    previousAverage: number | null;
    recentAverage: number | null;
    delta: number | null;
    previousSampleCount: number;
    recentSampleCount: number;
}

export interface DashboardWeakness {
    key: string;
    state: string;
    evidenceCount: number;
    recentScore: number | null;
    sources: LearningSource[];
    recommendedFocus: string | null;
}

export interface DashboardRecommendation {
    recommendationId: number;
    targetMetric: ListeningProfileMetric;
    recommendedActivity: string;
    recommendedTask: string | null;
    reason: string;
    ctaLabel: string | null;
    priority: number;
    status: ListeningRecommendationStatus;
    expiresAt: string | null;
}

export interface ListeningTaskTrendPoint {
    taskType: ListeningTaskType;
    date: string;
    averageScore: number | null;
    sampleCount: number;
}

export interface ListeningMetricTrendPoint {
    taskType: ListeningTaskType;
    metric: string;
    date: string;
    averageScore: number | null;
    sampleCount: number;
}

export interface DashboardTrends {
    sourceMetrics: SourceSkillTrend;
    listeningTasks: ListeningTaskTrendPoint[];
    listeningMetrics: ListeningMetricTrendPoint[];
}

/**
 * Phase 3 improves the existing dashboard contract instead of introducing a
 * versioned endpoint. Integrated ability and activity performance deliberately
 * remain separate dimensions.
 */
export interface LanguageLearningDashboard {
    learningLanguage: string;
    from: string;
    to: string;
    source: DashboardSourceFilter;
    integratedAbility: DashboardIntegratedAbility;
    activityPerformance: DashboardActivityPerformance;
    growth: DashboardGrowth[];
    weaknesses: DashboardWeakness[];
    recommendations: DashboardRecommendation[];
    trends: DashboardTrends;

    // Optional legacy marker used only so the Phase 2 widget isolation regression
    // test can keep asserting that a malformed legacy payload does not break the page.
    speakingSummary?: unknown;
}
