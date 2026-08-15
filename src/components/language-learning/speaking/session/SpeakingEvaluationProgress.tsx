"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useTranslations } from "next-intl";

import type { SpeakingEvaluationEligibility } from "@/types/language-learning/speaking";

export function SpeakingEvaluationProgress({
    eligibility,
}: {
    eligibility: SpeakingEvaluationEligibility;
}) {
    const t = useTranslations("LanguageLearning.speaking.session.eligibility");
    const sttRatioPercent = eligibility.validSttTurnRatio * 100;
    const requiredSttRatioPercent = eligibility.requiredSttTurnRatio * 100;
    const items = [
        {
            key: "turns",
            complete:
                eligibility.validUserTurns >= eligibility.requiredUserTurns,
            value: t("turnsValue", {
                current: eligibility.validUserTurns,
                required: eligibility.requiredUserTurns,
            }),
        },
        {
            key: "duration",
            complete:
                eligibility.validUserSpeechSeconds >=
                eligibility.requiredUserSpeechSeconds,
            value: t("durationValue", {
                current: Math.floor(eligibility.validUserSpeechSeconds),
                required: Math.floor(eligibility.requiredUserSpeechSeconds),
            }),
        },
        {
            key: "stt",
            complete:
                eligibility.validSttTurnRatio >=
                eligibility.requiredSttTurnRatio,
            value: t("sttValue", {
                current: Math.round(sttRatioPercent),
                required: Math.round(requiredSttRatioPercent),
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
