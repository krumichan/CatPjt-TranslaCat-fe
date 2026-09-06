"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DailyWritingTypeProgress } from "@/hooks/language-learning/useDailyWritingPageController";
import type { DailyWritingType } from "@/types/language-learning/common";

const TYPES: DailyWritingType[] = ["TRANSLATION", "GUIDED", "FREE"];

export function DailyWritingTypeTabs({
    selected,
    onSelect,
    progress,
}: {
    selected: DailyWritingType;
    onSelect: (writingType: DailyWritingType) => void;
    progress: Record<DailyWritingType, DailyWritingTypeProgress>;
}) {
    const t = useTranslations("LanguageLearning.writing.types");

    return (
        <div
            className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1.5 dark:border-white/10 dark:bg-white/5"
            role="tablist"
            aria-label={t("label")}
        >
            {TYPES.map((type) => {
                const active = selected === type;
                const completed = progress[type].state === "COMPLETED";
                const evaluating = progress[type].state === "EVALUATING";
                return (
                    <button
                        key={type}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onSelect(type)}
                        className={`rounded-xl px-3 py-2.5 text-xs font-black transition sm:text-sm ${
                            active
                                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300"
                                : completed
                                  ? "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                                  : evaluating
                                    ? "text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                    >
                        <span className="inline-flex items-center justify-center gap-1.5">
                            {completed && (
                                <CheckCircle2
                                    className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300"
                                    aria-hidden="true"
                                />
                            )}
                            {evaluating && !completed && (
                                <LoaderCircle
                                    className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-600 dark:text-amber-300"
                                    aria-hidden="true"
                                />
                            )}
                            {t(type)}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
