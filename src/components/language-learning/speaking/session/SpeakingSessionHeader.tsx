"use client";

import { Clock3, MessageCircleMore, Target } from "lucide-react";
import { useTranslations } from "next-intl";

import type { SpeakingSessionDetail } from "@/types/language-learning/speaking";

export function SpeakingSessionHeader({
    detail,
}: {
    detail: SpeakingSessionDetail;
}) {
    const t = useTranslations("LanguageLearning.speaking.session.header");
    const { session, dailyUsage } = detail;
    const readAloudCompletedProblems = new Set(
        detail.readAloudProblemEvaluations.map((item) => item.problemIndex),
    ).size;

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                        {session.topicCategory === "KEYWORDS"
                            ? t("keywordTopic")
                            : session.topicCategory ?? t("customTopic")}
                    </p>
                    <h2 className="mt-1 truncate text-xl font-black text-slate-950 dark:text-white">
                        {session.topicTitle ?? session.customTopic ?? t("freeTalk")}
                    </h2>
                    {session.goal && (
                        <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            <Target className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                            {session.goal}
                        </p>
                    )}
                </div>

                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-107.5">
                    <Stat
                        icon={MessageCircleMore}
                        label={
                            session.practiceMode === "READ_ALOUD"
                                ? t("items")
                                : t("turns")
                        }
                        value={
                            session.practiceMode === "READ_ALOUD"
                                ? `${readAloudCompletedProblems} / 5`
                                : `${session.completedTurns} / ${session.maxTurns}`
                        }
                    />
                    <Stat icon={Clock3} label={t("sessionTime")} value={t("minutes", { value: Math.ceil(session.totalDurationSeconds / 60) })} />
                    <Stat icon={Target} label={t("dailyUsage")} value={t("dailyMinutes", { used: dailyUsage.usedMinutes, limit: dailyUsage.dailySpeakingHardLimitMinutes })} />
                </dl>
            </div>
        </section>
    );
}

function Stat({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Clock3;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <dt className="flex items-center gap-1.5 text-[11px] font-black text-slate-400">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
            </dt>
            <dd className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">{value}</dd>
        </div>
    );
}
