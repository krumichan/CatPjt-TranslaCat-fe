"use client";

import { summarizeSpeakingAssistanceUsage } from "@/features/language-learning/speaking/assistanceUsage";

import { SpeakingAssistanceSummaryItem } from "@/components/language-learning/speaking/evaluation/SpeakingAssistanceSummaryItem";
import type { SpeakingTurn } from "@/types/language-learning/speaking";
import { useTranslations } from "next-intl";

export function SpeakingAssistanceSummary({ turns }: { turns: SpeakingTurn[] }) {
    const t = useTranslations(
        "LanguageLearning.speaking.evaluation.assistanceSummary",
    );
    const summary = summarizeSpeakingAssistanceUsage(turns);

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {t("title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t("description")}
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
                <SpeakingAssistanceSummaryItem
                    title={t("neutral.title")}
                    description={t("neutral.description")}
                    count={summary.neutral}
                />
                <SpeakingAssistanceSummaryItem
                    title={t("assisted.title")}
                    description={t("assisted.description")}
                    count={summary.assisted}
                />
                <SpeakingAssistanceSummaryItem
                    title={t("guided.title")}
                    description={t("guided.description")}
                    count={summary.guided}
                />
            </div>

            <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                {t("usageSummary", { count: summary.total })}
            </p>
        </section>
    );
}
