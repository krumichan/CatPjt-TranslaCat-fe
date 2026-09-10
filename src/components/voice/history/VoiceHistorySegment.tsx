"use client";

import { VoiceReadingText } from "@/components/voice/common/VoiceReadingText";
import type { VoiceHistoryController } from "@/hooks/voice/useVoiceHistory";
import type { VoiceSegmentResponse } from "@/types/voice";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

export function VoiceHistorySegment({
    sessionId,
    segment,
    controller,
}: {
    sessionId: string;
    segment: VoiceSegmentResponse;
    controller: VoiceHistoryController;
}) {
    const t = useTranslations("Voice");
    const canRetry =
        Boolean(segment.sourceText?.trim()) &&
        (segment.translatedText === null || segment.errorCode !== null);

    return (
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                <span>{t(`channel.${segment.channel}`)}</span>
                <span>#{segment.utteranceSequence}</span>
            </div>
            <VoiceReadingText
                text={segment.sourceText}
                tokens={segment.sourceReadingTokens}
                className="text-sm font-medium"
            />
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {segment.translatedText ?? t("history.translationUnavailable")}
            </p>
            {segment.errorCode && (
                <p className="mt-1 text-xs text-red-500">{segment.errorCode}</p>
            )}
            {canRetry && (
                <div className="mt-3 flex justify-end">
                    <button
                        type="button"
                        onClick={() =>
                            void controller.retryTranslation(sessionId, segment.id)
                        }
                        disabled={controller.actionSessionId === sessionId}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold dark:border-zinc-700"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {t("history.retryTranslation")}
                    </button>
                </div>
            )}
        </div>
    );
}
