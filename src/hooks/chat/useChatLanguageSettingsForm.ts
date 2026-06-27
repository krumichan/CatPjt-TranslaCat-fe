import { useCallback, useState } from "react";

import type {
    ChatLanguageSettings,
    ChatLanguageSettingsUpdateRequest,
} from "@/types/chat";

interface UseChatLanguageSettingsFormParams {
    settings: ChatLanguageSettings;
    onSave: (request: ChatLanguageSettingsUpdateRequest) => Promise<boolean>;
    onClose: () => void;
}

interface ChatLanguageSettingsFormState {
    originalLanguageCode: string;
    translationLanguageCode: string;
    showOriginal: boolean;
    showTranslation: boolean;
}

export function useChatLanguageSettingsForm({
    settings,
    onSave,
    onClose,
}: UseChatLanguageSettingsFormParams) {
    const [form, setForm] = useState<ChatLanguageSettingsFormState>(() => ({
        originalLanguageCode: settings.originalLanguageCode,
        translationLanguageCode: settings.translationLanguageCode,
        showOriginal: settings.showOriginal,
        showTranslation: settings.showTranslation,
    }));

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
        const saved = await onSave({
            originalLanguageCode: form.originalLanguageCode,
            translationLanguageCode: form.translationLanguageCode,
            showOriginal: form.showOriginal,
            showTranslation: form.showTranslation,
        });

        if (saved) {
            onClose();
        }
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