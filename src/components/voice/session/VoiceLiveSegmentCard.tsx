"use client";

import { VoiceReadingText } from "@/components/voice/common/VoiceReadingText";
import { voiceErrorMessageKey } from "@/features/voice/session/voiceErrorMessage";
import type { VoiceLiveSegment } from "@/types/voice";
import { useTranslations } from "next-intl";

export function VoiceLiveSegmentCard({ segment }: { segment: VoiceLiveSegment }) {
    const t = useTranslations("Voice");

    return (
        <article data-testid={`voice-result-${segment.channel}-${segment.utteranceSequence}`} className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="mb-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>{t(`channel.${segment.channel}`)}</span>
                <span className="text-zinc-400 dark:text-zinc-500">#{segment.utteranceSequence}</span>
            </p>
            <VoiceReadingText
                text={segment.sourceText}
                tokens={segment.sourceReadingTokens}
                className="break-words text-base font-medium"
            />
            <div className="mt-1.5 break-words">
                {segment.translatedText ? (
                    <p className="text-sm leading-relaxed">{segment.translatedText}</p>
                ) : segment.translationSkipped ? (
                    <p className="text-sm text-zinc-500">{t("live.translationSkipped")}</p>
                ) : segment.errorCode ? (
                    <p className="text-sm text-red-500">
                        {t(voiceErrorMessageKey(segment.errorCode, segment.errorStage))}
                    </p>
                ) : (
                    <p className="text-sm text-zinc-500">{t("live.translating")}</p>
                )}
            </div>
        </article>
    );
}
