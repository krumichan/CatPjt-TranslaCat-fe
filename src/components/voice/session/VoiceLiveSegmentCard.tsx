"use client";

import { VoiceReadingText } from "@/components/voice/common/VoiceReadingText";
import type { VoiceLiveSegment } from "@/types/voice";
import { useTranslations } from "next-intl";

export function VoiceLiveSegmentCard({ segment }: { segment: VoiceLiveSegment }) {
    const t = useTranslations("Voice");

    return (
        <article className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
                <span>{t(`channel.${segment.channel}`)}</span>
                <span>#{segment.utteranceSequence}</span>
            </div>
            <VoiceReadingText
                text={segment.sourceText}
                tokens={segment.sourceReadingTokens}
                className="text-base font-medium"
            />
            <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-900">
                {segment.translatedText ? (
                    <p className="text-sm leading-relaxed">{segment.translatedText}</p>
                ) : segment.translationSkipped ? (
                    <p className="text-sm text-zinc-500">{t("live.translationSkipped")}</p>
                ) : segment.errorCode ? (
                    <p className="text-sm text-red-500">
                        {t("live.translationFailed")} ({segment.errorCode})
                    </p>
                ) : (
                    <p className="text-sm text-zinc-500">{t("live.translating")}</p>
                )}
            </div>
            {segment.latency?.totalAfterSpeechMs !== undefined && (
                <p className="mt-2 text-right text-[11px] text-zinc-400">
                    {t("live.latency", {
                        ms: segment.latency.totalAfterSpeechMs,
                    })}
                </p>
            )}
        </article>
    );
}
