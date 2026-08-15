"use client";

import { useTranslations } from "next-intl";

import type { AdminLanguageLearningSettingFormController } from "@/hooks/language-learning/useAdminLanguageLearningSettingForm";
import type { LanguageLearningAdminSetting } from "@/types/language-learning/setting";

type SpeakingNumberField = Exclude<
    keyof LanguageLearningAdminSetting,
    | "adaptiveWritingEnabled"
    | "aiEvaluationEnabled"
    | "speakingEnabled"
    | "speakingEvaluationEnabled"
    | "defaultDailySentenceCount"
    | "minDailySentenceCount"
    | "maxDailySentenceCount"
    | "dailyKeywordMaxCount"
    | "reviewAvailableDays"
    | "levelRecheckRecommendationDays"
>;

interface SpeakingNumberFieldDefinition {
    key: SpeakingNumberField;
    min: number;
    max?: number;
    step?: number;
}

const NUMBER_FIELDS: SpeakingNumberFieldDefinition[] = [
    { key: "defaultDailySpeakingGoalMinutes", min: 1 },
    { key: "minDailySpeakingGoalMinutes", min: 1 },
    { key: "maxDailySpeakingGoalMinutes", min: 1 },
    { key: "dailySpeakingHardLimitMinutes", min: 1, max: 240 },
    { key: "dailySpeakingSessionLimit", min: 1, max: 100 },
    { key: "maxSessionMinutes", min: 1, max: 10 },
    { key: "maxTurnsPerSession", min: 1, max: 20 },
    { key: "minValidAudioSeconds", min: 0.1, max: 10, step: 0.1 },
    { key: "maxTurnAudioSeconds", min: 1, max: 60 },
    { key: "maxAudioFileBytes", min: 1024, max: 10 * 1024 * 1024 },
    { key: "rawAudioRetentionDays", min: 1, max: 365 },
    { key: "reportedAudioRetentionDays", min: 1, max: 365 },
    { key: "activeSessionResumeHours", min: 1, max: 24 },
    { key: "automaticRetryLimitPerStage", min: 0, max: 2 },
    { key: "manualRetryLimitPerStage", min: 0, max: 1 },
    { key: "sttTimeoutSeconds", min: 1 },
    { key: "ttsTimeoutSeconds", min: 1 },
    { key: "evaluationTimeoutSeconds", min: 1 },
];

const BOOLEAN_FIELDS = [
    "speakingEnabled",
    "speakingEvaluationEnabled",
] as const;

export function AdminSpeakingSettingsSection({
    controller,
}: {
    controller: AdminLanguageLearningSettingFormController;
}) {
    const t = useTranslations("LanguageLearning.admin");
    const form = controller.form;

    if (!form) return null;

    return (
        <section
            className="mt-8 border-t border-slate-200 pt-7 dark:border-white/10"
            data-testid="admin-speaking-settings"
        >
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {t("speaking.title")}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("speaking.description")}
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {NUMBER_FIELDS.map(({ key, min, max, step = 1 }) => (
                    <label
                        key={key}
                        className="block rounded-2xl bg-slate-50 p-4 dark:bg-white/5"
                    >
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                            {t(`fields.${key}.label`)}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-400">
                            {t(`fields.${key}.help`)}
                        </span>
                        <input
                            type="number"
                            min={min}
                            max={max}
                            step={step}
                            value={form[key]}
                            onChange={(event) =>
                                controller.update(
                                    key,
                                    Number(event.target.value),
                                )
                            }
                            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                        />
                    </label>
                ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
                {BOOLEAN_FIELDS.map((key) => (
                    <label
                        key={key}
                        className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4 dark:border-white/10"
                    >
                        <div>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                                {t(`fields.${key}.label`)}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-400">
                                {t(`fields.${key}.help`)}
                            </span>
                        </div>
                        <input
                            type="checkbox"
                            checked={form[key]}
                            onChange={(event) =>
                                controller.update(key, event.target.checked)
                            }
                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                    </label>
                ))}
            </div>
        </section>
    );
}
