"use client";

import { ArrowRight, Clock3, MessageCircleMore } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/navigation";
import type { SpeakingSessionDetail } from "@/types/language-learning/speaking";

export function SpeakingActiveSessionCard({
    detail,
}: {
    detail: SpeakingSessionDetail;
}) {
    const t = useTranslations("LanguageLearning.speaking.start.active");
    const session = detail.session;

    return (
        <section className="rounded-3xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-400/20 dark:bg-blue-500/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                        {t("eyebrow")}
                    </p>
                    <h2 className="mt-2 truncate text-xl font-black text-slate-950 dark:text-white">
                        {session.topicTitle ?? session.customTopic ?? t("freeTalk")}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                            <MessageCircleMore className="h-4 w-4" aria-hidden="true" />
                            {t("turns", {
                                current: session.completedTurns,
                                max: session.maxTurns,
                            })}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-4 w-4" aria-hidden="true" />
                            {t("minutes", {
                                value: Math.floor(session.totalDurationSeconds / 60),
                            })}
                        </span>
                    </div>
                </div>
                <Link
                    href={`/language-learning/speaking/${session.id}`}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500"
                >
                    {t("continue")}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
        </section>
    );
}
