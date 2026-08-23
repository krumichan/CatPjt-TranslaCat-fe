"use client";

import { AudioLines } from "lucide-react";
import { useTranslations } from "next-intl";

import SectionHeader from "@/components/common/SectionHeader";
import { VoiceSessionHistory } from "@/components/voice/history/VoiceSessionHistory";
import { VoiceLiveSessionPanel } from "@/components/voice/session/VoiceLiveSessionPanel";
import { VoiceSessionSetup } from "@/components/voice/setup/VoiceSessionSetup";
import type { VoiceTranslationController } from "@/hooks/voice/useVoiceTranslationController";

interface VoiceTranslationViewProps {
    controller: VoiceTranslationController;
}

export function VoiceTranslationView({ controller }: VoiceTranslationViewProps) {
    const t = useTranslations("Voice");
    const liveError = controller.live.errorCode;

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-12 pt-28">
            <SectionHeader
                title={t("title")}
                icon={<AudioLines className="h-6 w-6 text-blue-500" />}
            />

            <p className="-mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t("description")}
            </p>

            {liveError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                    {t(`error.${liveError}`)}
                </div>
            )}

            {controller.live.phase !== "STREAMING" &&
                controller.live.phase !== "COMPLETING" && (
                    <VoiceSessionSetup controller={controller.live} />
                )}

            <VoiceLiveSessionPanel controller={controller.live} />
            <VoiceSessionHistory controller={controller.history} />
        </div>
    );
}
