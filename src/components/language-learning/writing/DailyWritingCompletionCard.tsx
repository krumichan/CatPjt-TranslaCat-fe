"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/navigation";
import type { DailyWritingItem } from "@/types/language-learning/daily";

export function DailyWritingCompletionCard({ items }: { items: DailyWritingItem[] }) {
    const t = useTranslations("LanguageLearning.writing.completed");
    const scores = items
        .map((item) => item.attempts.at(-1)?.evaluation?.overall)
        .filter((score): score is number => typeof score === "number");
    const average = scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : null;

    return (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-400/20 dark:bg-emerald-500/10">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-black text-emerald-950 dark:text-emerald-100">
                {t("title")}
            </h2>
            <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
                {t("description")}
            </p>
            {average != null && (
                <p className="mt-4 text-3xl font-black text-emerald-700 dark:text-emerald-200">
                    {average.toFixed(1)}
                </p>
            )}
            <Link href="/language-learning" className="mt-5 inline-flex rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-600">
                {t("dashboard")}
            </Link>
        </section>
    );
}
