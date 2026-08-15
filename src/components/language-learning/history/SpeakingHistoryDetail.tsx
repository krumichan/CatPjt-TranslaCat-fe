"use client";

import { useTranslations } from "next-intl";

import { AudioPlaybackButton } from "@/components/language-learning/speaking/common/AudioPlaybackButton";
import { SpeakingEvaluationMetricCard } from "@/components/language-learning/speaking/evaluation/SpeakingEvaluationMetricCard";
import {
    parsePronunciationPractice,
    parseRecommendedExpressions,
} from "@/components/language-learning/speaking/evaluation/speakingEvaluationParser";
import type { SpeakingHistoryDetail as SpeakingHistoryDetailType } from "@/types/language-learning/history";

export function SpeakingHistoryDetail({
    detail,
}: {
    detail: SpeakingHistoryDetailType;
}) {
    const t = useTranslations("LanguageLearning.history.unified");
    const configT = useTranslations("LanguageLearning.speaking.start.config");
    const evaluationT = useTranslations("LanguageLearning.speaking.evaluation");
    const evaluation = detail.evaluation;
    const expressions = parseRecommendedExpressions(
        evaluation?.recommendedExpressionsJson ?? null,
    );
    const pronunciation = parsePronunciationPractice(
        evaluation?.pronunciationPracticeJson ?? null,
    );

    const jumpToTurn = (turnId: string, turnIndex?: number) => {
        const turn = detail.turns.find(
            (item) =>
                String(item.id) === turnId || item.turnIndex === turnIndex,
        );
        if (!turn) return;

        document
            .getElementById(`history-speaking-turn-${turn.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    return (
        <div className="space-y-5" data-testid="speaking-history-detail">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                    {detail.session.learningDate}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                    {detail.session.topicTitle ??
                        detail.session.customTopic ??
                        t("freeTalk")}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {t("speakingSummary", {
                        turns: detail.session.completedTurns,
                        minutes: Math.ceil(
                            detail.session.totalDurationSeconds / 60,
                        ),
                    })}
                </p>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <HistoryMeta
                        label={t("startMode")}
                        value={configT(
                            `startMode.${detail.session.resolvedStartMode}.label`,
                        )}
                    />
                    <HistoryMeta
                        label={t("correctionMode")}
                        value={configT(
                            `correctionMode.${detail.session.correctionMode}.label`,
                        )}
                    />
                </dl>

                {evaluation?.overallScore !== null &&
                    evaluation?.overallScore !== undefined && (
                        <p className="mt-4 text-3xl font-black text-blue-600 dark:text-blue-300">
                            {Math.round(evaluation.overallScore)}
                            <span className="ml-1 text-sm text-slate-400">
                                /100
                            </span>
                        </p>
                    )}
            </section>

            {evaluation?.metrics.length ? (
                <section>
                    <h3 className="mb-3 text-base font-black text-slate-900 dark:text-white">
                        {t("speakingMetrics")}
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {evaluation.metrics.map((metric) => (
                            <SpeakingEvaluationMetricCard
                                key={metric.metricType}
                                metric={metric}
                                onEvidence={jumpToTurn}
                            />
                        ))}
                    </div>
                </section>
            ) : null}

            {expressions.length > 0 || pronunciation.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                        <h3 className="font-black text-slate-900 dark:text-white">
                            {evaluationT("recommendedExpressions")}
                        </h3>
                        <div className="mt-3 space-y-2">
                            {expressions.map((item, index) => (
                                <article
                                    key={index}
                                    className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"
                                >
                                    {item.original && (
                                        <p className="text-xs text-slate-400 line-through">
                                            {item.original}
                                        </p>
                                    )}
                                    <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">
                                        {item.recommended ?? "—"}
                                    </p>
                                    {item.explanation && (
                                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                            {item.explanation}
                                        </p>
                                    )}
                                </article>
                            ))}
                            {expressions.length === 0 && (
                                <p className="text-sm text-slate-400">—</p>
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                        <h3 className="font-black text-slate-900 dark:text-white">
                            {evaluationT("pronunciationPractice")}
                        </h3>
                        <div className="mt-3 space-y-2">
                            {pronunciation.map((item, index) => (
                                <article
                                    key={index}
                                    className="rounded-xl bg-violet-50 p-3 dark:bg-violet-500/10"
                                >
                                    <p className="text-sm font-black text-violet-900 dark:text-violet-100">
                                        {item.practicePhrase ?? item.target ?? "—"}
                                    </p>
                                    {item.reason && (
                                        <p className="mt-1 text-xs leading-5 text-violet-700 dark:text-violet-200">
                                            {item.reason}
                                        </p>
                                    )}
                                </article>
                            ))}
                            {pronunciation.length === 0 && (
                                <p className="text-sm text-slate-400">—</p>
                            )}
                        </div>
                    </section>
                </div>
            ) : null}

            <section className="space-y-3">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {t("fullTranscript")}
                </h3>
                {detail.turns.map((turn) => (
                    <article
                        id={`history-speaking-turn-${turn.id}`}
                        key={turn.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900"
                    >
                        <p className="text-xs font-black text-blue-600 dark:text-blue-300">
                            Turn {turn.turnIndex}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                            {turn.transcript ?? t("noTranscript")}
                        </p>
                        {turn.assistantText && (
                            <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    AI · {turn.assistantText}
                                </p>
                                <div className="mt-2">
                                    <AudioPlaybackButton
                                        url={turn.assistantAudioUrl}
                                    />
                                </div>
                            </div>
                        )}
                    </article>
                ))}
            </section>

            <p className="rounded-xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                {t("userAudioUnavailable")}
            </p>
            <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                {t("assistanceHistoryUnavailable")}
            </p>
        </div>
    );
}

function HistoryMeta({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
            <dt className="text-[11px] font-bold text-slate-400">{label}</dt>
            <dd className="mt-1 text-sm font-black text-slate-700 dark:text-slate-200">
                {value}
            </dd>
        </div>
    );
}
