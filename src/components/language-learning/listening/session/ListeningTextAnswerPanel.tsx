import { useTranslations } from "next-intl";

import type { ListeningTaskType } from "@/types/language-learning/listening";

export function ListeningTextAnswerPanel({
    taskType,
    value,
    disabled,
    originLanguage,
    learningLanguage,
    onChange,
}: {
    taskType: "DICTATION" | "INTERPRETATION" | "SUMMARY";
    value: string;
    disabled: boolean;
    originLanguage: string;
    learningLanguage: string;
    onChange: (value: string) => void;
}) {
    const t = useTranslations("LanguageLearning.listening.session");
    const language = taskType === "INTERPRETATION" ? originLanguage : learningLanguage;
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900" data-testid={`listening-answer-${taskType}`}>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{t(`task.${taskType}.title`)}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(`task.${taskType}.description`, { language })}</p>
            <label className="mt-4 block">
                <span className="sr-only">{t(`task.${taskType}.label`)}</span>
                <textarea
                    rows={5}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled}
                    maxLength={3000}
                    placeholder={t(`task.${taskType}.placeholder`)}
                    className="w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-60 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                />
            </label>
        </section>
    );
}

export function isTextTask(taskType: ListeningTaskType): taskType is "DICTATION" | "INTERPRETATION" | "SUMMARY" {
    return taskType === "DICTATION" || taskType === "INTERPRETATION" || taskType === "SUMMARY";
}
