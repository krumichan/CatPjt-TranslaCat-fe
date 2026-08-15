"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/navigation";
import type { SpeakingFeatureSummary } from "@/types/language-learning/dashboard";

export function DashboardSpeakingSummaryWidget({
    data,
}: {
    data: SpeakingFeatureSummary;
}) {
    const t = useTranslations("LanguageLearning.dashboard.v2");

    return (
        <section
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900"
            data-testid="dashboard-speaking-summary"
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {t("speakingSummary")}
                </h2>
                <Link
                    href="/language-learning/speaking"
                    className="inline-flex items-center gap-1 text-xs font-black text-blue-600 hover:text-blue-500 dark:text-blue-300"
                >
                    {t("startSpeaking")}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
            </div>

            {data.collectingData ? (
                <p className="mt-3 text-sm text-slate-400">
                    {t("collectingData")}
                </p>
            ) : (
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Stat label={t("sessions")} value={data.sessions} />
                    <Stat label={t("minutes")} value={data.totalMinutes} />
                    <Stat label={t("overall")} value={data.overallAverage} />
                    <Stat label={t("fluency")} value={data.fluencyAverage} />
                    <Stat
                        label={t("pronunciation")}
                        value={data.pronunciationAverage}
                    />
                    <Stat
                        label={t("interaction")}
                        value={data.interactionAverage}
                    />
                </dl>
            )}
        </section>
    );
}

function Stat({
    label,
    value,
}: {
    label: string;
    value: number | null;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <dt className="text-xs font-bold text-slate-400">{label}</dt>
            <dd className="mt-1 text-xl font-black text-slate-800 dark:text-slate-100">
                {value === null ? "—" : Math.round(value)}
            </dd>
        </div>
    );
}
