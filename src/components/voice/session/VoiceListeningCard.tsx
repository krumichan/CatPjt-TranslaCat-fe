"use client";

import type { VoiceChannel } from "@/types/voice";
import { useTranslations } from "next-intl";

export function VoiceListeningCard({
    channel,
    sequence,
    partial,
    translatedText,
    active = true,
}: {
    channel: VoiceChannel;
    sequence: number | null;
    partial: string;
    translatedText?: string | null;
    active?: boolean;
}) {
    const t = useTranslations("Voice");

    return (
        <article
            data-testid={active ? `voice-listening-${channel}` : `voice-preview-${channel}-${sequence}`}
            className="rounded-2xl border border-blue-400 bg-blue-50 p-3 text-blue-950 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100"
        >
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold">{t(`channel.${channel}`)}</span>
                {sequence !== null && <span className="text-blue-600 dark:text-blue-300">#{sequence}</span>}
                <span className="rounded-full bg-blue-600 px-2 py-0.5 font-semibold text-white dark:bg-blue-500">
                    {t(active ? "live.listening" : "live.finalizing")}
                </span>
            </div>
            <p className="break-words text-sm leading-relaxed">
                {partial || t("live.recognizing")}
            </p>
            {translatedText && (
                <div className="mt-1.5 break-words">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                        {t("live.provisionalTranslation")}
                    </span>
                    <p className="text-sm leading-relaxed">{translatedText}</p>
                </div>
            )}
        </article>
    );
}
