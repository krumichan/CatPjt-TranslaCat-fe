"use client";

import { VoiceLiveSegmentCard } from "@/components/voice/session/VoiceLiveSegmentCard";

import { VoiceChannelStatus } from "@/components/voice/session/VoiceChannelStatus";
import type { VoiceLiveSessionController } from "@/hooks/voice/useVoiceLiveSession";
import { useTranslations } from "next-intl";

interface VoiceLiveSessionPanelProps {
    controller: VoiceLiveSessionController;
}

export function VoiceLiveSessionPanel({
    controller,
}: VoiceLiveSessionPanelProps) {
    const t = useTranslations("Voice");
    if (!controller.session) return null;

    return (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold">{t("live.title")}</h2>
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                        {controller.session.id}
                    </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    {t(`phase.${controller.phase}`)}
                </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
                {controller.channels.map((channel) => (
                    <VoiceChannelStatus
                        key={channel}
                        channel={channel}
                        controller={controller}
                    />
                ))}
            </div>

            <div className="mt-6 space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
                    {t("live.transcript")}
                </h3>
                {controller.liveState.segments.length > 0 ? (
                    [...controller.liveState.segments]
                        .reverse()
                        .map((segment) => (
                            <VoiceLiveSegmentCard key={segment.key} segment={segment} />
                        ))
                ) : (
                    <div className="rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:bg-zinc-900/60">
                        {t("live.empty")}
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
                {controller.phase === "COMPLETED" ? (
                    <button
                        type="button"
                        onClick={() => void controller.reset()}
                        className="rounded-2xl border border-zinc-300 px-5 py-2.5 font-semibold dark:border-zinc-700"
                    >
                        {t("action.newSession")}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => void controller.complete()}
                        disabled={!controller.canComplete}
                        className="rounded-2xl bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                        {controller.phase === "COMPLETING"
                            ? t("action.completing")
                            : t("action.complete")}
                    </button>
                )}
            </div>
        </section>
    );
}
