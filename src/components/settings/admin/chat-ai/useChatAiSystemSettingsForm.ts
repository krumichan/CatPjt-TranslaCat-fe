"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { adminChatAiSettingService } from "@/services/admin/adminChatAiSettingService";
import type { ChatAiSystemSetting } from "@/types/chat";

export type ChatAiSystemNumberSettingKey = Exclude<
    keyof ChatAiSystemSetting,
    "revivalAllowedStartTime" | "revivalAllowedEndTime"
>;

export type ChatAiSystemTimeSettingKey = Extract<
    keyof ChatAiSystemSetting,
    "revivalAllowedStartTime" | "revivalAllowedEndTime"
>;

export interface ChatAiSystemNumberField {
    key: ChatAiSystemNumberSettingKey;
    labelKey: string;
    min: number;
    max: number;
    step: number;
}

export const CHAT_AI_SYSTEM_NUMBER_FIELDS: readonly ChatAiSystemNumberField[] = [
    { key: "maxAiMembersPerRoom", labelKey: "members", min: 1, max: 50, step: 1 },
    { key: "conversationResponseRate", labelKey: "conversationRate", min: 0, max: 100, step: 1 },
    { key: "conversationCooldownSeconds", labelKey: "conversationCooldown", min: 0, max: 86400, step: 1 },
    { key: "conversationMinHumanMessagesAfterAi", labelKey: "minHumanMessages", min: 0, max: 100, step: 1 },
    { key: "revivalFirstDelayHours", labelKey: "revivalFirst", min: 1, max: 8760, step: 1 },
    { key: "revivalSecondDelayHours", labelKey: "revivalSecond", min: 1, max: 8760, step: 1 },
    { key: "revivalThirdDelayHours", labelKey: "revivalThird", min: 1, max: 8760, step: 1 },
    { key: "contextMaxMessages", labelKey: "contextMessages", min: 1, max: 1000, step: 1 },
    { key: "contextMaxCharacters", labelKey: "contextCharacters", min: 100, max: 1000000, step: 100 },
    { key: "replyMaxCharacters", labelKey: "replyCharacters", min: 10, max: 100000, step: 10 },
    { key: "mentionRateLimitCount", labelKey: "mentionCount", min: 1, max: 1000, step: 1 },
    { key: "mentionRateLimitWindowSeconds", labelKey: "mentionWindow", min: 1, max: 86400, step: 1 },
];

export function useChatAiSystemSettingsForm() {
    const query = useQuery({
        keys: ["admin-chat-ai-settings"] as const,
        fetcher: () => adminChatAiSettingService.getSettings(),
        config: { revalidateOnMount: true },
    });
    const [form, setForm] = useState<ChatAiSystemSetting | null>(null);
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

        const numbersValid = CHAT_AI_SYSTEM_NUMBER_FIELDS.every(
            ({ key, min, max }) => {
                const value = form[key];
                return (
                    typeof value === "number" &&
                    Number.isFinite(value) &&
                    Number.isInteger(value) &&
                    value >= min &&
                    value <= max
                );
            },
        );
        if (!numbersValid) return false;

        const start = form.revivalAllowedStartTime?.slice(0, 5) ?? "";
        const end = form.revivalAllowedEndTime?.slice(0, 5) ?? "";
        return (
            /^\d{2}:\d{2}$/.test(start) &&
            /^\d{2}:\d{2}$/.test(end) &&
            start < end
        );
    }, [form]);

    const clearFeedback = useCallback(() => {
        setSaved(false);
        setSaveError(false);
    }, []);

    const updateNumber = useCallback(
        (key: ChatAiSystemNumberSettingKey, value: number) => {
            clearFeedback();
            setForm((current) =>
                current ? { ...current, [key]: value } : current,
            );
        },
        [clearFeedback],
    );

    const updateTime = useCallback(
        (key: ChatAiSystemTimeSettingKey, value: string) => {
            clearFeedback();
            setForm((current) =>
                current ? { ...current, [key]: value } : current,
            );
        },
        [clearFeedback],
    );

    const retry = useCallback(async () => {
        clearFeedback();
        await query.mutate(undefined, true);
    }, [clearFeedback, query]);

    const save = useCallback(async () => {
        if (!form || isSaving || !isValid) return;

        setIsSaving(true);
        setSaveError(false);
        setSaved(false);
        try {
            const updated = await adminChatAiSettingService.updateSettings(form);
            setForm(updated);
            await query.mutate(updated, false);
            setSaved(true);
        } catch (error) {
            console.error("Failed to update chat AI system settings.", error);
            setSaveError(true);
        } finally {
            setIsSaving(false);
        }
    }, [form, isSaving, isValid, query]);

    return {
        form,
        fields: CHAT_AI_SYSTEM_NUMBER_FIELDS,
        isLoading: query.isLoading,
        isLoadError: query.isError,
        isSaving,
        saveError,
        saved,
        isValid,
        updateNumber,
        updateTime,
        retry,
        save,
    };
}

export type ChatAiSystemSettingsFormController = ReturnType<
    typeof useChatAiSystemSettingsForm
>;
