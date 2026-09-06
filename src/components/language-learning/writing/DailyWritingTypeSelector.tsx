"use client";

import {
    CheckCircle2,
    Languages,
    ListChecks,
    LoaderCircle,
    PencilLine,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type {
    DailyWritingTypeProgress,
} from "@/hooks/language-learning/useDailyWritingPageController";
import type { DailyWritingType } from "@/types/language-learning/common";

const TYPES: Array<{
    type: DailyWritingType;
    icon: typeof Languages;
}> = [
    { type: "TRANSLATION", icon: Languages },
    { type: "GUIDED", icon: ListChecks },
    { type: "FREE", icon: PencilLine },
];

export function DailyWritingTypeSelector({
    onSelect,
    progress,
}: {
    onSelect: (writingType: DailyWritingType) => void;
    progress: Record<DailyWritingType, DailyWritingTypeProgress>;
}) {
    const t = useTranslations("LanguageLearning.writing.typeSelector");

    return (
        <section
            className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6"
            data-testid="daily-writing-type-selector"
        >
            <div className="max-w-2xl">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
                    {t("eyebrow")}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                    {t("title")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {t("description")}
                </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {TYPES.map(({ type, icon: Icon }) => {
                    const typeProgress = progress[type];
                    const isCompleted = typeProgress.state === "COMPLETED";
                    const isEvaluating = typeProgress.state === "EVALUATING";
                    const isInProgress = typeProgress.state === "IN_PROGRESS";
                    const cardClass = isCompleted
                        ? "border-emerald-300 bg-emerald-50/80 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:hover:border-emerald-300/50 dark:hover:bg-emerald-500/15"
                        : isEvaluating
                          ? "border-amber-300 bg-amber-50/80 hover:border-amber-400 hover:bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10 dark:hover:border-amber-300/50 dark:hover:bg-amber-500/15"
                          : isInProgress
                            ? "border-blue-300 bg-blue-50/70 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-400/30 dark:bg-blue-500/10 dark:hover:border-blue-300/50 dark:hover:bg-blue-500/15"
                            : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/60 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400/40 dark:hover:bg-blue-500/10";
                    const iconClass = isCompleted
                        ? "bg-white text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : isEvaluating
                          ? "bg-white text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
                          : "bg-white text-blue-600 dark:bg-white/10 dark:text-blue-300";

                    return (
                        <button
                            key={type}
                            type="button"
                            onClick={() => onSelect(type)}
                            className={`group rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${cardClass}`}
                            data-testid={`daily-writing-type-${type.toLowerCase()}`}
                            data-state={typeProgress.state}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <span
                                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${iconClass}`}
                                >
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </span>
                                {isCompleted ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
                                        <CheckCircle2
                                            className="h-3.5 w-3.5"
                                            aria-hidden="true"
                                        />
                                        {t("status.completed")}
                                    </span>
                                ) : isEvaluating ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                                        <LoaderCircle
                                            className="h-3.5 w-3.5 animate-spin"
                                            aria-hidden="true"
                                        />
                                        {t("status.evaluating")}
                                    </span>
                                ) : isInProgress ? (
                                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-700 dark:bg-blue-400/15 dark:text-blue-200">
                                        {t("status.inProgress")}
                                    </span>
                                ) : null}
                            </div>
                            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                                {t(`types.${type}.title`)}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                {t(`types.${type}.description`)}
                            </p>
                            {isCompleted && typeProgress.overallScore != null && (
                                <p className="mt-3 text-sm font-black text-emerald-700 dark:text-emerald-200">
                                    {t("averageScore", {
                                        score: typeProgress.overallScore.toFixed(1),
                                    })}
                                </p>
                            )}
                            <p
                                className={`mt-4 text-sm font-black ${
                                    isCompleted
                                        ? "text-emerald-700 dark:text-emerald-200"
                                        : isEvaluating
                                          ? "text-amber-700 dark:text-amber-200"
                                          : "text-blue-600 dark:text-blue-300"
                                }`}
                            >
                                {isCompleted
                                    ? t("result")
                                    : isEvaluating
                                      ? t("viewProgress")
                                      : isInProgress
                                        ? t("continue")
                                        : t("start")}
                            </p>
                        </button>
                    );
                })}
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-400">
                {t("notice")}
            </p>
        </section>
    );
}
