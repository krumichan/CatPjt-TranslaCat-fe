"use client";

import { VoiceLiveSegmentCard } from "@/components/voice/session/VoiceLiveSegmentCard";
import { VoiceListeningCard } from "@/components/voice/session/VoiceListeningCard";
import { VoiceChannelStatus } from "@/components/voice/session/VoiceChannelStatus";
import type { VoiceLiveSessionController } from "@/hooks/voice/useVoiceLiveSession";
import { useTranslations } from "next-intl";
import { GuideHelpLink } from "@/components/common/GuideHelpLink";

interface VoiceLiveSessionPanelProps {
    controller: VoiceLiveSessionController;
}

export function VoiceLiveSessionPanel({
    controller,
}: VoiceLiveSessionPanelProps) {
    const t = useTranslations("Voice");
    if (!controller.session) return null;
    const previews = controller.liveState.previews.filter((preview) => controller.channels.includes(preview.channel));

    return (
        <>
            {/* 대화와 이력을 스크롤해도 앱 헤더 아래에서 세션 종료를 바로 누를 수 있다. */}
            <div className="sticky top-18 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="min-w-0 flex-1 basis-44">
                    <div className="flex items-center gap-1">
                        <h2 className="text-lg font-bold">{t("live.title")}</h2>
                        <GuideHelpLink topic="voice/live-translation" />
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-zinc-500" title={controller.session.id}>
                        {controller.session.id}
                    </p>
                </div>
                <div className="flex max-w-full flex-wrap items-center gap-2 sm:gap-3">
                    <span className="whitespace-nowrap rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 sm:px-3 sm:text-sm">
                        {t(`phase.${controller.phase}`)}
                    </span>
                    {controller.phase === "COMPLETED" || controller.session.status === "FAILED" ? (
                        <button
                            type="button"
                            onClick={() => void controller.reset()}
                            className="whitespace-nowrap rounded-2xl border border-zinc-300 px-3 py-2.5 text-xs font-semibold dark:border-zinc-700 sm:px-4 sm:text-sm"
                        >
                            {t("action.newSession")}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void controller.complete()}
                            disabled={!controller.canComplete}
                            className="whitespace-nowrap rounded-2xl bg-red-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 sm:px-4 sm:text-sm"
                        >
                            {controller.phase === "COMPLETING"
                                ? t("action.completing")
                                : t("action.complete")}
                        </button>
                    )}
                </div>
            </div>

            <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="grid gap-2 md:grid-cols-2">
                    {controller.channels.map((channel) => (
                        <VoiceChannelStatus
                            key={channel}
                            channel={channel}
                            controller={controller}
                        />
                    ))}
                </div>

                <div className="mt-4 space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
                        {t("live.transcript")}
                    </h3>
                    {/* 듣는 중인 발화를 결과와 같은 목록에 두고, 확정되면 같은 번호의 결과 카드로 바꾼다. */}
                    {[...previews].reverse().map((preview) => (
                        <VoiceListeningCard
                            key={`${preview.channel}-${preview.key}`}
                            channel={preview.channel}
                            sequence={preview.utteranceSequence}
                            partial={preview.sourceText}
                            translatedText={preview.translatedText}
                            active={controller.liveState.listening[preview.channel]
                                && (controller.liveState.partialUtterances[preview.channel]?.key === preview.key
                                    || (controller.liveState.partialUtterances[preview.channel]?.key === null
                                        && preview.key === `listening-${preview.channel}`))}
                        />
                    ))}
                    {controller.liveState.segments.length > 0 ? (
                        [...controller.liveState.segments].reverse().map((segment) => (
                            <VoiceLiveSegmentCard key={`${segment.channel}-${segment.key}`} segment={segment} />
                        ))
                    ) : (
                        previews.length === 0 && (
                            <div className="rounded-2xl bg-zinc-50 p-5 text-center text-sm text-zinc-500 dark:bg-zinc-900/60">
                                {t("live.empty")}
                            </div>
                        )
                    )}
                </div>
            </section>
        </>
    );
}
