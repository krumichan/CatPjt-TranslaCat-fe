"use client";

import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import type { LevelTestSessionController } from "@/hooks/language-learning/useLevelTestSessionController";

interface ChoiceAnswerPanelProps {
    controller: LevelTestSessionController;
}

export function ChoiceAnswerPanel({ controller }: ChoiceAnswerPanelProps) {
    const t = useTranslations("LanguageLearning.levelTest.session");
    const question = controller.question!;
    const sentenceOrder = question.itemType === "GRAMMAR_SENTENCE_ORDER";

    if (!sentenceOrder) {
        return (
            <fieldset className="space-y-3">
                <legend className="sr-only">{t("chooseAnswer")}</legend>
                {question.options.map((option) => {
                    const selected = controller.selectedOptionKey === option.key;
                    return (
                        <button
                            key={option.key}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => controller.setSelectedOptionKey(option.key)}
                            disabled={controller.isSubmitting}
                            className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-bold transition ${
                                selected
                                    ? "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-100 dark:ring-blue-500/10"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                            }`}
                        >
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black dark:bg-white/10">
                                {option.key}
                            </span>
                            <span className="pt-1">{option.text}</span>
                        </button>
                    );
                })}
            </fieldset>
        );
    }

    const remaining = question.options.filter(
        (option) => !controller.selectedOptionKeys.includes(option.key),
    );
    const optionByKey = new Map(question.options.map((option) => [option.key, option]));

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">
                    {t("sentenceOrder.current")}
                </h3>
                <ol
                    aria-live="polite"
                    className="mt-2 space-y-2 rounded-2xl bg-slate-50 p-3 dark:bg-white/5"
                >
                    {controller.selectedOptionKeys.length === 0 && (
                        <li className="px-2 py-3 text-sm text-slate-400">
                            {t("sentenceOrder.empty")}
                        </li>
                    )}
                    {controller.selectedOptionKeys.map((key, index) => {
                        const option = optionByKey.get(key);
                        if (!option) return null;
                        return (
                            <li
                                key={key}
                                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-slate-900"
                            >
                                <span className="w-7 text-center text-xs font-black text-slate-400">
                                    {index + 1}
                                </span>
                                <span className="min-w-0 flex-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {option.text}
                                </span>
                                <button
                                    type="button"
                                    aria-label={t("sentenceOrder.moveUp", { index: index + 1 })}
                                    onClick={() => controller.moveOrderKey(index, -1)}
                                    disabled={index === 0}
                                    className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
                                >
                                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={t("sentenceOrder.moveDown", { index: index + 1 })}
                                    onClick={() => controller.moveOrderKey(index, 1)}
                                    disabled={index === controller.selectedOptionKeys.length - 1}
                                    className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
                                >
                                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={t("sentenceOrder.remove", { index: index + 1 })}
                                    onClick={() => controller.removeOrderKey(key)}
                                    className="rounded-lg p-2 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                                >
                                    <X className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </div>

            {remaining.length > 0 && (
                <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">
                        {t("sentenceOrder.remaining")}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {remaining.map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => controller.addOrderKey(option.key)}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                            >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                {option.text}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
