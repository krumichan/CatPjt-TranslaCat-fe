"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminSpeakingSettingsSection } from "@/components/language-learning/admin/AdminSpeakingSettingsSection";
import type { AdminLanguageLearningSettingFormController } from "@/hooks/language-learning/useAdminLanguageLearningSettingForm";
import type { LanguageLearningAdminSetting } from "@/types/language-learning/setting";

const NUMBER_FIELDS: Array<{
    key: keyof Pick<
        LanguageLearningAdminSetting,
        | "defaultDailySentenceCount"
        | "minDailySentenceCount"
        | "maxDailySentenceCount"
        | "dailyKeywordMaxCount"
        | "reviewAvailableDays"
        | "levelRecheckRecommendationDays"
    >;
    min: number;
}> = [
    { key: "defaultDailySentenceCount", min: 1 },
    { key: "minDailySentenceCount", min: 1 },
    { key: "maxDailySentenceCount", min: 1 },
    { key: "dailyKeywordMaxCount", min: 0 },
    { key: "reviewAvailableDays", min: 1 },
    { key: "levelRecheckRecommendationDays", min: 1 },
];

const BOOLEAN_FIELDS = [
    "adaptiveWritingEnabled",
    "aiEvaluationEnabled",
] as const;

export function AdminLanguageLearningSettingsForm({
    controller,
}: {
    controller: AdminLanguageLearningSettingFormController;
}) {
    const t = useTranslations("LanguageLearning.admin");

    if (controller.isLoading) {
        return (
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900/75">
                {t("loading")}
            </section>
        );
    }

    if (controller.loadError || !controller.form) {
        return (
            <section className="rounded-3xl border border-rose-200 bg-white/90 p-6 dark:border-rose-500/20 dark:bg-slate-900/75">
                <p className="text-sm font-bold text-rose-600 dark:text-rose-300">
                    {t("loadFailed")}
                </p>
                <button
                    type="button"
                    onClick={() => void controller.retry()}
                    className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-900"
                >
                    {t("retry")}
                </button>
            </section>
        );
    }

    const form = controller.form;

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
            <div className="grid gap-5 md:grid-cols-2">
                {NUMBER_FIELDS.map(({ key, min }) => (
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
                            step={1}
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

            <div className="mt-6 grid gap-4 md:grid-cols-2">
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

            <AdminSpeakingSettingsSection controller={controller} />

            {!controller.isValid && (
                <p className="mt-5 text-sm font-bold text-rose-600 dark:text-rose-300">
                    {t("invalid")}
                </p>
            )}
            {controller.saveError && (
                <p className="mt-5 text-sm font-bold text-rose-600 dark:text-rose-300">
                    {t("saveFailed")}
                </p>
            )}
            {controller.saved && (
                <p className="mt-5 text-sm font-bold text-emerald-600 dark:text-emerald-300">
                    {t("saved")}
                </p>
            )}

            <div className="mt-6 flex justify-end">
                <button
                    type="button"
                    onClick={() => void controller.save()}
                    disabled={!controller.isValid || controller.isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {controller.isSaving ? t("saving") : t("save")}
                </button>
            </div>
        </section>
    );
}
