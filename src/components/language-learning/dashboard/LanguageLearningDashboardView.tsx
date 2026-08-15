"use client";

import type { ReactNode } from "react";

import { useTranslations } from "next-intl";

import { DashboardDifficultyWidget } from "@/components/language-learning/dashboard/widgets/DashboardDifficultyWidget";
import { DashboardInsightWidget } from "@/components/language-learning/dashboard/widgets/DashboardInsightWidget";
import { DashboardKeywordWidget } from "@/components/language-learning/dashboard/widgets/DashboardKeywordWidget";
import { DashboardMonthlyReportWidget } from "@/components/language-learning/dashboard/widgets/DashboardMonthlyReportWidget";
import { DashboardRecentLearningWidget } from "@/components/language-learning/dashboard/widgets/DashboardRecentLearningWidget";
import { DashboardScoreWidget } from "@/components/language-learning/dashboard/widgets/DashboardScoreWidget";
import { DashboardSkillRadarWidget } from "@/components/language-learning/dashboard/widgets/DashboardSkillRadarWidget";
import { DashboardSourceTrendWidget } from "@/components/language-learning/dashboard/widgets/DashboardSourceTrendWidget";
import { DashboardSpeakingSummaryWidget } from "@/components/language-learning/dashboard/widgets/DashboardSpeakingSummaryWidget";
import { DashboardSpeakingTodayWidget } from "@/components/language-learning/dashboard/widgets/DashboardSpeakingTodayWidget";
import { DashboardTrendWidget } from "@/components/language-learning/dashboard/widgets/DashboardTrendWidget";
import { DashboardUnifiedInsightWidget } from "@/components/language-learning/dashboard/widgets/DashboardUnifiedInsightWidget";
import { DashboardWeaknessWidget } from "@/components/language-learning/dashboard/widgets/DashboardWeaknessWidget";
import { DashboardWidgetErrorBoundary } from "@/components/language-learning/dashboard/widgets/DashboardWidgetErrorBoundary";
import { Link } from "@/navigation";
import type {
    DashboardPeriod,
    DashboardSourceFilter,
    LanguageLearningDashboard,
} from "@/types/language-learning/dashboard";
import type { LanguageLearningProfile } from "@/types/language-learning/profile";

interface LanguageLearningDashboardViewProps {
    dashboard: LanguageLearningDashboard;
    profile: LanguageLearningProfile;
    recheckRecommended: boolean;
    period: DashboardPeriod;
    source: DashboardSourceFilter;
    onPeriodChange: (value: DashboardPeriod) => void;
    onSourceChange: (value: DashboardSourceFilter) => void;
}

export function LanguageLearningDashboardView({
    dashboard,
    profile,
    recheckRecommended,
    period,
    source,
    onPeriodChange,
    onSourceChange,
}: LanguageLearningDashboardViewProps) {
    const t = useTranslations("LanguageLearning.dashboard");
    const widgetFallback = (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
            {t("v2.widgetFailed")}
        </section>
    );

    const isolate = (key: string, widget: ReactNode) => (
        <DashboardWidgetErrorBoundary key={key} fallback={widgetFallback}>
            {widget}
        </DashboardWidgetErrorBoundary>
    );

    return (
        <div className="space-y-6" data-testid="language-learning-dashboard">
            {profile.state === "CALIBRATING" && (
                <section className="rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4 text-sm text-cyan-900 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-100">
                    <p className="font-black">{t("calibration.title")}</p>
                    <p className="mt-1 leading-6">
                        {t("calibration.description")}
                    </p>
                </section>
            )}

            {recheckRecommended && (
                <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-400/20 dark:bg-amber-500/10">
                    <div>
                        <p className="font-black text-amber-950 dark:text-amber-100">
                            {t("recheck.title")}
                        </p>
                        <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                            {t("recheck.description")}
                        </p>
                    </div>
                    <Link
                        href="/language-learning/level-test"
                        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white hover:bg-amber-500"
                    >
                        {t("recheck.action")}
                    </Link>
                </section>
            )}

            {isolate(
                "today-v2",
                <DashboardSpeakingTodayWidget dashboard={dashboard} />,
            )}
            {isolate(
                "score",
                <DashboardScoreWidget dashboard={dashboard} />,
            )}
            {isolate(
                `source-trend-${period}-${source}`,
                <DashboardSourceTrendWidget
                    data={dashboard.sourceSkillTrend}
                    period={period}
                    source={source}
                    onPeriodChange={onPeriodChange}
                    onSourceChange={onSourceChange}
                />,
            )}

            <div className="grid gap-6 xl:grid-cols-2">
                {isolate(
                    "skill-radar",
                    <DashboardSkillRadarWidget scores={dashboard.skillRadar} />,
                )}
                {isolate(
                    "writing-trend",
                    <DashboardTrendWidget data={dashboard.metricTrend} />,
                )}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                {isolate(
                    "speaking-summary",
                    <DashboardSpeakingSummaryWidget
                        data={dashboard.speakingSummary}
                    />,
                )}
                {isolate(
                    "unified-insight",
                    <DashboardUnifiedInsightWidget data={dashboard.insights} />,
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {isolate(
                    "difficulty",
                    <DashboardDifficultyWidget
                        data={dashboard.difficultyPerformance}
                    />,
                )}
                {isolate(
                    "keyword",
                    <DashboardKeywordWidget data={dashboard.keywordMastery} />,
                )}
                {isolate(
                    "weakness",
                    <DashboardWeaknessWidget
                        grammarWeaknesses={dashboard.grammarWeaknesses}
                        errorPatterns={dashboard.errorPatterns}
                    />,
                )}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                {isolate(
                    "profile-insight",
                    <DashboardInsightWidget profile={profile} />,
                )}
                {isolate(
                    "monthly-report",
                    <DashboardMonthlyReportWidget
                        report={dashboard.monthlyReport}
                    />,
                )}
            </div>

            {isolate(
                "recent-learning",
                <DashboardRecentLearningWidget
                    items={dashboard.recentLearningHistory}
                />,
            )}
        </div>
    );
}
