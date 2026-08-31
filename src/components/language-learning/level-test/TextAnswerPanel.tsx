"use client";

import { useTranslations } from "next-intl";

import type { LevelTestSessionController } from "@/hooks/language-learning/useLevelTestSessionController";

interface TextAnswerPanelProps {
    controller: LevelTestSessionController;
}

export function TextAnswerPanel({ controller }: TextAnswerPanelProps) {
    const t = useTranslations("LanguageLearning.levelTest.session");
    const maxLength = controller.question?.maxAnswerLength ?? 3000;

    return (
        <label className="block">
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                {t("textAnswer")}
            </span>
            <textarea
                value={controller.textAnswer}
                onChange={(event) => controller.setTextAnswer(event.target.value)}
                disabled={controller.isSubmitting}
                rows={6}
                maxLength={maxLength}
                className="mt-2 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-60 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                placeholder={t("textPlaceholder")}
            />
            <span className="mt-1 block text-right text-xs text-slate-400">
                {controller.textAnswer.length} / {maxLength}
            </span>
        </label>
    );
}
