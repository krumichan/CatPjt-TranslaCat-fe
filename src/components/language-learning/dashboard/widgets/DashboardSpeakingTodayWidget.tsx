"use client";

import { Mic2, PencilLine } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/navigation";
import type { LanguageLearningDashboard } from "@/types/language-learning/dashboard";

export function DashboardSpeakingTodayWidget({
    dashboard,
}: {
    dashboard: LanguageLearningDashboard;
}) {
    const t = useTranslations("LanguageLearning.dashboard.v2");
    const speaking = dashboard.speakingToday;
    const speakingPercent =
        speaking.goalMinutes <= 0
            ? 0
            : Math.min(
                  100,
                  Math.round(
                      (speaking.completedMinutes / speaking.goalMinutes) * 100,
                  ),
              );
    const writingPercent =
        dashboard.todayTotal <= 0
            ? 0
            : Math.min(
                  100,
                  Math.round(
                      (dashboard.todayCompleted / dashboard.todayTotal) * 100,
                  ),
              );

    return (
        <section
            className="grid gap-4 md:grid-cols-2"
            data-testid="dashboard-learning-progress-v2"
        >
            <ProgressCard
                icon={PencilLine}
                title={t("writingToday")}
                value={t("writingProgress", {
                    completed: dashboard.todayCompleted,
                    total: dashboard.todayTotal,
                })}
                percent={writingPercent}
                href="/language-learning/writing"
                actionLabel={t("startWriting")}
            />
            <ProgressCard
                icon={Mic2}
                title={t("speakingToday")}
                value={t("speakingProgress", {
                    minutes: speaking.completedMinutes,
                    goal: speaking.goalMinutes,
                    sessions: speaking.completedSessions,
                })}
                percent={speakingPercent}
                href="/language-learning/speaking"
                actionLabel={t("startSpeaking")}
            />
        </section>
    );
}

function ProgressCard({
    icon: Icon,
    title,
    value,
    percent,
    href,
    actionLabel,
}: {
    icon: typeof Mic2;
    title: string;
    value: string;
    percent: number;
    href: "/language-learning/writing" | "/language-learning/speaking";
    actionLabel: string;
}) {
    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <h2 className="font-black text-slate-900 dark:text-white">
                    {title}
                </h2>
            </div>
            <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                {value}
            </p>
            <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label={title}
            >
                <div
                    className="h-full rounded-full bg-blue-600 transition-all motion-reduce:transition-none"
                    style={{ width: `${percent}%` }}
                />
            </div>
            <Link
                href={href}
                className="mt-4 inline-flex rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20"
            >
                {actionLabel}
            </Link>
        </article>
    );
}
