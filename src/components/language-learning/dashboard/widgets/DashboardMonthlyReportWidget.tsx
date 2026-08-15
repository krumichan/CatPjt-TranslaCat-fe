"use client";

import { useTranslations } from "next-intl";

import { DashboardWidgetCard } from "@/components/language-learning/dashboard/widgets/DashboardWidgetCard";
import type { MonthlyReport } from "@/types/language-learning/dashboard";

export function DashboardMonthlyReportWidget({ report }: { report: MonthlyReport }) {
    const t = useTranslations("LanguageLearning.dashboard.widgets.monthly");

    return (
        <DashboardWidgetCard title={t("title")}>
            <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                    <dt className="text-xs font-bold text-slate-400">{t("month")}</dt>
                    <dd className="mt-1 font-black text-slate-900 dark:text-white">{report.month}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                    <dt className="text-xs font-bold text-slate-400">{t("count")}</dt>
                    <dd className="mt-1 font-black text-slate-900 dark:text-white">{report.evaluatedSentenceCount}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                    <dt className="text-xs font-bold text-slate-400">{t("average")}</dt>
                    <dd className="mt-1 font-black text-slate-900 dark:text-white">{report.overallAverage?.toFixed(1) ?? "-"}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                    <dt className="text-xs font-bold text-slate-400">{t("strongest")}</dt>
                    <dd className="mt-1 truncate font-black text-slate-900 dark:text-white">{report.strongestMetric ?? "-"}</dd>
                </div>
            </dl>
            {report.weakestMetric && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    {t("weakest", { metric: report.weakestMetric })}
                </p>
            )}
        </DashboardWidgetCard>
    );
}
