"use client";

import { Check, Mic, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import {
    LevelTestPromptText,
} from "@/components/language-learning/level-test/LevelTestPromptText";
import { LevelTestScoreGrid } from "@/components/language-learning/level-test/LevelTestScoreGrid";
import { LevelTestReviewAudioPlayer } from "@/components/language-learning/level-test/LevelTestReviewAudioPlayer";
import type {
    LevelTestHistoryDetail,
    LevelTestHistoryItemDetail,
    LevelTestOption,
} from "@/types/language-learning/level";

interface LevelTestHistoryDetailViewProps {
    detail: LevelTestHistoryDetail;
}

function optionText(options: LevelTestOption[], key: string): string {
    const option = options.find((value) => value.key === key);
    return option ? `${option.key}. ${option.text}` : key;
}

function optionSequence(options: LevelTestOption[], keys: string[]): string {
    return keys.map((key) => optionText(options, key)).join(" → ");
}

function userAnswerText(item: LevelTestHistoryItemDetail): string | null {
    if (item.textAnswer) return item.textAnswer;
    if (item.selectedOptionKeys.length > 0) {
        return optionSequence(item.options, item.selectedOptionKeys);
    }
    if (item.selectedOptionKey) {
        return optionText(item.options, item.selectedOptionKey);
    }
    return null;
}

function correctAnswerText(item: LevelTestHistoryItemDetail): string | null {
    if (item.correctOrder.length > 0) {
        return optionSequence(item.options, item.correctOrder);
    }
    if (item.correctOptionKey) {
        return optionText(item.options, item.correctOptionKey);
    }
    return null;
}

export function LevelTestHistoryDetailView({ detail }: LevelTestHistoryDetailViewProps) {
    const t = useTranslations("LanguageLearning.levelTest.history");
    const sessionT = useTranslations("LanguageLearning.levelTest.session");
    const itemT = useTranslations("LanguageLearning.levelTest.itemType");
    const domainT = useTranslations("LanguageLearning.levelTest.domain");
    const bandT = useTranslations("LanguageLearning.levelTest.band");
    const legacy = detail.summary.assessmentVersion === "WRITING_ONLY";

    return (
        <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                            {legacy ? t("legacy") : t("multiSkill")}
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                            {t("overall", { score: detail.summary.overallScore ?? "—" })}
                        </h2>
                        {detail.summary.proficiencyBand && (
                            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                                {bandT(detail.summary.proficiencyBand)}
                            </p>
                        )}
                    </div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        {detail.summary.completedAt
                            ? new Date(detail.summary.completedAt).toLocaleDateString()
                            : "—"}
                    </p>
                </div>

                {!legacy && (
                    <div className="mt-5">
                        <LevelTestScoreGrid scores={detail.summary.domainScores} />
                    </div>
                )}
            </section>

            {legacy ? (
                <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 text-sm leading-6 text-slate-500 dark:border-white/10 dark:bg-slate-900/75 dark:text-slate-400">
                    {t("legacyDetailNotice")}
                </section>
            ) : (
                <ol className="space-y-4">
                    {detail.items.map((item) => {
                        const correctAnswer = correctAnswerText(item);
                        const answerText = userAnswerText(item);
                        const hasFeedback = item.strengths.length > 0 || item.improvements.length > 0 || item.detailedFeedback.length > 0;
                        const sentenceOrder = item.itemType === "GRAMMAR_SENTENCE_ORDER";
                        const selectedKeys = new Set([
                            ...(item.selectedOptionKey ? [item.selectedOptionKey] : []),
                            ...item.selectedOptionKeys,
                        ]);

                        return (
                            <li
                                key={item.questionNumber}
                                data-testid={`level-test-history-item-${item.questionNumber}`}
                                className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                            {t("question", { number: item.questionNumber })} · {domainT(item.domain)}
                                        </p>
                                        <h3 className="mt-1 text-base font-black text-slate-950 dark:text-white">
                                            {itemT(item.itemType)}
                                        </h3>
                                    </div>
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                                        {item.score ?? "—"}
                                    </span>
                                </div>

                                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                        {t("problem")}
                                    </p>
                                    {item.instruction && (
                                        <p className="mt-2 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
                                            {item.instruction}
                                        </p>
                                    )}
                                    {!sentenceOrder && item.promptText.trim().length > 0 && (
                                        <LevelTestPromptText
                                            text={item.promptText}
                                            emphasisText={item.emphasisText}
                                            className="mt-3 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-900 dark:text-white"
                                        />
                                    )}

                                    {item.domain === "LISTENING" && item.referenceAudioAvailable && (
                                        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-400/15 dark:bg-blue-500/10">
                                            <p className="text-xs font-black text-blue-700 dark:text-blue-200">
                                                {t("questionAudio")}
                                            </p>
                                            <LevelTestReviewAudioPlayer
                                                itemId={item.itemId}
                                                kind="reference"
                                                loadLabel={t("playQuestionAudio")}
                                                errorLabel={t("audioLoadFailed")}
                                            />
                                        </div>
                                    )}

                                    {item.taskGuidance && (
                                        <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-900/60">
                                            <p className="text-xs font-black text-slate-600 dark:text-slate-300">
                                                {sessionT("guidance.title")}
                                            </p>
                                            {item.taskGuidance.providedFacts.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                                                        {sessionT("guidance.facts")}
                                                    </p>
                                                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                                                        {item.taskGuidance.providedFacts.map((value, index) => (
                                                            <li key={`history-fact-${item.questionNumber}-${index}`}>{value}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {item.taskGuidance.requiredIntents.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                                                        {sessionT("guidance.required")}
                                                    </p>
                                                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                                                        {item.taskGuidance.requiredIntents.map((value, index) => (
                                                            <li key={`history-intent-${item.questionNumber}-${index}`}>{value}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {item.taskGuidance.responseConstraints.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                                                        {sessionT("guidance.constraints")}
                                                    </p>
                                                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                                                        {item.taskGuidance.responseConstraints.map((value, index) => (
                                                            <li key={`history-constraint-${item.questionNumber}-${index}`}>{value}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {item.options.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                                                {sentenceOrder ? t("fragments") : t("options")}
                                            </p>
                                            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                                                {item.options.map((option) => {
                                                    const selected = !sentenceOrder && selectedKeys.has(option.key);
                                                    const correct = !sentenceOrder && item.correctOptionKey === option.key;
                                                    return (
                                                        <li
                                                            key={option.key}
                                                            className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                                                                correct
                                                                    ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                                                                    : selected
                                                                        ? "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100"
                                                                        : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200"
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <span>{option.key}. {option.text}</span>
                                                                <span className="flex shrink-0 flex-wrap justify-end gap-1">
                                                                    {selected && (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                                                                            <UserRound className="h-3 w-3" aria-hidden="true" />
                                                                            {t("selectedBadge")}
                                                                        </span>
                                                                    )}
                                                                    {correct && (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                                                                            <Check className="h-3 w-3" aria-hidden="true" />
                                                                            {t("correctBadge")}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className={`mt-4 grid gap-3 ${correctAnswer ? "sm:grid-cols-2" : ""}`}>
                                    <div
                                        data-testid={`level-test-history-user-answer-${item.questionNumber}`}
                                        className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"
                                    >
                                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                            {t("userAnswer")}
                                        </p>
                                        <div className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
                                            {item.audioSubmitted ? (
                                                <div className="space-y-3">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Mic className="h-4 w-4" aria-hidden="true" />
                                                        {t("audioSubmitted")}
                                                    </span>
                                                    {item.answerAudioAvailable && (
                                                        <LevelTestReviewAudioPlayer
                                                            itemId={item.itemId}
                                                            kind="answer"
                                                            loadLabel={t("playMyAnswerAudio")}
                                                            errorLabel={t("audioLoadFailed")}
                                                        />
                                                    )}
                                                    {item.transcript && (
                                                        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/60">
                                                            <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                                                                {t("sttTranscript")}
                                                            </p>
                                                            <p className="mt-1 whitespace-pre-wrap font-bold text-slate-800 dark:text-slate-100">
                                                                {item.transcript}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                answerText ?? "—"
                                            )}
                                        </div>
                                    </div>

                                    {correctAnswer && (
                                        <div
                                            data-testid={`level-test-history-correct-answer-${item.questionNumber}`}
                                            className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                                        >
                                            <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-300">
                                                {t("correctAnswer")}
                                            </p>
                                            <p className="mt-2 whitespace-pre-wrap text-sm font-black leading-6 text-emerald-900 dark:text-emerald-100">
                                                {correctAnswer}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {item.recommendedAnswers.length > 0 && (
                                    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-500/20 dark:bg-violet-500/10">
                                        <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-600 dark:text-violet-300">
                                            {t("modelAnswer")}
                                        </p>
                                        <div className="mt-2 space-y-3">
                                            {item.recommendedAnswers.map((value, index) => (
                                                <div key={`model-answer-${item.questionNumber}-${index}`} className="whitespace-pre-wrap text-sm font-bold leading-6 text-slate-800 dark:text-slate-100">
                                                    {item.recommendedAnswers.length > 1 && (
                                                        <span className="mr-2 text-xs font-black text-violet-500">#{index + 1}</span>
                                                    )}
                                                    {value}
                                                </div>
                                            ))}
                                        </div>
                                        {item.modelAnswerAudioAvailable && (
                                            <div className="mt-3">
                                                <p className="text-xs font-black text-violet-600 dark:text-violet-300">
                                                    {t("modelAnswerAudio")}
                                                </p>
                                                <LevelTestReviewAudioPlayer
                                                    itemId={item.itemId}
                                                    kind="modelAnswer"
                                                    loadLabel={t("playModelAnswerAudio")}
                                                    errorLabel={t("audioLoadFailed")}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {item.detailedFeedback.length > 0 && (
                                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                                        <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                                            {t("detailedFeedback")}
                                        </p>
                                        <div className="mt-3 space-y-3">
                                            {item.detailedFeedback.map((feedback, index) => (
                                                <div key={`detail-feedback-${item.questionNumber}-${index}`} className="rounded-xl bg-white/80 p-3 text-sm dark:bg-slate-900/50">
                                                    <p className="text-xs font-black text-amber-700 dark:text-amber-300">
                                                        {feedback.category}
                                                    </p>
                                                    {(feedback.original || feedback.corrected) && (
                                                        <div className="mt-1 grid gap-1 sm:grid-cols-2">
                                                            {feedback.original && (
                                                                <p className="text-rose-700 dark:text-rose-300">
                                                                    {t("yourExpression")}: {feedback.original}
                                                                </p>
                                                            )}
                                                            {feedback.corrected && (
                                                                <p className="text-emerald-700 dark:text-emerald-300">
                                                                    {t("suggestedExpression")}: {feedback.corrected}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                    <p className="mt-1 leading-6 text-slate-700 dark:text-slate-200">
                                                        {feedback.explanation}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {hasFeedback ? (
                                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                            {t("feedback")}
                                        </p>
                                        <div className="mt-2 space-y-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                                            {item.strengths.map((value) => (
                                                <p key={`strength-${value}`}>+ {value}</p>
                                            ))}
                                            {item.improvements.map((value) => (
                                                <p key={`improvement-${value}`}>· {value}</p>
                                            ))}
                                        </div>
                                    </div>
                                ) : correctAnswer ? (
                                    <p className="mt-3 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                                        {t("reviewHint")}
                                    </p>
                                ) : (
                                    <p className="mt-3 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                                        {t("feedbackUnavailable")}
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
}
