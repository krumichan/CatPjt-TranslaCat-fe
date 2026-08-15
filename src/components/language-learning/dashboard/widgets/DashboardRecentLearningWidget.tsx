"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { DashboardWidgetCard } from "@/components/language-learning/dashboard/widgets/DashboardWidgetCard";
import { Link } from "@/navigation";
import type { RecentLearning } from "@/types/language-learning/dashboard";

export function DashboardRecentLearningWidget({ items }: { items: RecentLearning[] }) {
    const t = useTranslations("LanguageLearning.dashboard.widgets.recent");

    return (
        <DashboardWidgetCard title={t("title")}>
            {items.length === 0 ? (
                <p className="text-sm text-slate-400">{t("empty")}</p>
            ) : (
                <div className="space-y-2">
                    {items.slice(0, 8).map((item) => (
                        <div key={item.learningDate} className="flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                            <div className="min-w-0 flex-1">
                                <p className="font-black text-slate-800 dark:text-slate-100">{item.learningDate}</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {t("sentences", { count: item.sentenceCount })} · {item.status}
                                </p>
                            </div>
                            <span className="font-black text-blue-600 dark:text-blue-300">
                                {item.averageScore?.toFixed(1) ?? "-"}
                            </span>
                        </div>
                    ))}
                    <div className="pt-2 text-right">
                        <Link href="/language-learning/history" className="inline-flex items-center gap-1 text-sm font-black text-blue-600 hover:text-blue-500 dark:text-blue-300">
                            {t("viewAll")}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            )}
        </DashboardWidgetCard>
    );
}
