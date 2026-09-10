"use client";

import { resolveListeningResultMetric } from "@/features/language-learning/listening/resultMetric";

import { useTranslations } from "next-intl";

export function ListeningResultMetricRow({ metric }: { metric: Record<string, unknown> }) {
    const t = useTranslations("LanguageLearning.listening.result.metrics");
    const { key: metricKey, value, known } = resolveListeningResultMetric(metric);
    const label = known ? t(metricKey as never) : metricKey;
    return (
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <p className="text-xs font-black text-slate-400">{label}</p>
            <p className="mt-1 font-black text-slate-800 dark:text-slate-100">{typeof value === "number" ? Math.round(value) : "—"}</p>
        </div>
    );
}
