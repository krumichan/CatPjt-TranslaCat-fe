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

        const writingValid =
            Number.isInteger(form.defaultDailySentenceCount) &&
            Number.isInteger(form.minDailySentenceCount) &&
            Number.isInteger(form.maxDailySentenceCount) &&
            form.minDailySentenceCount > 0 &&
            form.minDailySentenceCount <= form.defaultDailySentenceCount &&
            form.defaultDailySentenceCount <= form.maxDailySentenceCount &&
            Number.isInteger(form.dailyKeywordMaxCount) &&
            form.dailyKeywordMaxCount >= 0 &&
            Number.isInteger(form.reviewAvailableDays) &&
            form.reviewAvailableDays > 0 &&
            Number.isInteger(form.levelRecheckRecommendationDays) &&
            form.levelRecheckRecommendationDays > 0;

        const speakingGoalValid =
            form.minDailySpeakingGoalMinutes >= 1 &&
            form.minDailySpeakingGoalMinutes <=
                form.defaultDailySpeakingGoalMinutes &&
            form.defaultDailySpeakingGoalMinutes <=
                form.maxDailySpeakingGoalMinutes &&
            form.dailySpeakingHardLimitMinutes >=
                form.maxDailySpeakingGoalMinutes &&
            form.dailySpeakingHardLimitMinutes <= 240;

        const sessionValid =
            form.dailySpeakingSessionLimit >= 1 &&
            form.dailySpeakingSessionLimit <= 100 &&
            form.maxSessionMinutes >= 1 &&
            form.maxSessionMinutes <= 10 &&
            form.maxTurnsPerSession >= 1 &&
            form.maxTurnsPerSession <= 20;

        const audioValid =
            form.minValidAudioSeconds >= 0.1 &&
            form.minValidAudioSeconds <= 10 &&
            form.maxTurnAudioSeconds >= form.minValidAudioSeconds &&
            form.maxTurnAudioSeconds <= 60 &&
            form.maxAudioFileBytes >= 1024 &&
            form.maxAudioFileBytes <= 10 * 1024 * 1024;

        const retentionValid =
            form.rawAudioRetentionDays >= 1 &&
            form.rawAudioRetentionDays <= 365 &&
            form.reportedAudioRetentionDays >= form.rawAudioRetentionDays &&
            form.reportedAudioRetentionDays <= 365;

        const retryValid =
            form.automaticRetryLimitPerStage >= 0 &&
            form.automaticRetryLimitPerStage <= 2 &&
            form.manualRetryLimitPerStage >= 0 &&
            form.manualRetryLimitPerStage <= 1;

        const timeoutValid =
            form.sttTimeoutSeconds >= 1 &&
            form.ttsTimeoutSeconds >= 1 &&
            form.evaluationTimeoutSeconds >= 1 &&
            form.activeSessionResumeHours >= 1 &&
            form.activeSessionResumeHours <= 24;

        return (
            writingValid &&
            speakingGoalValid &&
            sessionValid &&
            audioValid &&
            retentionValid &&
            retryValid &&
            timeoutValid
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
            const updated =
                await adminLanguageLearningSettingService.update(form);
            setForm(updated);
            await query.mutate(updated, false);
            setSaved(true);
            return true;
        } catch (error) {
            console.error(
                "Failed to update language learning admin settings.",
                error,
            );
            setSaveError(true);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [form, isSaving, isValid, query]);

    const retry = useCallback(async () => {
        await query.mutate(undefined, true);
    }, [query]);

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
        retry,
    };
}

export type AdminLanguageLearningSettingFormController = ReturnType<
    typeof useAdminLanguageLearningSettingForm
>;
