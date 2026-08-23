"use client";

import { Ear, Headphones, Languages, Mic2, Save } from "lucide-react";
import { useTranslations } from "next-intl";

import { AppSelect } from "@/components/common/AppSelect";
import { CHAT_LANGUAGE_OPTIONS } from "@/constants/chatLanguages";
import {
    SPEAKING_PLAYBACK_SPEED_OPTIONS,
    SPEAKING_VOICE_OPTIONS,
} from "@/constants/language-learning/speaking";
import type { LanguageLearningUserSettingFormController } from "@/hooks/language-learning/useLanguageLearningUserSettingForm";
import type { LanguageLearningUserSetting } from "@/types/language-learning/setting";
import type { ListeningTaskType } from "@/types/language-learning/listening";


const LISTENING_TASK_OPTIONS: Array<[ListeningTaskType, typeof Headphones]> = [
    ["DICTATION", Headphones],
    ["INTERPRETATION", Languages],
    ["REPEAT_AFTER_AUDIO", Mic2],
];

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
                    <span className="inline-flex items-center gap-1.5 text-sm font-black text-slate-700 dark:text-slate-200">
                        <Ear className="h-4 w-4" aria-hidden="true" />
                        {t("dailyListeningGoalCount")}
                    </span>
                    <input
                        type="number"
                        min={setting.minDailyListeningGoalCount}
                        max={setting.maxDailyListeningGoalCount}
                        step={1}
                        value={form.dailyListeningGoalCount}
                        onChange={(event) =>
                            controller.update(
                                "dailyListeningGoalCount",
                                Number(event.target.value),
                            )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                    />
                    <span className="mt-1 block text-xs text-slate-400">
                        {t("dailyListeningGoalRange", {
                            min: setting.minDailyListeningGoalCount,
                            max: setting.maxDailyListeningGoalCount,
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

                <fieldset className="md:col-span-2">
                    <legend className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {t("defaultListeningTasks")}
                    </legend>
                    <p id="listening-setting-selection-rule" className="mt-1 text-xs text-slate-400">
                        {t("defaultListeningTasksRule")}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {LISTENING_TASK_OPTIONS.map(([taskType, Icon]) => {
                            const checked = form.defaultListeningTaskTypes.includes(taskType);
                            return (
                                <label
                                    key={taskType}
                                    data-testid={`listening-setting-task-option-${taskType}`}
                                    className={`cursor-pointer rounded-xl border px-3 py-3 transition ${
                                        checked
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                                            : "border-slate-200 bg-white dark:border-white/10 dark:bg-black/10"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={checked}
                                        aria-describedby="listening-setting-selection-rule"
                                        onChange={() => {
                                            const next = checked
                                                ? form.defaultListeningTaskTypes.filter((item) => item !== taskType)
                                                : [...form.defaultListeningTaskTypes, taskType];
                                            controller.update("defaultListeningTaskTypes", next);
                                        }}
                                    />
                                    <span className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
                                        <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
                                        {t(`listeningTask.${taskType}`)}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                    {!form.defaultListeningTaskTypes.some(
                        (task) => task === "DICTATION" || task === "REPEAT_AFTER_AUDIO",
                    ) && (
                        <p role="alert" className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-300">
                            {t("defaultListeningTasksInvalid")}
                        </p>
                    )}
                </fieldset>

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
