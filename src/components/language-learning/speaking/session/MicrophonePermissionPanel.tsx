"use client";

import { Mic, MicOff } from "lucide-react";
import { useTranslations } from "next-intl";

import type { useMicrophonePermission } from "@/hooks/language-learning/speaking/useMicrophonePermission";

type MicrophoneController = ReturnType<typeof useMicrophonePermission>;

export function MicrophonePermissionPanel({
    microphone,
}: {
    microphone: MicrophoneController;
}) {
    const t = useTranslations("LanguageLearning.speaking.session.microphone");

    if (microphone.state === "GRANTED") {
        return (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                <Mic className="h-4 w-4" aria-hidden="true" />
                {t("granted")}
            </div>
        );
    }

    const blocked =
        microphone.state === "DENIED" || microphone.state === "UNAVAILABLE";

    return (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
                <MicOff className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-amber-950 dark:text-amber-100">
                        {blocked ? t("blockedTitle") : t("title")}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-200">
                        {microphone.failureReason
                            ? t(`reason.${microphone.failureReason}`)
                            : t("description")}
                    </p>
                    {!blocked && (
                        <button
                            type="button"
                            onClick={() => void microphone.request()}
                            disabled={microphone.isRequesting}
                            className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white transition hover:bg-amber-500 disabled:opacity-50"
                        >
                            {microphone.isRequesting
                                ? t("requesting")
                                : t("request")}
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
