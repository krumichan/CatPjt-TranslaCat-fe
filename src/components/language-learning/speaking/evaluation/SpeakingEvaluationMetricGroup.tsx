"use client";

import { SpeakingEvaluationMetricCard } from "@/components/language-learning/speaking/evaluation/SpeakingEvaluationMetricCard";
import type { SpeakingMetric, SpeakingMetricType } from "@/types/language-learning/speaking";

export function SpeakingEvaluationMetricGroup({
    title,
    types,
    metrics,
    onEvidence,
}: {
    title: string;
    types: SpeakingMetricType[];
    metrics: Map<SpeakingMetricType, SpeakingMetric>;
    onEvidence: (turnId: string, turnIndex?: number) => void;
}) {
    const actualMetrics = types.map((type) => metrics.get(type)).filter(Boolean);
    return (
        <section>
            <h2 className="mb-3 text-lg font-black text-slate-900 dark:text-white">{title}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {actualMetrics.map((metric) => metric && (
                    <SpeakingEvaluationMetricCard key={metric.metricType} metric={metric} onEvidence={onEvidence} />
                ))}
            </div>
        </section>
    );
}
