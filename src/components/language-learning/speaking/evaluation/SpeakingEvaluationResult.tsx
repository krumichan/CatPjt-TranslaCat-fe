"use client";

import { useTranslations } from "next-intl";

import { SpeakingAssistanceSummary } from "@/components/language-learning/speaking/evaluation/SpeakingAssistanceSummary";
import { SpeakingEvaluationMetricCard } from "@/components/language-learning/speaking/evaluation/SpeakingEvaluationMetricCard";
import {
    parsePronunciationPractice,
    parseRecommendedExpressions,
    parseTextList,
} from "@/components/language-learning/speaking/evaluation/speakingEvaluationParser";
import type { SpeakingEvaluationController } from "@/hooks/language-learning/speaking/useSpeakingEvaluationController";
import type { SpeakingMetric, SpeakingMetricType } from "@/types/language-learning/speaking";

const COMMON_METRICS: SpeakingMetricType[] = [
    "GRAMMAR",
    "VOCABULARY",
    "NATURALNESS",
    "MEANING",
    "EXPRESSIVENESS",
];
const SPEAKING_METRICS: SpeakingMetricType[] = ["FLUENCY", "PRONUNCIATION", "INTERACTION"];

export function SpeakingEvaluationResult({
    controller,
}: {
    controller: SpeakingEvaluationController;
}) {
    const t = useTranslations("LanguageLearning.speaking.evaluation");
    const evaluation = controller.evaluation;
    if (!evaluation) return null;

    const strengths = parseTextList(evaluation.strengthsJson);
    const improvements = parseTextList(evaluation.improvementsJson);
    const expressions = parseRecommendedExpressions(evaluation.recommendedExpressionsJson);
    const pronunciation = parsePronunciationPractice(evaluation.pronunciationPracticeJson);
    const metricsByType = new Map(evaluation.metrics.map((metric) => [metric.metricType, metric]));

    const jumpToTurn = (turnId: string, turnIndex?: number) => {
        const matchedTurn = controller.session?.turns.find(
            (turn) => String(turn.id) === turnId || turn.turnIndex === turnIndex,
        );
        if (!matchedTurn) return;
        const target = document.querySelector(
            `[data-testid="evaluation-turn-${matchedTurn.turnIndex}"]`,
        );
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    return (
        <div className="space-y-6" data-testid="speaking-evaluation-result">
            <section className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-100">{t("overall")}</p>
                <div className="mt-2 flex items-end gap-3">
                    <strong className="text-5xl font-black">{evaluation.overallScore === null ? "—" : Math.round(evaluation.overallScore)}</strong>
                    <span className="pb-1 text-sm font-bold text-blue-100">/ 100</span>
                </div>
                {evaluation.evaluationConfidence !== null && (
                    <p className="mt-2 text-xs text-blue-100">{t("confidence", { value: Math.round(evaluation.evaluationConfidence * 100) })}</p>
                )}
            </section>

            <MetricGroup title={t("commonMetrics")} types={COMMON_METRICS} metrics={metricsByType} onEvidence={jumpToTurn} />
            <MetricGroup title={t("speakingMetrics")} types={SPEAKING_METRICS} metrics={metricsByType} onEvidence={jumpToTurn} />

            <div className="grid gap-5 lg:grid-cols-2">
                <TextListCard title={t("strengths")} items={strengths} empty={t("emptyStrengths")} />
                <TextListCard title={t("improvements")} items={improvements} empty={t("emptyImprovements")} />
            </div>

            <SpeakingAssistanceSummary />

            {expressions.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("recommendedExpressions")}</h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {expressions.map((item, index) => (
                            <article key={index} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                                {item.original && <p className="text-xs text-slate-400 line-through">{item.original}</p>}
                                <p className="mt-1 font-black text-slate-800 dark:text-slate-100">{item.recommended ?? "—"}</p>
                                {item.explanation && <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.explanation}</p>}
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {pronunciation.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("pronunciationPractice")}</h2>
                    <div className="mt-4 space-y-3">
                        {pronunciation.map((item, index) => (
                            <div key={index} className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-500/10">
                                <p className="font-black text-violet-900 dark:text-violet-100">{item.practicePhrase ?? item.target ?? "—"}</p>
                                {item.reason && <p className="mt-2 text-sm leading-6 text-violet-700 dark:text-violet-200">{item.reason}</p>}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {controller.session?.turns.length ? (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("evidenceTranscript")}</h2>
                    <div className="mt-4 space-y-3">
                        {controller.session.turns.map((turn) => (
                            <article key={turn.id} data-testid={`evaluation-turn-${turn.turnIndex}`} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                                <p className="text-xs font-black text-blue-600 dark:text-blue-300">Turn {turn.turnIndex}</p>
                                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{turn.transcript ?? "—"}</p>
                                {turn.assistantText && <p className="mt-2 border-l-2 border-slate-300 pl-3 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">AI · {turn.assistantText}</p>}
                            </article>
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    );
}

function MetricGroup({
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

function TextListCard({ title, items, empty }: { title: string; items: string[]; empty: string }) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
            {items.length ? (
                <ul className="mt-4 space-y-2">
                    {items.map((item, index) => <li key={index} className="rounded-xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600 dark:bg-white/5 dark:text-slate-300">{item}</li>)}
                </ul>
            ) : <p className="mt-3 text-sm text-slate-400">{empty}</p>}
        </section>
    );
}
