"use client";

import { useTranslations } from "next-intl";

import {
    DisclosureContent,
    DisclosureToggleButton,
    type DisclosureControlProps,
} from "@/components/language-learning/common/LanguageLearningDisclosure";
import type {
    ListeningMetricTrendPoint,
    ListeningTaskTrendPoint,
} from "@/types/language-learning/dashboard";

export function DashboardListeningTrendWidget({
    tasks,
    metrics,
    disclosure,
}: {
    tasks: ListeningTaskTrendPoint[];
    metrics: ListeningMetricTrendPoint[];
    disclosure: DisclosureControlProps;
}) {
    const t = useTranslations("LanguageLearning.dashboard.v3");
    const taskLatest = latestBy(tasks, (item) => item.taskType);
    const metricLatest = latestBy(metrics, (item) => `${item.taskType}:${item.metric}`);
    const contentId = "dashboard-listening-trends-content";

    if (tasks.length === 0 && metrics.length === 0) return null;

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900" data-testid="dashboard-listening-trends">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("trend.listeningTitle")}</h2>
                    <p className="mt-1 text-sm text-slate-400">{t("trend.listeningDescription")}</p>
                </div>
                <DisclosureToggleButton {...disclosure} controls={contentId} compact />
            </div>
            <DisclosureContent id={contentId} isOpen={disclosure.isOpen}>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {[...taskLatest.values()].map((item) => (
                        <div key={item.taskType} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                            <p className="text-xs font-black text-slate-400">{t(`task.${item.taskType}`)}</p>
                            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{item.averageScore === null ? "—" : Math.round(item.averageScore)}</p>
                            <p className="mt-1 text-xs text-slate-400">{item.date} · {t("trend.samples", { count: item.sampleCount })}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {[...metricLatest.values()].map((item) => (
                        <div key={`${item.taskType}-${item.metric}`} className="rounded-xl border border-slate-100 px-3 py-3 dark:border-white/10">
                            <p className="text-xs font-bold text-slate-400">{t(`task.${item.taskType}`)} · {t(`metric.${item.metric}`)}</p>
                            <p className="mt-1 font-black text-slate-800 dark:text-slate-100">{item.averageScore === null ? "—" : Math.round(item.averageScore)}</p>
                        </div>
                    ))}
                </div>
            </DisclosureContent>
        </section>
    );
}

function latestBy<T extends { date: string }>(items: T[], keyOf: (item: T) => string) {
    const map = new Map<string, T>();
    for (const item of items) {
        const key = keyOf(item);
        const current = map.get(key);
        if (!current || current.date <= item.date) map.set(key, item);
    }
    return map;
}
