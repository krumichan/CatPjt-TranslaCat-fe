"use client";

import type { VoiceLiveSessionController } from "@/hooks/voice/useVoiceLiveSession";
import type { VoiceChannel } from "@/types/voice";
import { useTranslations } from "next-intl";

export function VoiceChannelStatus({
    channel,
    controller,
}: {
    channel: VoiceChannel;
    controller: VoiceLiveSessionController;
}) {
    const t = useTranslations("Voice");
    const state = controller.liveState.channelStates[channel];
    const activity = controller.inputActivities[channel];

    return (
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800" data-testid={`voice-input-${channel}`}>
            <span className="text-sm font-semibold">{t(`channel.${channel}`)}</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-900">
                {t(`status.${state}`)}
            </span>
            {controller.phase !== "COMPLETED" && (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div
                        role="meter"
                        aria-label={t("input.level", { channel: t(`channel.${channel}`) })}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(activity.level * 100)}
                        className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                    >
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${activity.level * 100}%` }} />
                    </div>
                    <p className="min-w-0 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400" role="status">
                        {t(`input.${activity.status}`)}
                    </p>
                </div>
            )}
        </div>
    );
}
