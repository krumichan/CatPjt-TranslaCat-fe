"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import type { LevelTestHistoryFilter } from "@/hooks/language-learning/useLevelTestHistoryController";
import type { useLevelTestHistoryController } from "@/hooks/language-learning/useLevelTestHistoryController";
import { Link } from "@/navigation";

interface LevelTestHistoryViewProps {
    controller: ReturnType<typeof useLevelTestHistoryController>;
}

const FILTERS: LevelTestHistoryFilter[] = ["ALL", "INITIAL", "RECHECK"];

export function LevelTestHistoryView({ controller }: LevelTestHistoryViewProps) {
    const t = useTranslations("LanguageLearning.levelTest.history");
    const bandT = useTranslations("LanguageLearning.levelTest.band");

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("filterLabel")}>
                {FILTERS.map((filter) => (
                    <button
                        key={filter}
                        type="button"
                        onClick={() => controller.setFilter(filter)}
                        aria-pressed={controller.filter === filter}
                        className={`rounded-full px-4 py-2 text-sm font-black ${
                            controller.filter === filter
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300"
                        }`}
                    >
                        {t(`filter.${filter}`)}
                    </button>
                ))}
            </div>

            {controller.items.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900/75 dark:text-slate-400">
                    {t("empty")}
                </div>
            ) : (
                <ul className="space-y-3">
                    {controller.items.map((item) => {
                        const legacy = item.assessmentVersion === "WRITING_ONLY";
                        return (
                            <li key={`${item.assessmentVersion}-${item.sessionId}`}>
                                <Link
                                    href={`/language-learning/level-test/history/${item.sessionId}`}
                                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:border-blue-300 dark:border-white/10 dark:bg-slate-900/75"
                                >
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                            {item.completedAt
                                                ? new Date(item.completedAt).toLocaleDateString()
                                                : "—"}
                                        </p>
                                        <p className="mt-2 text-base font-black text-slate-950 dark:text-white">
                                            {legacy ? t("legacy") : t("multiSkill")}
                                        </p>
                                        <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                                            {t("overall", { score: item.overallScore ?? "—" })}
                                            {item.proficiencyBand
                                                ? ` · ${bandT(item.proficiencyBand)}`
                                                : ""}
                                        </p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
