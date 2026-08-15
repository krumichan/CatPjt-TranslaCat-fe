"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { languageLearningSettingService } from "@/services/language-learning/languageLearningSettingService";
import type { LanguageLearningUserSetting } from "@/types/language-learning/setting";

export interface LanguageLearningSettingFormValue {
    originLanguage: string;
    learningLanguage: string;
    timezone: string;
    dailySentenceCount: number;
}

function toFormValue(
    setting: LanguageLearningUserSetting,
): LanguageLearningSettingFormValue {
    return {
        originLanguage:
            setting.pendingOriginLanguage ?? setting.originLanguage ?? "ko",
        learningLanguage:
            setting.pendingLearningLanguage ?? setting.learningLanguage ?? "ja",
        timezone:
            setting.pendingTimezone ??
            setting.timezone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone,
        dailySentenceCount:
            setting.pendingDailySentenceCount ?? setting.dailySentenceCount,
    };
}

export function useLanguageLearningUserSettingForm({
    setting,
    onUpdated,
}: {
    setting: LanguageLearningUserSetting | null;
    onUpdated: (setting: LanguageLearningUserSetting) => Promise<unknown> | unknown;
}) {
    const [form, setForm] = useState<LanguageLearningSettingFormValue | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (setting) {
            setForm(toFormValue(setting));
        }
    }, [setting]);

    const isValid = useMemo(() => {
        if (!form || !setting) return false;

        return (
            form.originLanguage.trim().length > 0 &&
            form.learningLanguage.trim().length > 0 &&
            form.originLanguage !== form.learningLanguage &&
            form.timezone.trim().length > 0 &&
            Number.isInteger(form.dailySentenceCount) &&
            form.dailySentenceCount >= setting.minDailySentenceCount &&
            form.dailySentenceCount <= setting.maxDailySentenceCount
        );
    }, [form, setting]);

    const update = useCallback(
        <K extends keyof LanguageLearningSettingFormValue>(
            key: K,
            value: LanguageLearningSettingFormValue[K],
        ) => {
            setSaved(false);
            setSaveError(false);
            setForm((current) =>
                current ? { ...current, [key]: value } : current,
            );
        },
        [],
    );

    const save = useCallback(async () => {
        if (!form || !isValid || isSaving) return false;

        setIsSaving(true);
        setSaveError(false);
        setSaved(false);

        try {
            const updated = await languageLearningSettingService.update({
                ...form,
                originLanguage: form.originLanguage.trim(),
                learningLanguage: form.learningLanguage.trim(),
                timezone: form.timezone.trim(),
            });
            await onUpdated(updated);
            setForm(toFormValue(updated));
            setSaved(true);
            return true;
        } catch (error) {
            console.error("Failed to update language learning setting.", error);
            setSaveError(true);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [form, isSaving, isValid, onUpdated]);

    return {
        form,
        isValid,
        isSaving,
        saveError,
        saved,
        update,
        save,
    };
}

export type LanguageLearningUserSettingFormController = ReturnType<
    typeof useLanguageLearningUserSettingForm
>;
