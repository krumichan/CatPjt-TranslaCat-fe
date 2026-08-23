"use client";

import { Mic, Monitor, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChangeEvent } from "react";

import type { VoiceLiveSessionController } from "@/hooks/voice/useVoiceLiveSession";
import { cn } from "@/lib/utils";
import type { VoiceChannel, VoiceLanguage, VoiceMode } from "@/types/voice";

const MODES: { value: VoiceMode; icon: typeof Mic }[] = [
    { value: "MIC", icon: Mic },
    { value: "MEDIA", icon: Monitor },
    { value: "MEETING", icon: Users },
];

const LANGUAGES: VoiceLanguage[] = ["ko", "ja", "en"];

interface VoiceSessionSetupProps {
    controller: VoiceLiveSessionController;
}

export function VoiceSessionSetup({ controller }: VoiceSessionSetupProps) {
    const t = useTranslations("Voice");
    const { setup, channels } = controller;

    return (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-6">
                <h2 className="text-lg font-bold">{t("setup.title")}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {t("setup.description")}
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label={t("setup.modeLabel")}>
                {MODES.map(({ value, icon: Icon }) => {
                    const selected = setup.mode === value;
                    return (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => controller.updateSetup("mode", value)}
                            disabled={controller.isBusy || controller.phase === "STREAMING"}
                            className={cn(
                                "rounded-2xl border p-4 text-left transition",
                                selected
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                                    : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800",
                            )}
                        >
                            <Icon className="mb-3 h-5 w-5" />
                            <div className="font-semibold">{t(`mode.${value}.title`)}</div>
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {t(`mode.${value}.description`)}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                    <span>{t("setup.sourceLanguageMode")}</span>
                    <select
                        value={setup.sourceLanguageMode}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                            controller.updateSetup(
                                "sourceLanguageMode",
                                event.target.value as "AUTO" | "MANUAL",
                            )
                        }
                        disabled={controller.isBusy || controller.phase === "STREAMING"}
                        className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                    >
                        <option value="AUTO">{t("sourceMode.AUTO")}</option>
                        <option value="MANUAL">{t("sourceMode.MANUAL")}</option>
                    </select>
                </label>

                <label className="space-y-2 text-sm font-medium">
                    <span>{t("setup.targetLanguage")}</span>
                    <select
                        value={setup.targetLanguage}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                            controller.updateSetup(
                                "targetLanguage",
                                event.target.value as VoiceLanguage,
                            )
                        }
                        disabled={controller.isBusy || controller.phase === "STREAMING"}
                        className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                    >
                        {LANGUAGES.map((language) => (
                            <option key={language} value={language}>
                                {t(`language.${language}`)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {setup.sourceLanguageMode === "MANUAL" && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {channels.map((channel: VoiceChannel) => (
                        <label key={channel} className="space-y-2 text-sm font-medium">
                            <span>{t(`channel.${channel}`)}</span>
                            <select
                                value={setup.manualSourceLanguages[channel] ?? "ja"}
                                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                    controller.setManualSourceLanguage(
                                        channel,
                                        event.target.value as VoiceLanguage,
                                    )
                                }
                                disabled={controller.isBusy || controller.phase === "STREAMING"}
                                className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                            >
                                {LANGUAGES.map((language) => (
                                    <option key={language} value={language}>
                                        {t(`language.${language}`)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ))}
                </div>
            )}

            <label className="mt-5 flex items-center gap-3 text-sm">
                <input
                    type="checkbox"
                    checked={setup.saveTranscript}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        controller.updateSetup("saveTranscript", event.target.checked)
                    }
                    disabled={controller.isBusy || controller.phase === "STREAMING"}
                    className="h-4 w-4 rounded"
                />
                <span>
                    <strong>{t("setup.saveTranscript")}</strong>
                    <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                        {t("setup.saveTranscriptDescription")}
                    </span>
                </span>
            </label>

            <div className="mt-6 flex justify-end">
                <button
                    type="button"
                    onClick={() => void controller.start()}
                    disabled={!controller.canStart || controller.isBusy}
                    className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {controller.phase === "PREPARING"
                        ? t("action.preparing")
                        : t("action.start")}
                </button>
            </div>
        </section>
    );
}
