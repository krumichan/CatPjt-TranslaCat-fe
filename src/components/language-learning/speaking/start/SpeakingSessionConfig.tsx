"use client";

import { Headphones, MessageSquareMore, TimerReset } from "lucide-react";
import { useTranslations } from "next-intl";

import { AppSelect } from "@/components/common/AppSelect";
import {
    SPEAKING_CORRECTION_MODES,
    SPEAKING_PLAYBACK_SPEED_OPTIONS,
    SPEAKING_START_MODES,
    SPEAKING_VOICE_OPTIONS,
} from "@/constants/language-learning/speaking";
import { cn } from "@/lib/utils";
import type { SpeakingStartPageController } from "@/hooks/language-learning/speaking/useSpeakingStartPageController";

export function SpeakingSessionConfig({
    controller,
}: {
    controller: SpeakingStartPageController;
}) {
    const t = useTranslations("LanguageLearning.speaking.start.config");

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
            <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">
                    {t("title")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {t("description")}
                </p>
            </div>

            {controller.practiceMode === "FREE" && controller.useCustomTopic ? (
                <fieldset className="mt-6">
                    <legend className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {t("startMode.title")}
                    </legend>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                        {SPEAKING_START_MODES.map((mode) => (
                            <label
                                key={mode}
                                className={cn(
                                    "cursor-pointer rounded-2xl border p-4 transition",
                                    controller.startMode === mode
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                                        : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5",
                                )}
                            >
                                <span className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        name="speaking-start-mode"
                                        value={mode}
                                        checked={controller.startMode === mode}
                                        onChange={() => controller.setStartMode(mode)}
                                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>
                                        <span className="block text-sm font-black text-slate-900 dark:text-white">
                                            {t(`startMode.${mode}.label`)}
                                        </span>
                                        <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                                            {t(`startMode.${mode}.help`)}
                                        </span>
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            ) : (
                <div className="mt-6 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
                    {t(
                        controller.practiceMode === "FREE" && !controller.useCustomTopic
                            ? "startMode.keywordTopicAiRequired"
                            : "startMode.aiPromptRequired",
                    )}
                </div>
            )}

            <fieldset className="mt-6">
                <legend className="text-sm font-black text-slate-800 dark:text-slate-100">
                    {t("correctionMode.title")}
                </legend>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {SPEAKING_CORRECTION_MODES.map((mode) => (
                        <label
                            key={mode}
                            className={cn(
                                "cursor-pointer rounded-2xl border p-4 transition",
                                controller.correctionMode === mode
                                    ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                                    : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5",
                            )}
                        >
                            <span className="flex items-start gap-3">
                                <input
                                    type="radio"
                                    name="speaking-correction-mode"
                                    value={mode}
                                    checked={controller.correctionMode === mode}
                                    onChange={() => controller.setCorrectionMode(mode)}
                                    className="mt-1 h-4 w-4 text-violet-600 focus:ring-violet-500"
                                />
                                <span>
                                    <span className="block text-sm font-black text-slate-900 dark:text-white">
                                        {t(`correctionMode.${mode}.label`)}
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                                        {t(`correctionMode.${mode}.help`)}
                                    </span>
                                </span>
                            </span>
                        </label>
                    ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                    {t("correctionMode.reconfirm")}
                </p>
            </fieldset>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <label className="block rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                    <span className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
                        <TimerReset className="h-4 w-4 text-blue-500" aria-hidden="true" />
                        {t("targetMinutes")}
                    </span>
                    <input
                        type="number"
                        min={controller.minGoal}
                        max={controller.maxGoal}
                        step={1}
                        value={controller.targetMinutes}
                        onChange={(event) =>
                            controller.setTargetMinutes(Number(event.target.value))
                        }
                        className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:ring-blue-500/20"
                    />
                    <span className="mt-1 block text-xs text-slate-400">
                        {t("targetRange", {
                            min: controller.minGoal,
                            max: controller.maxGoal,
                        })}
                    </span>
                </label>

                <label className="block rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                    <span className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
                        <Headphones className="h-4 w-4 text-blue-500" aria-hidden="true" />
                        {t("voice")}
                    </span>
                    <AppSelect
                        value={controller.voiceId}
                        onChange={(event) => controller.setVoiceId(event.target.value)}
                        className="mt-3"
                    >
                        {SPEAKING_VOICE_OPTIONS.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                                {voice.label}
                            </option>
                        ))}
                    </AppSelect>
                </label>

                <label className="block rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                    <span className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
                        <MessageSquareMore className="h-4 w-4 text-blue-500" aria-hidden="true" />
                        {t("speed")}
                    </span>
                    <AppSelect
                        value={controller.playbackSpeed}
                        onChange={(event) =>
                            controller.setPlaybackSpeed(event.target.value)
                        }
                        className="mt-3"
                    >
                        {SPEAKING_PLAYBACK_SPEED_OPTIONS.map((speed) => (
                            <option key={speed.id} value={speed.id}>
                                {t(`speeds.${speed.id}`)}
                            </option>
                        ))}
                    </AppSelect>
                </label>
            </div>

            {controller.practiceMode === "FREE" && (
                <div
                    className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/5"
                    data-testid="speaking-free-session-details"
                >
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">
                            {t("freeDetails.title")}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {t("freeDetails.description")}
                        </p>
                    </div>
                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                        <label className="block">
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                                {t("goal")}
                            </span>
                            <input
                                value={controller.goal}
                                onChange={(event) => controller.setGoal(event.target.value)}
                                maxLength={200}
                                placeholder={t("goalPlaceholder")}
                                data-testid="speaking-free-goal"
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                                {t("persona")}
                            </span>
                            <input
                                value={controller.persona}
                                onChange={(event) => controller.setPersona(event.target.value)}
                                maxLength={200}
                                placeholder={t("personaPlaceholder")}
                                data-testid="speaking-free-persona"
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                            />
                        </label>
                    </div>
                </div>
            )}

            <div className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
                {t("applyPolicy")}
            </div>
        </section>
    );
}
