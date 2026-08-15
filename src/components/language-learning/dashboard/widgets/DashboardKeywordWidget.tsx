"use client";

import { useTranslations } from "next-intl";

import { DashboardWidgetCard } from "@/components/language-learning/dashboard/widgets/DashboardWidgetCard";
import type { KeywordMastery } from "@/types/language-learning/profile";

export function DashboardKeywordWidget({ data }: { data: KeywordMastery[] }) {
    const t = useTranslations("LanguageLearning.dashboard.widgets.keyword");
    const sorted = [...data].sort((a, b) => b.score - a.score).slice(0, 8);

    return (
        <DashboardWidgetCard title={t("title")}>
            {sorted.length === 0 ? (
                <p className="text-sm text-slate-400">{t("empty")}</p>
            ) : (
                <ul className="space-y-2">
                    {sorted.map((item) => (
                        <li key={item.canonicalKey} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                                {item.canonicalKey}
                            </span>
                            <span className="text-sm font-black text-blue-600 dark:text-blue-300">
                                {item.score.toFixed(0)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </DashboardWidgetCard>
    );
}
