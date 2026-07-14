import { useCallback, useEffect, useState } from "react";

import type { ChatLanguageSettingsUpdateRequest } from "@/types/chat";
import { normalizeChatLanguageSettingsRequest } from "@/utils/chat/chatLanguageSettings";

export interface ChatLanguageSettingsFormValue {
    originalLanguageCode: string;
    translationLanguageCode: string;
    showOriginal: boolean;
    showTranslation: boolean;
}

interface UseChatLanguageSettingsFormParams {
    settings: ChatLanguageSettingsFormValue;
    onSave: (request: ChatLanguageSettingsUpdateRequest) => Promise<boolean>;
    onClose?: () => void;
}

export function useChatLanguageSettingsForm({
    settings,
    onSave,
    onClose,
}: UseChatLanguageSettingsFormParams) {
    const [form, setForm] = useState<ChatLanguageSettingsFormValue>(() => ({
        originalLanguageCode: settings.originalLanguageCode,
        translationLanguageCode: settings.translationLanguageCode,
        showOriginal: settings.showOriginal,
        showTranslation: settings.showTranslation,
    }));

    useEffect(() => {
        setForm({
            originalLanguageCode: settings.originalLanguageCode,
            translationLanguageCode: settings.translationLanguageCode,
            showOriginal: settings.showOriginal,
            showTranslation: settings.showTranslation,
        });
    }, [
        settings.originalLanguageCode,
        settings.showOriginal,
        settings.showTranslation,
        settings.translationLanguageCode,
    ]);

    const setOriginalLanguageCode = useCallback((value: string) => {
        setForm((current) => ({
            ...current,
            originalLanguageCode: value,
        }));
    }, []);

    const setTranslationLanguageCode = useCallback((value: string) => {
        setForm((current) => ({
            ...current,
            translationLanguageCode: value,
        }));
    }, []);

    const setShowOriginal = useCallback((value: boolean) => {
        setForm((current) => ({
            ...current,
            showOriginal: value,
        }));
    }, []);

    const setShowTranslation = useCallback((value: boolean) => {
        setForm((current) => ({
            ...current,
            showTranslation: value,
        }));
    }, []);

    const handleSubmit = useCallback(async () => {
        const saved = await onSave(
            normalizeChatLanguageSettingsRequest({
                originalLanguageCode: form.originalLanguageCode,
                translationLanguageCode: form.translationLanguageCode,
                showOriginal: form.showOriginal,
                showTranslation: form.showTranslation,
            }),
        );

        if (saved) {
            onClose?.();
        }

        return saved;
    }, [form, onClose, onSave]);

    return {
        form,
        setOriginalLanguageCode,
        setTranslationLanguageCode,
        setShowOriginal,
        setShowTranslation,
        handleSubmit,
    };
}
