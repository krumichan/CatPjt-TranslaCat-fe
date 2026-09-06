"use client";

import { MessageCircleMore } from "lucide-react";
import { useTranslations } from "next-intl";

import { AudioPlaybackButton } from "@/components/language-learning/speaking/common/AudioPlaybackButton";
import { SpeakingTurnCard } from "@/components/language-learning/speaking/session/SpeakingTurnCard";
import type { SpeakingSessionController } from "@/hooks/language-learning/speaking/useSpeakingSessionController";

export function SpeakingConversationHistory({
    controller,
}: {
    controller: SpeakingSessionController;
}) {
    const t = useTranslations("LanguageLearning.speaking.session.history");
    const detail = controller.detail!;
    const session = detail.session;

    return (
        <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/50 sm:p-5">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {t("title")}
            </h2>

            <div className="mt-4 space-y-4">
                {session.practiceMode !== "READ_ALOUD" && session.openingAssistantText && (
                    <article className="max-w-[88%] rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
                        <p className="text-xs font-black text-slate-400">AI</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">
                            {session.openingAssistantText}
                        </p>
                        <div className="mt-3">
                            <AudioPlaybackButton url={session.openingAssistantAudioUrl} />
                        </div>
                    </article>
                )}

                {detail.turns.length === 0 && (session.practiceMode === "READ_ALOUD" || !session.openingAssistantText) && (
                    <div className="py-10 text-center">
                        <MessageCircleMore className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" />
                        <p className="mt-3 text-sm text-slate-400">{t("empty")}</p>
                    </div>
                )}

                {detail.turns.map((turn) => (
                    <SpeakingTurnCard
                        key={turn.id}
                        turn={turn}
                        controller={controller}
                        practiceMode={session.practiceMode}
                    />
                ))}
            </div>
        </section>
    );
}
