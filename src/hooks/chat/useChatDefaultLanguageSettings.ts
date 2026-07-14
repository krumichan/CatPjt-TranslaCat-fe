import { useCallback, useEffect, useState } from "react";

import {
    chatService,
    isChatApiNotFoundError,
} from "@/services/chat/chatService";
import type {
    ChatDefaultLanguageSettings,
    ChatDefaultLanguageSettingsUpdateRequest,
    ChatLanguageSettingsSource,
} from "@/types/chat";
import {
    normalizeChatLanguageSettingsRequest,
    toSystemDefaultChatLanguageSettings,
    withDefaultLanguageSettingsSource,
} from "@/utils/chat/chatLanguageSettings";

type ChatDefaultLanguageSettingsLoadErrorCode = "LOAD_FAILED";
type ChatDefaultLanguageSettingsSaveErrorCode = "SAVE_FAILED";

interface UseChatDefaultLanguageSettingsResult {
    settings: ChatDefaultLanguageSettings | null;
    resolvedSource: ChatLanguageSettingsSource | null;
    isLoading: boolean;
    isSaving: boolean;
    isSaved: boolean;
    loadErrorCode: ChatDefaultLanguageSettingsLoadErrorCode | null;
    saveErrorCode: ChatDefaultLanguageSettingsSaveErrorCode | null;
    reload: () => Promise<void>;
    saveSettings: (
        request: ChatDefaultLanguageSettingsUpdateRequest,
    ) => Promise<boolean>;
}

export function useChatDefaultLanguageSettings(): UseChatDefaultLanguageSettingsResult {
    const [settings, setSettings] =
        useState<ChatDefaultLanguageSettings | null>(null);
    const [resolvedSource, setResolvedSource] =
        useState<ChatLanguageSettingsSource | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [loadErrorCode, setLoadErrorCode] =
        useState<ChatDefaultLanguageSettingsLoadErrorCode | null>(null);
    const [saveErrorCode, setSaveErrorCode] =
        useState<ChatDefaultLanguageSettingsSaveErrorCode | null>(null);

    const reload = useCallback(async () => {
        setIsLoading(true);
        setIsSaved(false);
        setLoadErrorCode(null);
        setSaveErrorCode(null);

        try {
            const response = await chatService.getMyDefaultLanguageSettings();
            const resolvedSettings = withDefaultLanguageSettingsSource(
                response,
                "DEFAULT",
            );
            setSettings(resolvedSettings);
            setResolvedSource("DEFAULT");
        } catch (error) {
            if (isChatApiNotFoundError(error)) {
                const systemSettings = toSystemDefaultChatLanguageSettings();
                setSettings(systemSettings);
                setResolvedSource("SYSTEM");
                return;
            }

            console.error(
                "Failed to load default chat language settings.",
                error,
            );
            setSettings(null);
            setResolvedSource(null);
            setLoadErrorCode("LOAD_FAILED");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveSettings = useCallback(
        async (request: ChatDefaultLanguageSettingsUpdateRequest) => {
            setIsSaving(true);
            setIsSaved(false);
            setSaveErrorCode(null);

            try {
                const response =
                    await chatService.updateMyDefaultLanguageSettings(
                        normalizeChatLanguageSettingsRequest(request),
                    );
                const resolvedSettings = withDefaultLanguageSettingsSource(
                    response,
                    "DEFAULT",
                );
                setSettings(resolvedSettings);
                setResolvedSource("DEFAULT");
                setIsSaved(true);
                return true;
            } catch (error) {
                console.error(
                    "Failed to update default chat language settings.",
                    error,
                );
                setSaveErrorCode("SAVE_FAILED");
                return false;
            } finally {
                setIsSaving(false);
            }
        },
        [],
    );

    useEffect(() => {
        void reload();
    }, [reload]);

    return {
        settings,
        resolvedSource,
        isLoading,
        isSaving,
        isSaved,
        loadErrorCode,
        saveErrorCode,
        reload,
        saveSettings,
    };
}
