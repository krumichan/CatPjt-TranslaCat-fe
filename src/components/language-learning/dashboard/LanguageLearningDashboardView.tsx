"use client";

import { useTranslations } from "next-intl";

import { DashboardDifficultyWidget } from "@/components/language-learning/dashboard/widgets/DashboardDifficultyWidget";
import { DashboardInsightWidget } from "@/components/language-learning/dashboard/widgets/DashboardInsightWidget";
import { DashboardKeywordWidget } from "@/components/language-learning/dashboard/widgets/DashboardKeywordWidget";
import { DashboardMonthlyReportWidget } from "@/components/language-learning/dashboard/widgets/DashboardMonthlyReportWidget";
import { DashboardRecentLearningWidget } from "@/components/language-learning/dashboard/widgets/DashboardRecentLearningWidget";
import { DashboardScoreWidget } from "@/components/language-learning/dashboard/widgets/DashboardScoreWidget";
import { DashboardSkillRadarWidget } from "@/components/language-learning/dashboard/widgets/DashboardSkillRadarWidget";
import { DashboardTrendWidget } from "@/components/language-learning/dashboard/widgets/DashboardTrendWidget";
import { DashboardWeaknessWidget } from "@/components/language-learning/dashboard/widgets/DashboardWeaknessWidget";
import { Link } from "@/navigation";
import type { LanguageLearningDashboard } from "@/types/language-learning/dashboard";
import type { LanguageLearningProfile } from "@/types/language-learning/profile";

interface LanguageLearningDashboardViewProps {
    dashboard: LanguageLearningDashboard;
    profile: LanguageLearningProfile;
    recheckRecommended: boolean;
}

export function LanguageLearningDashboardView({
    dashboard,
    profile,
    recheckRecommended,
}: LanguageLearningDashboardViewProps) {
    const t = useTranslations("LanguageLearning.dashboard");

    return (
        <div className="space-y-6" data-testid="language-learning-dashboard">
            {profile.state === "CALIBRATING" && (
                <section className="rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4 text-sm text-cyan-900 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-100">
                    <p className="font-black">{t("calibration.title")}</p>
                    <p className="mt-1 leading-6">{t("calibration.description")}</p>
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

            <DashboardScoreWidget dashboard={dashboard} />

            <div className="grid gap-6 xl:grid-cols-2">
                <DashboardSkillRadarWidget scores={dashboard.skillRadar} />
                <DashboardTrendWidget data={dashboard.metricTrend} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                <DashboardDifficultyWidget data={dashboard.difficultyPerformance} />
                <DashboardKeywordWidget data={dashboard.keywordMastery} />
                <DashboardWeaknessWidget
                    grammarWeaknesses={dashboard.grammarWeaknesses}
                    errorPatterns={dashboard.errorPatterns}
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <DashboardInsightWidget profile={profile} />
                <DashboardMonthlyReportWidget report={dashboard.monthlyReport} />
            </div>

            <DashboardRecentLearningWidget items={dashboard.recentLearningHistory} />
        </div>
    );
}
