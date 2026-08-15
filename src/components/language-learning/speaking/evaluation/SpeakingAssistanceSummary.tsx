"use client";

import { useTranslations } from "next-intl";

export function SpeakingAssistanceSummary() {
    const t = useTranslations(
        "LanguageLearning.speaking.evaluation.assistanceSummary",
    );

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {t("title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t("description")}
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
                <SummaryItem
                    title={t("neutral.title")}
                    description={t("neutral.description")}
                />
                <SummaryItem
                    title={t("assisted.title")}
                    description={t("assisted.description")}
                />
                <SummaryItem
                    title={t("guided.title")}
                    description={t("guided.description")}
                />
            </div>

            <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                {t("usageUnavailable")}
            </p>
        </section>
    );
}

function SummaryItem({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <article className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                {title}
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {description}
            </p>
        </article>
    );
}
