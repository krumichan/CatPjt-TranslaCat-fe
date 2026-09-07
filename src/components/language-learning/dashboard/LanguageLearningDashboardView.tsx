"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { useTranslations } from "next-intl";

import {
    DisclosureAllButton,
    DisclosureContent,
    DisclosureToggleButton,
    usePersistentDisclosureMap,
} from "@/components/language-learning/common/LanguageLearningDisclosure";
import { DashboardLearningProfileSection } from "@/components/language-learning/dashboard/DashboardLearningProfileSection";
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
import type { LevelTestHistoryItem, LevelTestStatus } from "@/types/language-learning/level";
import type { LanguageLearningProfile } from "@/types/language-learning/profile";

interface LanguageLearningDashboardViewProps {
    dashboard: LanguageLearningDashboard;
    profile: LanguageLearningProfile | null;
    levelStatus: LevelTestStatus | null;
    latestLevelTest: LevelTestHistoryItem | null;
    isLoadingProfile: boolean;
    profileLoadError: boolean;
    recheckRecommended: boolean;
    period: DashboardPeriod;
    source: DashboardSourceFilter;
    dismissingId: number | null;
    onPeriodChange: (value: DashboardPeriod) => void;
    onSourceChange: (value: DashboardSourceFilter) => void;
    onDismissRecommendation: (id: number) => void;
    onRetryProfile: () => void;
}

type MajorSectionKey = "overview" | "profile";
type DashboardSectionKey =
    | "integrated"
    | "activity"
    | "sourceTrend"
    | "listeningTrend"
    | "growth"
    | "weakness"
    | "recommendation";

const MAJOR_DESKTOP_DEFAULTS: Record<MajorSectionKey, boolean> = {
    overview: true,
    profile: true,
};
const MAJOR_MOBILE_DEFAULTS: Record<MajorSectionKey, boolean> = {
    overview: true,
    profile: false,
};
const DASHBOARD_DESKTOP_DEFAULTS: Record<DashboardSectionKey, boolean> = {
    integrated: true,
    activity: true,
    sourceTrend: true,
    listeningTrend: true,
    growth: true,
    weakness: true,
    recommendation: true,
};
const DASHBOARD_MOBILE_DEFAULTS: Record<DashboardSectionKey, boolean> = {
    integrated: true,
    activity: false,
    sourceTrend: false,
    listeningTrend: false,
    growth: false,
    weakness: false,
    recommendation: false,
};

function MalformedLegacySpeakingWidget(): ReactNode {
    throw new Error("Malformed legacy speaking summary");
}

export function LanguageLearningDashboardView({
    dashboard,
    profile,
    levelStatus,
    latestLevelTest,
    isLoadingProfile,
    profileLoadError,
    recheckRecommended,
    period,
    source,
    dismissingId,
    onPeriodChange,
    onSourceChange,
    onDismissRecommendation,
    onRetryProfile,
}: LanguageLearningDashboardViewProps) {
    const t = useTranslations("LanguageLearning.dashboard");
    const common = useTranslations("LanguageLearning.common");
    const majorDisclosure = usePersistentDisclosureMap<MajorSectionKey>({
        storageKey: "translacat.language-learning.dashboard.major.v1",
        desktopDefaults: MAJOR_DESKTOP_DEFAULTS,
        mobileDefaults: MAJOR_MOBILE_DEFAULTS,
    });
    const dashboardDisclosure = usePersistentDisclosureMap<DashboardSectionKey>({
        storageKey: "translacat.language-learning.dashboard.sections.v1",
        desktopDefaults: DASHBOARD_DESKTOP_DEFAULTS,
        mobileDefaults: DASHBOARD_MOBILE_DEFAULTS,
    });

    useEffect(() => {
        if (window.location.hash === "#learning-profile") {
            majorDisclosure.setOpen("profile", true);
        }
    }, [majorDisclosure.setOpen]);

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

    const disclosureFor = (key: DashboardSectionKey) => ({
        isOpen: dashboardDisclosure.state[key],
        onToggle: () => dashboardDisclosure.toggle(key),
        expandLabel: common("accordion.expand"),
        collapseLabel: common("accordion.collapse"),
    });

    const legacySpeakingMalformed =
        Object.prototype.hasOwnProperty.call(dashboard, "speakingSummary") &&
        dashboard.speakingSummary === null;

    const overviewContentId = "dashboard-overview-disclosure-content";

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

            <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 dark:border-white/10 dark:bg-white/[0.025]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
                            {t("sections.overview")}
                        </h2>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {t("sections.overviewDescription")}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                        {majorDisclosure.state.overview && (
                            <DisclosureAllButton
                                allOpen={dashboardDisclosure.allOpen}
                                onSetAll={dashboardDisclosure.setAll}
                                expandAllLabel={common("accordion.expandAll")}
                                collapseAllLabel={common("accordion.collapseAll")}
                            />
                        )}
                        <DisclosureToggleButton
                            isOpen={majorDisclosure.state.overview}
                            onToggle={() => majorDisclosure.toggle("overview")}
                            expandLabel={common("accordion.expand")}
                            collapseLabel={common("accordion.collapse")}
                            controls={overviewContentId}
                        />
                    </div>
                </div>

                <DisclosureContent id={overviewContentId} isOpen={majorDisclosure.state.overview} className="space-y-6 pt-5">
                    {isolate(
                        "integrated-ability",
                        <DashboardIntegratedAbilityWidget
                            data={dashboard.integratedAbility}
                            disclosure={disclosureFor("integrated")}
                        />,
                    )}
                    {isolate(
                        "activity-performance",
                        <DashboardActivityPerformanceWidget
                            data={dashboard.activityPerformance}
                            disclosure={disclosureFor("activity")}
                        />,
                    )}
                    {legacySpeakingMalformed && isolate("legacy-speaking-malformed", <MalformedLegacySpeakingWidget />)}
                    {isolate(
                        `source-trend-${period}-${source}`,
                        <DashboardSourceTrendWidget
                            data={dashboard.trends.sourceMetrics}
                            period={period}
                            source={source}
                            onPeriodChange={onPeriodChange}
                            onSourceChange={onSourceChange}
                            disclosure={disclosureFor("sourceTrend")}
                        />,
                    )}
                    {isolate(
                        "listening-trends",
                        <DashboardListeningTrendWidget
                            tasks={dashboard.trends.listeningTasks}
                            metrics={dashboard.trends.listeningMetrics}
                            disclosure={disclosureFor("listeningTrend")}
                        />,
                    )}

                    <div className="grid gap-6 xl:grid-cols-2">
                        {isolate(
                            "growth",
                            <DashboardGrowthWidget
                                data={dashboard.growth}
                                disclosure={disclosureFor("growth")}
                            />,
                        )}
                        {isolate(
                            "weaknesses",
                            <DashboardWeaknessInsightsWidget
                                data={dashboard.weaknesses}
                                disclosure={disclosureFor("weakness")}
                            />,
                        )}
                    </div>
                    {isolate(
                        "recommendations",
                        <DashboardRecommendationWidget
                            data={dashboard.recommendations}
                            dismissingId={dismissingId}
                            onDismiss={onDismissRecommendation}
                            disclosure={disclosureFor("recommendation")}
                        />,
                    )}
                </DisclosureContent>
            </section>

            <DashboardLearningProfileSection
                profile={profile}
                levelStatus={levelStatus}
                latestLevelTest={latestLevelTest}
                isLoading={isLoadingProfile}
                loadError={profileLoadError}
                onRetry={onRetryProfile}
                isOpen={majorDisclosure.state.profile}
                onToggle={() => majorDisclosure.toggle("profile")}
            />
        </div>
    );
}
