"use client";

import { useTranslations } from "next-intl";

import { AppSelect } from "@/components/common/AppSelect";
import type {
    DashboardPeriod,
    DashboardSourceFilter,
    SourceSkillTrend,
} from "@/types/language-learning/dashboard";

interface DashboardSourceTrendWidgetProps {
    data: SourceSkillTrend;
    period: DashboardPeriod;
    source: DashboardSourceFilter;
    onPeriodChange: (value: DashboardPeriod) => void;
    onSourceChange: (value: DashboardSourceFilter) => void;
}

export function DashboardSourceTrendWidget({
    data,
    period,
    source,
    onPeriodChange,
    onSourceChange,
}: DashboardSourceTrendWidgetProps) {
    const t = useTranslations("LanguageLearning.dashboard.v2");
    const metricT = useTranslations("LanguageLearning.dashboard.v3.metric");
    const entries = Object.entries(data.metrics ?? {});

    return (
        <section
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900"
            data-testid="dashboard-source-trend"
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                        {t("skillTrend")}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                        {t("trendSamples", { count: data.sampleCount })}
                    </p>
                </div>

                <div className="flex gap-2">
                    <AppSelect
                        value={source}
                        aria-label={t("skillTrend")}
                        onChange={(event) =>
                            onSourceChange(
                                event.target.value as DashboardSourceFilter,
                            )
                        }
                        className="w-auto min-w-28 py-2 text-xs"
                    >
                        <option value="ALL">{t("source.ALL")}</option>
                        <option value="WRITING">{t("source.WRITING")}</option>
                        <option value="SPEAKING">{t("source.SPEAKING")}</option>
                        <option value="LISTENING">{t("source.LISTENING")}</option>
                        <option value="READING">{t("source.READING")}</option>
                    </AppSelect>
                    <AppSelect
                        value={period}
                        aria-label={t("trendPeriod")}
                        onChange={(event) =>
                            onPeriodChange(event.target.value as DashboardPeriod)
                        }
                        className="w-auto min-w-24 py-2 text-xs"
                    >
                        <option value="7d">7D</option>
                        <option value="30d">30D</option>
                    </AppSelect>
                </div>
            </div>

            {data.collectingData || entries.length === 0 ? (
                <p className="mt-6 text-sm text-slate-400">
                    {t("collectingData")}
                </p>
            ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {entries.map(([metric, points]) => {
                        const latest = points.at(-1)?.score ?? null;

                        return (
                            <div
                                key={metric}
                                className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"
                            >
                                <p className="text-xs font-black uppercase text-slate-400">
                                    {metricT(metric)}
                                </p>
                                <p className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">
                                    {latest === null ? "—" : Math.round(latest)}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    {t("points", { count: points.length })}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
