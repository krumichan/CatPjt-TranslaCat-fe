"use client";

import { useTranslations } from "next-intl";

import type {
    DashboardInsights,
    UnifiedDashboardInsight,
} from "@/types/language-learning/dashboard";

export function DashboardUnifiedInsightWidget({
    data,
}: {
    data: DashboardInsights;
}) {
    const t = useTranslations("LanguageLearning.dashboard.v2");

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {t("unifiedInsight")}
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <InsightList
                    title={t("strengths")}
                    items={data.strengths}
                />
                <InsightList
                    title={t("weaknesses")}
                    items={data.weaknesses}
                />
                <FocusList
                    title={t("focus")}
                    items={data.recommendedFocus}
                />
            </div>
        </section>
    );
}

function InsightList({
    title,
    items,
}: {
    title: string;
    items: UnifiedDashboardInsight[];
}) {
    const t = useTranslations("LanguageLearning.dashboard.v2");

    return (
        <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                {title}
            </h3>
            {items.length ? (
                <ul className="mt-2 space-y-2">
                    {items.slice(0, 5).map((item, index) => (
                        <li
                            key={`${item.patternKey}-${index}`}
                            className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5"
                        >
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                                {item.patternKey}
                            </p>
                            <div
                                className="mt-2 flex flex-wrap gap-1.5"
                                aria-label={t("sourceEvidence")}
                            >
                                {item.unified && (
                                    <SourceBadge label={t("source.ALL")} />
                                )}
                                {item.sources.map((source) => (
                                    <SourceBadge
                                        key={source}
                                        label={t(`source.${source}`)}
                                    />
                                ))}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-2 text-sm text-slate-400">—</p>
            )}
        </div>
    );
}

function FocusList({
    title,
    items,
}: {
    title: string;
    items: string[];
}) {
    return (
        <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                {title}
            </h3>
            {items.length ? (
                <ul className="mt-2 space-y-2">
                    {items.slice(0, 5).map((item) => (
                        <li
                            key={item}
                            className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 dark:bg-white/5 dark:text-slate-300"
                        >
                            {item}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-2 text-sm text-slate-400">—</p>
            )}
        </div>
    );
}

function SourceBadge({ label }: { label: string }) {
    return (
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
            {label}
        </span>
    );
}
