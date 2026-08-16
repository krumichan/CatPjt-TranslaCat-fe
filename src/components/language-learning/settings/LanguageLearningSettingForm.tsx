"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";

import { AppSelect } from "@/components/common/AppSelect";
import { CHAT_LANGUAGE_OPTIONS } from "@/constants/chatLanguages";
import {
    SPEAKING_PLAYBACK_SPEED_OPTIONS,
    SPEAKING_VOICE_OPTIONS,
} from "@/constants/language-learning/speaking";
import type { LanguageLearningUserSettingFormController } from "@/hooks/language-learning/useLanguageLearningUserSettingForm";
import type { LanguageLearningUserSetting } from "@/types/language-learning/setting";

interface LanguageLearningSettingFormProps {
    setting: LanguageLearningUserSetting;
    controller: LanguageLearningUserSettingFormController;
}

export function LanguageLearningSettingForm({
    setting,
    controller,
}: LanguageLearningSettingFormProps) {
    const t = useTranslations("LanguageLearning.settings.form");
    const form = controller.form;

    if (!form) return null;

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

            {setting.pendingEffectiveDate && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
                    <p className="font-black">{t("pending.title")}</p>
                    <p className="mt-1">
                        {t("pending.description", {
                            date: setting.pendingEffectiveDate,
                        })}
                    </p>
                </div>
            )}

            <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="block">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {t("originLanguage")}
                    </span>
                    <AppSelect
                        value={form.originLanguage}
                        onChange={(event) =>
                            controller.update(
                                "originLanguage",
                                event.target.value,
                            )
                        }
                        className="mt-2"
                    >
                        {CHAT_LANGUAGE_OPTIONS.map((language) => (
                            <option key={language.code} value={language.code}>
                                {language.label}
                            </option>
                        ))}
                    </AppSelect>
                </label>

                <label className="block">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {t("learningLanguage")}
                    </span>
                    <AppSelect
                        value={form.learningLanguage}
                        onChange={(event) =>
                            controller.update(
                                "learningLanguage",
                                event.target.value,
                            )
                        }
                        className="mt-2"
                    >
                        {CHAT_LANGUAGE_OPTIONS.map((language) => (
                            <option key={language.code} value={language.code}>
                                {language.label}
                            </option>
                        ))}
                    </AppSelect>
                </label>

                <label className="block">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {t("dailySentenceCount")}
                    </span>
                    <input
                        type="number"
                        min={setting.minDailySentenceCount}
                        max={setting.maxDailySentenceCount}
                        step={1}
                        value={form.dailySentenceCount}
                        onChange={(event) =>
                            controller.update(
                                "dailySentenceCount",
                                Number(event.target.value),
                            )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                    />
                    <span className="mt-1 block text-xs text-slate-400">
                        {t("dailySentenceRange", {
                            min: setting.minDailySentenceCount,
                            max: setting.maxDailySentenceCount,
                        })}
                    </span>
                </label>

                <label className="block">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {t("dailySpeakingGoalMinutes")}
                    </span>
                    <input
                        type="number"
                        min={setting.minDailySpeakingGoalMinutes}
                        max={setting.maxDailySpeakingGoalMinutes}
                        step={1}
                        value={form.dailySpeakingGoalMinutes}
                        onChange={(event) =>
                            controller.update(
                                "dailySpeakingGoalMinutes",
                                Number(event.target.value),
                            )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                    />
                    <span className="mt-1 block text-xs text-slate-400">
                        {t("dailySpeakingGoalRange", {
                            min: setting.minDailySpeakingGoalMinutes,
                            max: setting.maxDailySpeakingGoalMinutes,
                        })}
                    </span>
                </label>

                <label className="block">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {t("speakingVoice")}
                    </span>
                    <AppSelect
                        value={form.speakingVoiceId}
                        onChange={(event) =>
                            controller.update(
                                "speakingVoiceId",
                                event.target.value,
                            )
                        }
                        className="mt-2"
                    >
                        {SPEAKING_VOICE_OPTIONS.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                                {voice.label}
                            </option>
                        ))}
                    </AppSelect>
                </label>

                <label className="block">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {t("speakingPlaybackSpeed")}
                    </span>
                    <AppSelect
                        value={form.speakingPlaybackSpeed}
                        onChange={(event) =>
                            controller.update(
                                "speakingPlaybackSpeed",
                                event.target.value,
                            )
                        }
                        className="mt-2"
                    >
                        {SPEAKING_PLAYBACK_SPEED_OPTIONS.map((speed) => (
                            <option key={speed.id} value={speed.id}>
                                {t(`playbackSpeed.${speed.id}`)}
                            </option>
                        ))}
                    </AppSelect>
                </label>

                <label className="block">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {t("timezone")}
                    </span>
                    <input
                        type="text"
                        value={form.timezone}
                        onChange={(event) =>
                            controller.update("timezone", event.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                    />
                </label>
            </div>

            {form.originLanguage === form.learningLanguage && (
                <p
                    role="alert"
                    className="mt-4 text-sm font-bold text-rose-600 dark:text-rose-300"
                >
                    {t("sameLanguage")}
                </p>
            )}
            {controller.saveError && (
                <p
                    role="alert"
                    className="mt-4 text-sm font-bold text-rose-600 dark:text-rose-300"
                >
                    {t("saveFailed")}
                </p>
            )}
            {controller.saved && (
                <p
                    role="status"
                    className="mt-4 text-sm font-bold text-emerald-600 dark:text-emerald-300"
                >
                    {controller.saveMode === "INITIAL"
                        ? t("savedInitial")
                        : t("savedNextDay")}
                </p>
            )}

            <div className="mt-6 flex justify-end">
                <button
                    type="button"
                    onClick={() => void controller.save()}
                    disabled={!controller.isValid || controller.isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {controller.isSaving ? t("saving") : t("save")}
                </button>
            </div>
        </section>
    );
}
