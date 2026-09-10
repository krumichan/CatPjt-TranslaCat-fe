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
    const partial = controller.liveState.partials[channel];

    return (
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{t(`channel.${channel}`)}</span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs dark:bg-zinc-900">
                    {t(`status.${state}`)}
                </span>
            </div>
            <div className="mt-3 min-h-12 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-300">
                {partial || t("live.waiting")}
            </div>
        </div>
    );
}
