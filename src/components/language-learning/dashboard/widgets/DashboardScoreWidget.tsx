"use client";

import {
    CalendarDays,
    Flame,
    Goal,
    MessageSquareText,
    TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type { LanguageLearningDashboard } from "@/types/language-learning/dashboard";

interface DashboardScoreWidgetProps {
    dashboard: LanguageLearningDashboard;
}

export function DashboardScoreWidget({ dashboard }: DashboardScoreWidgetProps) {
    const t = useTranslations("LanguageLearning.dashboard.summary");
    const todayAverageScore =
        dashboard.todayTotal > 0
            ? (dashboard.recentLearningHistory[0]?.averageScore ?? null)
            : null;

    const cards = [
        {
            key: "todayProgress",
            icon: Goal,
            value: `${dashboard.todayCompleted} / ${dashboard.todayTotal}`,
            label: t("todayProgress"),
        },
        {
            key: "todayScore",
            icon: TrendingUp,
            value: todayAverageScore?.toFixed(1) ?? "-",
            label: t("todayScore"),
        },
        {
            key: "weekly",
            icon: TrendingUp,
            value: dashboard.weeklyAverageScore?.toFixed(1) ?? "-",
            label: t("weekly"),
        },
        {
            key: "monthly",
            icon: CalendarDays,
            value: dashboard.monthlyAverageScore?.toFixed(1) ?? "-",
            label: t("monthly"),
        },
        {
            key: "streak",
            icon: Flame,
            value: t("streakValue", { count: dashboard.currentStreak }),
            label: t("streak"),
        },
        {
            key: "total",
            icon: MessageSquareText,
            value: dashboard.totalStudySentenceCount.toLocaleString(),
            label: t("total"),
        },
    ];

    return (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <article
                        key={card.key}
                        className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                {card.label}
                            </p>
                            <Icon
                                className="h-5 w-5 text-blue-500"
                                aria-hidden="true"
                            />
                        </div>
                        <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
                            {card.value}
                        </p>
                    </article>
                );
            })}
        </section>
    );
}
