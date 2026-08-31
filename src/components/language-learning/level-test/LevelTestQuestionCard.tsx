"use client";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChoiceAnswerPanel } from "@/components/language-learning/level-test/ChoiceAnswerPanel";
import { LevelTestDomainStepper } from "@/components/language-learning/level-test/LevelTestDomainStepper";
import { LevelTestErrorNotice } from "@/components/language-learning/level-test/LevelTestErrorNotice";
import {
    LevelTestPromptText,
} from "@/components/language-learning/level-test/LevelTestPromptText";
import { ListeningQuestionPanel } from "@/components/language-learning/level-test/ListeningQuestionPanel";
import { SpeakingAnswerPanel } from "@/components/language-learning/level-test/SpeakingAnswerPanel";
import { TextAnswerPanel } from "@/components/language-learning/level-test/TextAnswerPanel";
import type { LevelTestSessionController } from "@/hooks/language-learning/useLevelTestSessionController";

interface LevelTestQuestionCardProps {
    controller: LevelTestSessionController;
}

function languageKey(value: string | null): string {
    if (!value) return "none";
    return ["ko", "ja", "en"].includes(value) ? value : "other";
}

export function LevelTestQuestionCard({ controller }: LevelTestQuestionCardProps) {
    const t = useTranslations("LanguageLearning.levelTest");
    const question = controller.question!;
    const progress = Math.round(
        (question.questionNumber / question.totalQuestions) * 100,
    );
    const evaluating =
        question.status === "EVALUATING" || controller.session?.status === "EVALUATING";
    const evaluationFailed = question.status === "EVALUATION_FAILED";
    const answerLanguage = languageKey(question.answerLanguage);
    const listeningLanguage = languageKey(controller.learningLanguage);

    return (
        <div className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-7">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
                            {t("session.progress", {
                                current: question.questionNumber,
                                total: question.totalQuestions,
                            })}
                        </p>
                        <h2
                            ref={controller.headingRef}
                            tabIndex={-1}
                            className="mt-1 text-xl font-black text-slate-950 outline-none dark:text-white"
                        >
                            {t(`domain.${question.domain}`)}
                        </h2>
                    </div>
                    <span className="text-sm font-black text-slate-500 dark:text-slate-300">
                        {progress}%
                    </span>
                </div>

                <div
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={question.totalQuestions}
                    aria-valuenow={question.questionNumber}
                    className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
                >
                    <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="mt-4">
                    <LevelTestDomainStepper questionNumber={question.questionNumber} />
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-8">
                <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {t("session.itemType")}: {t(`itemType.${question.itemType}`)}
                    </span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                        {t("session.answerMode")}: {t(`answerMode.${question.answerMode}`)}
                    </span>
                    {question.domain === "LISTENING" && controller.learningLanguage && (
                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-200">
                            {t("session.listeningLanguage")}: {t(`language.${listeningLanguage}`)}
                        </span>
                    )}
                    {question.answerLanguage && (
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                            {t("session.answerLanguage")}: {t(`language.${answerLanguage}`)}
                        </span>
                    )}
                </div>

                <p className="mt-5 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                    {question.instruction}
                </p>

                {question.domain === "LISTENING" && (
                    <div className="mt-5">
                        <ListeningQuestionPanel controller={controller} />
                    </div>
                )}

                {question.itemType !== "GRAMMAR_SENTENCE_ORDER"
                    && question.itemType !== "SPEAKING_REPEAT"
                    && question.promptText.trim().length > 0 && (
                    <div className="mt-5 rounded-2xl bg-slate-50 p-5 dark:bg-white/5">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                            {t("session.prompt")}
                        </p>
                        <LevelTestPromptText
                            text={question.promptText}
                            emphasisText={question.emphasisText}
                            className="mt-3 whitespace-pre-wrap text-base font-bold leading-7 text-slate-900 dark:text-white sm:text-lg"
                        />
                    </div>
                )}

                {question.taskGuidance && (
                    <div
                        className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5"
                        data-testid="level-test-task-guidance"
                    >
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                            {t("session.guidance.title")}
                        </p>
                        {question.taskGuidance.providedFacts.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                                    {t("session.guidance.facts")}
                                </p>
                                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-200">
                                    {question.taskGuidance.providedFacts.map((value, index) => (
                                        <li key={`fact-${index}`}>{value}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {question.taskGuidance.requiredIntents.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                                    {t("session.guidance.required")}
                                </p>
                                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-200">
                                    {question.taskGuidance.requiredIntents.map((value, index) => (
                                        <li key={`intent-${index}`}>{value}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {question.taskGuidance.responseConstraints.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                                    {t("session.guidance.constraints")}
                                </p>
                                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-200">
                                    {question.taskGuidance.responseConstraints.map((value, index) => (
                                        <li key={`constraint-${index}`}>{value}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-6">
                    {question.answerMode === "CHOICE" && (
                        <ChoiceAnswerPanel controller={controller} />
                    )}
                    {question.answerMode === "TEXT" && (
                        <TextAnswerPanel controller={controller} />
                    )}
                    {question.answerMode === "AUDIO" && (
                        <SpeakingAnswerPanel controller={controller} />
                    )}
                </div>

                <div className="mt-5" aria-live="polite">
                    {evaluating && (
                        <p className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                            {t("session.evaluating")}
                        </p>
                    )}
                    {evaluationFailed && controller.requiresRerecord && (
                        <div
                            className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/10"
                            data-testid="level-test-rerecord-required"
                        >
                            <p className="text-sm font-black text-amber-800 dark:text-amber-100">
                                {t("session.audioInvalidTitle")}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-200">
                                {t("session.audioInvalidDescription")}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-200">
                                {t("session.audioInvalidHint")}
                            </p>
                            {!controller.rerecordRequested ? (
                                <button
                                    type="button"
                                    onClick={controller.prepareRerecord}
                                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white hover:bg-amber-500"
                                >
                                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                    {t("session.rerecordAnswer")}
                                </button>
                            ) : (
                                <p className="mt-3 text-xs font-black text-amber-800 dark:text-amber-100">
                                    {t("session.rerecordReady")}
                                </p>
                            )}
                        </div>
                    )}
                    {evaluationFailed && !controller.requiresRerecord && (
                        <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/10">
                            <p className="text-sm font-black text-amber-800 dark:text-amber-100">
                                {t("session.evaluationFailed")}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-200">
                                {t("session.answerSaved")}
                            </p>
                            <button
                                type="button"
                                onClick={() => void controller.retryEvaluation()}
                                disabled={controller.isRetrying}
                                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white hover:bg-amber-500 disabled:opacity-50"
                            >
                                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                {controller.isRetrying
                                    ? t("session.retrying")
                                    : t("session.retryEvaluation")}
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-4">
                    <LevelTestErrorNotice errorCode={controller.actionErrorCode} />
                </div>

                {(!evaluationFailed || controller.requiresRerecord) && (
                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            onClick={() => void controller.submit()}
                            disabled={!controller.canSubmit || evaluating}
                            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {controller.isSubmitting
                                ? t("session.submitting")
                                : t("session.submit")}
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}
