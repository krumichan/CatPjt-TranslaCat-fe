"use client";

import { Loader2, RefreshCw, Save, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import FeedbackMessage from "@/components/common/FeedbackMessage";
import { NumberSettingField } from "@/components/settings/admin/chat-ai/NumberSettingField";
import { TimeSettingField } from "@/components/settings/admin/chat-ai/TimeSettingField";
import { ToggleSettingField } from "@/components/settings/admin/chat-ai/ToggleSettingField";
import type { ChatAiSystemSettingsFormController } from "@/components/settings/admin/chat-ai/useChatAiSystemSettingsForm";

interface ChatAiSystemSettingsFormProps {
    controller: ChatAiSystemSettingsFormController;
}

export function ChatAiSystemSettingsForm({
    controller,
}: ChatAiSystemSettingsFormProps) {
    const t = useTranslations("Settings.chatAiPage");
    const {
        form,
        fields,
        isLoading,
        isLoadError,
        isSaving,
        saveError,
        saved,
        isValid,
        updateNumber,
        updateBoolean,
        updateTime,
        retry,
        save,
    } = controller;

    if (isLoading || !form) {
        if (isLoadError) {
            return (
                <section className="rounded-3xl border border-rose-200 bg-white p-6 dark:border-rose-400/30 dark:bg-slate-950">
                    <FeedbackMessage variant="error">
                        {t("messages.loadFailed")}
                    </FeedbackMessage>
                    <button
                        type="button"
                        onClick={() => void retry()}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 dark:border-white/10 dark:text-slate-200"
                    >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        {t("actions.retry")}
                    </button>
                </section>
            );
        }

        return (
            <section className="flex min-h-64 items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                {t("messages.loading")}
            </section>
        );
    }

    return (
        <section
            data-testid="admin-chat-ai-settings"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950 sm:p-6"
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-200">
                        <SlidersHorizontal
                            className="h-5 w-5"
                            aria-hidden="true"
                        />
                    </span>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">
                            {t("form.title")}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">
                            {t("form.description")}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    data-testid="admin-chat-ai-save"
                    onClick={() => void save()}
                    disabled={isSaving || !isValid}
                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-60"
                >
                    {isSaving ? (
                        <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                        />
                    ) : (
                        <Save className="h-4 w-4" aria-hidden="true" />
                    )}
                    {isSaving ? t("actions.saving") : t("actions.save")}
                </button>
            </div>

            <div className="mt-5 space-y-3">
                {saved && (
                    <FeedbackMessage variant="success">
                        {t("messages.saved")}
                    </FeedbackMessage>
                )}
                {saveError && (
                    <FeedbackMessage variant="error">
                        {t("messages.saveFailed")}
                    </FeedbackMessage>
                )}
                {!isValid && (
                    <FeedbackMessage variant="error">
                        {t("messages.invalidValues")}
                    </FeedbackMessage>
                )}
            </div>

            <div className="mt-6">
                <ToggleSettingField
                    label={t("fields.responseDelayEnabled.label")}
                    help={t("fields.responseDelayEnabled.help")}
                    checked={form.responseDelayEnabled}
                    onChange={(checked) =>
                        updateBoolean("responseDelayEnabled", checked)
                    }
                    testId="admin-chat-ai-response-delay-enabled"
                />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {fields.map(({ key, labelKey, min, max, step }) => (
                    <NumberSettingField
                        key={key}
                        label={t(`fields.${labelKey}.label`)}
                        help={t(`fields.${labelKey}.help`)}
                        value={form[key]}
                        min={min}
                        max={max}
                        step={step}
                        onChange={(value) => updateNumber(key, value)}
                    />
                ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
                <TimeSettingField
                    label={t("fields.revivalStart.label")}
                    help={t("fields.revivalStart.help")}
                    value={form.revivalAllowedStartTime}
                    onChange={(value) =>
                        updateTime("revivalAllowedStartTime", value)
                    }
                />
                <TimeSettingField
                    label={t("fields.revivalEnd.label")}
                    help={t("fields.revivalEnd.help")}
                    value={form.revivalAllowedEndTime}
                    onChange={(value) =>
                        updateTime("revivalAllowedEndTime", value)
                    }
                />
            </div>

            <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-500 dark:bg-white/5 dark:text-slate-300">
                {t("form.notice")}
            </p>
        </section>
    );
}
