"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";

import type { RecentLearning } from "@/types/language-learning/dashboard";

interface LearningHistoryDateListProps {
    summaries: RecentLearning[];
    selectedDate: string | null;
    onSelect: (date: string) => void;
}

export function LearningHistoryDateList({
    summaries,
    selectedDate,
    onSelect,
}: LearningHistoryDateListProps) {
    const t = useTranslations("LanguageLearning.history");

    return (
        <aside className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
            <h2 className="px-2 text-sm font-black text-slate-900 dark:text-white">
                {t("dates")}
            </h2>

            <div className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto">
                {summaries.map((summary) => {
                    const isSelected = selectedDate === summary.learningDate;

                    return (
                        <button
                            key={summary.learningDate}
                            type="button"
                            onClick={() => onSelect(summary.learningDate)}
                            className={clsx(
                                "w-full rounded-xl px-3 py-3 text-left transition",
                                isSelected
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
                            )}
                        >
                            <p className="text-sm font-black">
                                {summary.learningDate}
                            </p>
                            <p
                                className={clsx(
                                    "mt-1 text-xs",
                                    isSelected
                                        ? "text-blue-100"
                                        : "text-slate-400",
                                )}
                            >
                                {t("summary", {
                                    count: summary.sentenceCount,
                                    score:
                                        summary.averageScore?.toFixed(1) ?? "-",
                                })}
                            </p>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
