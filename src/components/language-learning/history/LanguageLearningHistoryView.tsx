"use client";

import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";

import { LearningHistoryDailySet } from "@/components/language-learning/history/LearningHistoryDailySet";
import { LearningHistoryDateList } from "@/components/language-learning/history/LearningHistoryDateList";
import type { LearningHistoryPageController } from "@/hooks/language-learning/useLearningHistoryPageController";

interface LanguageLearningHistoryViewProps {
    controller: LearningHistoryPageController;
}

export function LanguageLearningHistoryView({
    controller,
}: LanguageLearningHistoryViewProps) {
    const t = useTranslations("LanguageLearning.history");

    if (controller.summaries.length === 0) {
        return (
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-10 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                <CalendarDays
                    className="mx-auto h-10 w-10 text-slate-300"
                    aria-hidden="true"
                />
                <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                    {t("empty.title")}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {t("empty.description")}
                </p>
            </section>
        );
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <LearningHistoryDateList
                summaries={controller.summaries}
                selectedDate={controller.selectedDate}
                onSelect={controller.setSelectedDate}
            />

            <section className="min-w-0 space-y-4">
                <LearningHistoryDailySet controller={controller} />
            </section>
        </div>
    );
}
