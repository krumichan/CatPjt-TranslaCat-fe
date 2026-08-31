"use client";

import { Mic } from "lucide-react";
import { useTranslations } from "next-intl";

import {
    LevelTestPromptText,
} from "@/components/language-learning/level-test/LevelTestPromptText";
import { LevelTestScoreGrid } from "@/components/language-learning/level-test/LevelTestScoreGrid";
import type { LevelTestHistoryDetail } from "@/types/language-learning/level";

interface LevelTestHistoryDetailViewProps {
    detail: LevelTestHistoryDetail;
}

export function LevelTestHistoryDetailView({ detail }: LevelTestHistoryDetailViewProps) {
    const t = useTranslations("LanguageLearning.levelTest.history");
    const itemT = useTranslations("LanguageLearning.levelTest.itemType");
    const domainT = useTranslations("LanguageLearning.levelTest.domain");
    const bandT = useTranslations("LanguageLearning.levelTest.band");
    const legacy = detail.summary.assessmentVersion === "WRITING_ONLY";

    return (
        <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                            {legacy ? t("legacy") : t("multiSkill")}
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                            {t("overall", { score: detail.summary.overallScore ?? "—" })}
                        </h2>
                        {detail.summary.proficiencyBand && (
                            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                                {bandT(detail.summary.proficiencyBand)}
                            </p>
                        )}
                    </div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        {detail.summary.completedAt
                            ? new Date(detail.summary.completedAt).toLocaleDateString()
                            : "—"}
                    </p>
                </div>

                {!legacy && (
                    <div className="mt-5">
                        <LevelTestScoreGrid scores={detail.summary.domainScores} />
                    </div>
                )}
            </section>

            {legacy ? (
                <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 text-sm leading-6 text-slate-500 dark:border-white/10 dark:bg-slate-900/75 dark:text-slate-400">
                    {t("legacyDetailNotice")}
                </section>
            ) : (
                <ol className="space-y-4">
                    {detail.items.map((item) => (
                        <li
                            key={item.questionNumber}
                            className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                        {t("question", { number: item.questionNumber })} · {domainT(item.domain)}
                                    </p>
                                    <h3 className="mt-1 text-base font-black text-slate-950 dark:text-white">
                                        {itemT(item.itemType)}
                                    </h3>
                                </div>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                                    {item.score ?? "—"}
                                </span>
                            </div>

                            <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                                <LevelTestPromptText
                                    text={item.promptText}
                                    className="whitespace-pre-wrap text-sm font-bold leading-6 text-slate-800 dark:text-slate-100"
                                />
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                        {t("userAnswer")}
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                                        {item.audioSubmitted ? (
                                            <span className="inline-flex items-center gap-1.5">
                                                <Mic className="h-4 w-4" aria-hidden="true" />
                                                {t("audioSubmitted")}
                                            </span>
                                        ) : item.textAnswer ? (
                                            item.textAnswer
                                        ) : item.selectedOptionKeys.length > 0 ? (
                                            item.selectedOptionKeys.join(" → ")
                                        ) : (
                                            item.selectedOptionKey ?? "—"
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                        {t("feedback")}
                                    </p>
                                    <div className="mt-1 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                        {item.strengths.map((value) => (
                                            <p key={`strength-${value}`}>+ {value}</p>
                                        ))}
                                        {item.improvements.map((value) => (
                                            <p key={`improvement-${value}`}>· {value}</p>
                                        ))}
                                        {item.strengths.length === 0 && item.improvements.length === 0 && "—"}
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
