"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/navigation";
import type { DashboardRecommendation } from "@/types/language-learning/dashboard";

export function DashboardRecommendationWidget({
    data,
    dismissingId,
    onDismiss,
}: {
    data: DashboardRecommendation[];
    dismissingId: number | null;
    onDismiss: (id: number) => void;
}) {
    const t = useTranslations("LanguageLearning.dashboard.v3");
    const visible = data.filter((item) => item.status === "ACTIVE").slice(0, 2);

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900" data-testid="dashboard-recommendations">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("recommendation.title")}</h2>
            {visible.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">{t("recommendation.empty")}</p>
            ) : (
                <div className="mt-4 space-y-3">
                    {visible.map((item) => {
                        const href = item.recommendedActivity === "LISTENING"
                            ? "/language-learning/listening"
                            : item.recommendedActivity === "SPEAKING"
                              ? "/language-learning/speaking"
                              : "/language-learning/writing";
                        return (
                            <article key={item.recommendationId} className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-500/10">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase text-blue-600 dark:text-blue-300">{t(`metric.${item.targetMetric}`)}</p>
                                        <p className="mt-2 text-sm font-bold leading-6 text-slate-800 dark:text-slate-100">{item.reason}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onDismiss(item.recommendationId)}
                                        disabled={dismissingId === item.recommendationId}
                                        aria-label={t("recommendation.dismiss")}
                                        className="rounded-lg p-2 text-slate-400 hover:bg-white/60 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
                                    >
                                        <X className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </div>
                                <Link href={href} className="mt-3 inline-flex rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500">
                                    {item.ctaLabel || t("recommendation.start")}
                                </Link>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
