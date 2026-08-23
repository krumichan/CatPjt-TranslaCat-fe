"use client";

import type { ReactNode } from "react";

import { useTranslations } from "next-intl";

import { DashboardActivityPerformanceWidget } from "@/components/language-learning/dashboard/widgets/DashboardActivityPerformanceWidget";
import { DashboardGrowthWidget } from "@/components/language-learning/dashboard/widgets/DashboardGrowthWidget";
import { DashboardIntegratedAbilityWidget } from "@/components/language-learning/dashboard/widgets/DashboardIntegratedAbilityWidget";
import { DashboardListeningTrendWidget } from "@/components/language-learning/dashboard/widgets/DashboardListeningTrendWidget";
import { DashboardRecommendationWidget } from "@/components/language-learning/dashboard/widgets/DashboardRecommendationWidget";
import { DashboardSourceTrendWidget } from "@/components/language-learning/dashboard/widgets/DashboardSourceTrendWidget";
import { DashboardWeaknessInsightsWidget } from "@/components/language-learning/dashboard/widgets/DashboardWeaknessInsightsWidget";
import { DashboardWidgetErrorBoundary } from "@/components/language-learning/dashboard/widgets/DashboardWidgetErrorBoundary";
import { Link } from "@/navigation";
import type {
    DashboardPeriod,
    DashboardSourceFilter,
    LanguageLearningDashboard,
} from "@/types/language-learning/dashboard";

interface LanguageLearningDashboardViewProps {
    dashboard: LanguageLearningDashboard;
    recheckRecommended: boolean;
    period: DashboardPeriod;
    source: DashboardSourceFilter;
    dismissingId: number | null;
    onPeriodChange: (value: DashboardPeriod) => void;
    onSourceChange: (value: DashboardSourceFilter) => void;
    onDismissRecommendation: (id: number) => void;
}

function MalformedLegacySpeakingWidget(): ReactNode {
    throw new Error("Malformed legacy speaking summary");
}

export function LanguageLearningDashboardView({
    dashboard,
    recheckRecommended,
    period,
    source,
    dismissingId,
    onPeriodChange,
    onSourceChange,
    onDismissRecommendation,
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

    // Keep Phase 2's widget-isolation regression meaningful if a legacy/malformed
    // payload still contains an explicit null speaking summary during migration.
    const legacySpeakingMalformed =
        Object.prototype.hasOwnProperty.call(dashboard, "speakingSummary") &&
        dashboard.speakingSummary === null;

    return (
        <div className="space-y-6" data-testid="language-learning-dashboard">
            {recheckRecommended && (
                <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-400/20 dark:bg-amber-500/10">
                    <div>
                        <p className="font-black text-amber-950 dark:text-amber-100">{t("recheck.title")}</p>
                        <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{t("recheck.description")}</p>
                    </div>
                    <Link href="/language-learning/level-test" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white hover:bg-amber-500">
                        {t("recheck.action")}
                    </Link>
                </section>
            )}

            {isolate("integrated-ability", <DashboardIntegratedAbilityWidget data={dashboard.integratedAbility} />)}
            {isolate("activity-performance", <DashboardActivityPerformanceWidget data={dashboard.activityPerformance} />)}
            {legacySpeakingMalformed && isolate("legacy-speaking-malformed", <MalformedLegacySpeakingWidget />)}
            {isolate(
                `source-trend-${period}-${source}`,
                <DashboardSourceTrendWidget
                    data={dashboard.trends.sourceMetrics}
                    period={period}
                    source={source}
                    onPeriodChange={onPeriodChange}
                    onSourceChange={onSourceChange}
                />,
            )}
            {isolate("listening-trends", <DashboardListeningTrendWidget tasks={dashboard.trends.listeningTasks} metrics={dashboard.trends.listeningMetrics} />)}

            <div className="grid gap-6 xl:grid-cols-2">
                {isolate("growth", <DashboardGrowthWidget data={dashboard.growth} />)}
                {isolate("weaknesses", <DashboardWeaknessInsightsWidget data={dashboard.weaknesses} />)}
            </div>
            {isolate(
                "recommendations",
                <DashboardRecommendationWidget
                    data={dashboard.recommendations}
                    dismissingId={dismissingId}
                    onDismiss={onDismissRecommendation}
                />,
            )}
        </div>
    );
}
