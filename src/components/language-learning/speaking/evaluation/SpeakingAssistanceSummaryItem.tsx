"use client";

import { useTranslations } from "next-intl";

export function SpeakingAssistanceSummaryItem({
    title,
    description,
    count,
}: {
    title: string;
    description: string;
    count: number;
}) {
    const t = useTranslations(
        "LanguageLearning.speaking.evaluation.assistanceSummary",
    );
    return (
        <article className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    {title}
                </h3>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-blue-600 shadow-sm dark:bg-white/10 dark:text-blue-200">
                    {t("count", { count })}
                </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {description}
            </p>
        </article>
    );
}
