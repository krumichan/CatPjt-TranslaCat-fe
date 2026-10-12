"use client";

import type { VoiceChannel } from "@/types/voice";
import { useTranslations } from "next-intl";

export function VoiceListeningCard({
    channel,
    sequence,
    partial,
}: {
    channel: VoiceChannel;
    sequence: number | null;
    partial: string;
}) {
    const t = useTranslations("Voice");

    return (
        <article
            data-testid={`voice-listening-${channel}`}
            className="rounded-2xl border border-blue-400 bg-blue-50 p-3 text-blue-950 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100"
        >
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold">{t(`channel.${channel}`)}</span>
                {sequence !== null && <span className="text-blue-600 dark:text-blue-300">#{sequence}</span>}
                <span className="rounded-full bg-blue-600 px-2 py-0.5 font-semibold text-white dark:bg-blue-500">
                    {t("live.listening")}
                </span>
            </div>
            <p className="break-words text-sm leading-relaxed">
                {partial || t("live.recognizing")}
            </p>
        </article>
    );
}
