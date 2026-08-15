"use client";

import { useTranslations } from "next-intl";

import type { LanguageLearningLevelTestController } from "@/hooks/language-learning/useLanguageLearningLevelTestController";

interface LevelTestQuestionCardProps {
    controller: LanguageLearningLevelTestController;
}

export function LevelTestQuestionCard({
    controller,
}: LevelTestQuestionCardProps) {
    const t = useTranslations("LanguageLearning.levelTest");
    const question = controller.question!;
    const progress = Math.round(
        (question.questionNumber / question.totalQuestions) * 100,
    );

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-8">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
                        {t("question.progress", {
                            current: question.questionNumber,
                            total: question.totalQuestions,
                        })}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                        {t(`difficulty.${question.difficulty}`)}
                    </p>
                </div>
                <span className="text-sm font-black text-slate-500 dark:text-slate-300">
                    {progress}%
                </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="mt-7 rounded-2xl bg-slate-50 p-5 dark:bg-white/5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    {t("question.prompt")}
                </p>
                <p className="mt-3 text-lg font-bold leading-8 text-slate-900 dark:text-white sm:text-xl">
                    {question.originText}
                </p>
            </div>

            <label className="mt-6 block">
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                    {t("question.answer")}
                </span>
                <textarea
                    value={controller.answer}
                    onChange={(event) => controller.setAnswer(event.target.value)}
                    disabled={controller.isSubmitting}
                    rows={5}
                    maxLength={3000}
                    className="mt-2 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-60 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                    placeholder={t("question.placeholder")}
                />
            </label>

            {controller.actionError && (
                <p
                    role="alert"
                    className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
                >
                    {t("actionFailed")}
                </p>
            )}

            <div className="mt-5 flex justify-end">
                <button
                    type="button"
                    onClick={() => void controller.submit()}
                    disabled={!controller.answer.trim() || controller.isSubmitting}
                    className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {controller.isSubmitting
                        ? t("question.evaluating")
                        : t("question.submit")}
                </button>
            </div>
        </section>
    );
}
