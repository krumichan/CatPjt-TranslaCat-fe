"use client";

import { useTranslations } from "next-intl";

import { DashboardWidgetCard } from "@/components/language-learning/dashboard/widgets/DashboardWidgetCard";
import type { DifficultyPerformance } from "@/types/language-learning/profile";

export function DashboardDifficultyWidget({ data }: { data: DifficultyPerformance }) {
    const t = useTranslations("LanguageLearning.dashboard.widgets.difficulty");
    const rows = [
        ["review", data.review],
        ["normal", data.normal],
        ["challenge", data.challenge],
    ] as const;

    return (
        <DashboardWidgetCard title={t("title")}>
            <div className="space-y-4">
                {rows.map(([key, value]) => (
                    <div key={key}>
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-slate-600 dark:text-slate-300">
                                {t(key)}
                            </span>
                            <span className="font-black text-slate-900 dark:text-white">
                                {value == null ? "-" : value.toFixed(1)}
                            </span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </DashboardWidgetCard>
    );
}
