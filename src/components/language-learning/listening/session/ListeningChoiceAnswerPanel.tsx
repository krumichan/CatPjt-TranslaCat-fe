"use client";

import { useTranslations } from "next-intl";

import type { ListeningChoiceOption } from "@/types/language-learning/listening";

export function ListeningChoiceAnswerPanel({
    question,
    options,
    value,
    disabled,
    correctOptionKey,
    onChange,
}: {
    question: string | null;
    options: ListeningChoiceOption[];
    value: string;
    disabled: boolean;
    correctOptionKey: string | null;
    onChange: (value: string) => void;
}) {
    const t = useTranslations("LanguageLearning.listening.session.task.COMPREHENSION");

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900" data-testid="listening-answer-COMPREHENSION">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("title")}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>
            {question && <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-800 dark:bg-white/5 dark:text-slate-100">{question}</p>}
            <fieldset className="mt-4 space-y-2">
                <legend className="sr-only">{t("label")}</legend>
                {options.map((option) => {
                    const checked = value === option.key;
                    const isCorrect = correctOptionKey === option.key;
                    return (
                        <label
                            key={option.key}
                            className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${isCorrect ? "border-emerald-300 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-500/10" : checked ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10" : "border-slate-200 hover:border-slate-300 dark:border-white/10"}`}
                        >
                            <input
                                type="radio"
                                name="listening-comprehension"
                                value={option.key}
                                checked={checked}
                                disabled={disabled}
                                onChange={() => onChange(option.key)}
                                className="mt-1"
                            />
                            <span className="min-w-0 leading-6"><strong className="mr-2">{option.key}.</strong>{option.text}</span>
                            {isCorrect && <span className="ml-auto shrink-0 text-xs font-black text-emerald-700 dark:text-emerald-200">{t("correct")}</span>}
                        </label>
                    );
                })}
            </fieldset>
        </section>
    );
}
