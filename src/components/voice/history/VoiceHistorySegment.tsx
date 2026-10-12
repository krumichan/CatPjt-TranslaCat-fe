"use client";

import { VoiceReadingText } from "@/components/voice/common/VoiceReadingText";
import { isVoiceLanguageRejection, voiceErrorMessageKey } from "@/features/voice/session/voiceErrorMessage";
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
        !segment.translationSkipped &&
        !isVoiceLanguageRejection(segment.errorCode) &&
        (segment.translatedText === null || segment.errorCode !== null);

    return (
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-2">
                    <span>{t(`channel.${segment.channel}`)}</span>
                    <span className="text-zinc-400 dark:text-zinc-500">#{segment.utteranceSequence}</span>
                </span>
                {canRetry && (
                    <button
                        type="button"
                        onClick={() =>
                            void controller.retryTranslation(sessionId, segment.id)
                        }
                        disabled={controller.actionSessionId === sessionId}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold dark:border-zinc-700"
                    >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("history.retryTranslation")}
                    </button>
                )}
            </div>
            <VoiceReadingText
                text={segment.sourceText}
                tokens={segment.sourceReadingTokens}
                className="break-words text-sm font-medium"
            />
            {/* 오류가 있으면 빈 번역 안내를 중복 표시하지 않고 재시도 조작은 화자 옆에 둔다. */}
            {(segment.translatedText || !segment.errorCode) && (
                <p className="mt-1.5 break-words text-sm text-zinc-600 dark:text-zinc-300">
                    {segment.translatedText ?? t(segment.translationSkipped ? "live.translationSkipped" : "history.translationUnavailable")}
                </p>
            )}
            {segment.errorCode && (
                <p className="mt-1.5 text-sm text-red-500">{t(voiceErrorMessageKey(segment.errorCode))}</p>
            )}
        </div>
    );
}
