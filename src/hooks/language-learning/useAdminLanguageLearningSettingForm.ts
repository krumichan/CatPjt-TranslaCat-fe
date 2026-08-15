"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { adminLanguageLearningSettingService } from "@/services/language-learning/adminLanguageLearningSettingService";
import type { LanguageLearningAdminSetting } from "@/types/language-learning/setting";

export function useAdminLanguageLearningSettingForm() {
    const query = useQuery({
        keys: ["admin-language-learning-settings"] as const,
        fetcher: () => adminLanguageLearningSettingService.get(),
        config: { revalidateOnMount: true },
    });
    const [form, setForm] = useState<LanguageLearningAdminSetting | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (query.data) {
            setForm(query.data);
        }
    }, [query.data]);

    const isValid = useMemo(() => {
        if (!form) return false;

        return (
            Number.isInteger(form.defaultDailySentenceCount) &&
            Number.isInteger(form.minDailySentenceCount) &&
            Number.isInteger(form.maxDailySentenceCount) &&
            form.minDailySentenceCount > 0 &&
            form.minDailySentenceCount <= form.defaultDailySentenceCount &&
            form.defaultDailySentenceCount <= form.maxDailySentenceCount &&
            Number.isInteger(form.dailyKeywordMaxCount) &&
            form.dailyKeywordMaxCount > 0 &&
            Number.isInteger(form.reviewAvailableDays) &&
            form.reviewAvailableDays > 0 &&
            Number.isInteger(form.levelRecheckRecommendationDays) &&
            form.levelRecheckRecommendationDays > 0
        );
    }, [form]);

    const update = useCallback(
        <K extends keyof LanguageLearningAdminSetting>(
            key: K,
            value: LanguageLearningAdminSetting[K],
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
            const updated = await adminLanguageLearningSettingService.update(form);
            setForm(updated);
            await query.mutate(updated, false);
            setSaved(true);
            return true;
        } catch (error) {
            console.error("Failed to update language learning admin settings.", error);
            setSaveError(true);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [form, isSaving, isValid, query]);

    return {
        form,
        isLoading: query.isLoading,
        loadError: query.isError,
        isSaving,
        saveError,
        saved,
        isValid,
        update,
        save,
        retry: async () => {
            await query.mutate(undefined, true);
        },
    };
}

export type AdminLanguageLearningSettingFormController = ReturnType<
    typeof useAdminLanguageLearningSettingForm
>;
