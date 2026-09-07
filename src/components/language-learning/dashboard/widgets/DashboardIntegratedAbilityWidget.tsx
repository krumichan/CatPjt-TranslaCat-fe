"use client";

import { useTranslations } from "next-intl";

import {
    DisclosureContent,
    DisclosureToggleButton,
    type DisclosureControlProps,
} from "@/components/language-learning/common/LanguageLearningDisclosure";
import type { DashboardIntegratedAbility } from "@/types/language-learning/dashboard";

export function DashboardIntegratedAbilityWidget({
    data,
    disclosure,
}: {
    data: DashboardIntegratedAbility;
    disclosure: DisclosureControlProps;
}) {
    const t = useTranslations("LanguageLearning.dashboard.v3");
    const contentId = "dashboard-integrated-ability-content";

    return (
        <section
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900"
            data-testid="dashboard-integrated-ability"
        >
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600 dark:text-blue-300">
                        {t("integrated.eyebrow")}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                        {t("integrated.title")}
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-3xl font-black text-slate-950 dark:text-white">
                            {data.overall === null ? "—" : Math.round(data.overall)}
                        </p>
                        <p className="text-xs font-bold text-slate-400">
                            {t("integrated.confidence", { value: data.confidence })}
                        </p>
                    </div>
                    <DisclosureToggleButton
                        {...disclosure}
                        controls={contentId}
                        compact
                    />
                </div>
            </div>

            <DisclosureContent id={contentId} isOpen={disclosure.isOpen}>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    {t("integrated.measured", {
                        measured: data.measuredMetricCount,
                        total: data.totalMetricCount,
                    })}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {data.groups.map((group) => (
                        <div key={group.group} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                            <p className="text-xs font-black text-slate-400">
                                {t(`group.${group.group}`)}
                            </p>
                            <p className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">
                                {group.score === null ? "—" : Math.round(group.score)}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                                {t("integrated.groupMeasured", { count: group.measuredMetricCount })}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {data.metrics.map((metric) => (
                        <div key={metric.metric} className="rounded-2xl border border-slate-100 p-4 dark:border-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                                    {t(`metric.${metric.metric}`)}
                                </p>
                                <span className="text-lg font-black text-slate-900 dark:text-white">
                                    {metric.score === null ? "—" : Math.round(metric.score)}
                                </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-400">
                                {metric.collectingData
                                    ? t("collectingData")
                                    : t("integrated.metricMeta", {
                                          count: metric.sampleCount,
                                          confidence: metric.confidence,
                                      })}
                            </p>
                        </div>
                    ))}
                </div>
            </DisclosureContent>
        </section>
    );
}
