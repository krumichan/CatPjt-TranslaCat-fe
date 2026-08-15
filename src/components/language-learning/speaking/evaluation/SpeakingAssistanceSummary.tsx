"use client";

import { useTranslations } from "next-intl";

import type {
    AssistanceType,
    SpeakingTurn,
} from "@/types/language-learning/speaking";

const NEUTRAL: AssistanceType[] = [
    "REPLAY",
    "SLOW_PLAYBACK",
    "SHOW_QUESTION",
];
const ASSISTED: AssistanceType[] = ["HINT", "TRANSLATION"];
const GUIDED: AssistanceType[] = ["SAMPLE_ANSWER"];

export function SpeakingAssistanceSummary({ turns }: { turns: SpeakingTurn[] }) {
    const t = useTranslations(
        "LanguageLearning.speaking.evaluation.assistanceSummary",
    );
    const usage = turns.flatMap((turn) => turn.assistanceUsage ?? []);
    const count = (types: AssistanceType[]) =>
        usage.filter((type) => types.includes(type)).length;

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
                    count={count(NEUTRAL)}
                />
                <SummaryItem
                    title={t("assisted.title")}
                    description={t("assisted.description")}
                    count={count(ASSISTED)}
                />
                <SummaryItem
                    title={t("guided.title")}
                    description={t("guided.description")}
                    count={count(GUIDED)}
                />
            </div>

            <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                {t("usageSummary", { count: usage.length })}
            </p>
        </section>
    );
}

function SummaryItem({
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
