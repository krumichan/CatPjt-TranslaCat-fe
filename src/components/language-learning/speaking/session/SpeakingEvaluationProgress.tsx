"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useTranslations } from "next-intl";

interface SpeakingEvaluationProgressProps {
    validTurns: number;
    durationSeconds: number;
    sttRatio: number;
}

export function SpeakingEvaluationProgress({
    validTurns,
    durationSeconds,
    sttRatio,
}: SpeakingEvaluationProgressProps) {
    const t = useTranslations("LanguageLearning.speaking.session.eligibility");
    const items = [
        {
            key: "turns",
            complete: validTurns >= 5,
            value: t("turnsValue", { current: validTurns, required: 5 }),
        },
        {
            key: "duration",
            complete: durationSeconds >= 60,
            value: t("durationValue", {
                current: Math.floor(durationSeconds),
                required: 60,
            }),
        },
        {
            key: "stt",
            complete: sttRatio >= 80,
            value: t("sttValue", {
                current: Math.round(sttRatio),
                required: 80,
            }),
        },
    ];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-900/75">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {t("title")}
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {items.map((item) => {
                    const Icon = item.complete ? CheckCircle2 : Circle;
                    return (
                        <div
                            key={item.key}
                            className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/5"
                        >
                            <Icon
                                className={
                                    item.complete
                                        ? "h-4 w-4 text-emerald-500"
                                        : "h-4 w-4 text-slate-300 dark:text-slate-600"
                                }
                                aria-hidden="true"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                {item.value}
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
