"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/navigation";
import type { DashboardActivityPerformanceItem } from "@/types/language-learning/dashboard";

interface DashboardActivityPerformanceCardProps {
    name: "writing" | "speaking" | "listening" | "reading";
    icon: LucideIcon;
    data: DashboardActivityPerformanceItem;
    href: string | null;
}

export function DashboardActivityPerformanceCard({
    name,
    icon: Icon,
    data,
    href,
}: DashboardActivityPerformanceCardProps) {
    const t = useTranslations("LanguageLearning.dashboard.v3");
    const target = data.today?.target ?? 0;
    const completed = data.today?.completed ?? 0;
    const percent = target <= 0 ? 0 : Math.min(100, Math.round((completed / target) * 100));

    return (
        <article
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900"
            data-testid={name === "speaking" ? "dashboard-speaking-summary" : `dashboard-activity-${name}`}
        >
            <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <h3 className="font-black text-slate-900 dark:text-white">
                    {t(`activity.${name}`)}
                </h3>
            </div>
            <div className="mt-4 flex items-end justify-between gap-2">
                <div>
                    <p className="text-xs text-slate-400">{t("activity.recentScore")}</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {data.recentScore === null ? "—" : Math.round(data.recentScore)}
                    </p>
                </div>
                <p className="text-right text-xs font-bold text-slate-400">
                    {t("activity.samples", { count: data.sampleCount })}
                </p>
            </div>
            <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                {data.collectingData
                    ? t("collectingData")
                    : t("activity.coverage", {
                          evaluated: data.coverage?.evaluated ?? 0,
                          total: data.coverage?.total ?? 0,
                      })}
            </p>
            <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label={t(`activity.${name}`)}
            >
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">
                {t("activity.today", {
                    completed,
                    target,
                    unit: data.today?.unit ?? "",
                })}
            </p>
            {href && (
                <Link
                    href={href}
                    className="mt-4 inline-flex rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-200"
                >
                    {t("activity.start")}
                </Link>
            )}
        </article>
    );
}
