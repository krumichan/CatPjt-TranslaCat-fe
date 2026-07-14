import { useCallback, useEffect, useState } from "react";

import {
    chatService,
    isChatApiNotFoundError,
} from "@/services/chat/chatService";
import type {
    ChatDefaultLanguageSettings,
    ChatLanguageSettings,
    ChatLanguageSettingsSource,
    ChatLanguageSettingsUpdateRequest,
} from "@/types/chat";

type ChatLanguageSettingsLoadErrorCode = "LOAD_FAILED";
type ChatLanguageSettingsSaveErrorCode = "SAVE_FAILED";

const SYSTEM_DEFAULT_LANGUAGE_SETTINGS = {
    originalLanguageCode: "ko",
    translationLanguageCode: "ja",
    showOriginal: true,
    showTranslation: true,
} as const;

interface UseChatLanguageSettingsResult {
    settings: ChatLanguageSettings | null;
    defaultSettings: ChatDefaultLanguageSettings | null;
    resolvedSource: ChatLanguageSettingsSource | null;
    isLoading: boolean;
    isSaving: boolean;
    loadErrorCode: ChatLanguageSettingsLoadErrorCode | null;
    saveErrorCode: ChatLanguageSettingsSaveErrorCode | null;
    reload: () => Promise<void>;
    saveSettings: (
        request: ChatLanguageSettingsUpdateRequest,
    ) => Promise<boolean>;
}

function toRoomScopedSettings(
    roomId: number,
    defaultSettings: ChatDefaultLanguageSettings | null,
    source: ChatLanguageSettingsSource,
): ChatLanguageSettings {
    return {
        chatRoomId: roomId,
        userId: defaultSettings?.userId ?? 0,
        originalLanguageCode:
            defaultSettings?.originalLanguageCode ??
            SYSTEM_DEFAULT_LANGUAGE_SETTINGS.originalLanguageCode,
        translationLanguageCode:
            defaultSettings?.translationLanguageCode ??
            SYSTEM_DEFAULT_LANGUAGE_SETTINGS.translationLanguageCode,
        showOriginal:
            defaultSettings?.showOriginal ??
            SYSTEM_DEFAULT_LANGUAGE_SETTINGS.showOriginal,
        showTranslation:
            defaultSettings?.showTranslation ??
            SYSTEM_DEFAULT_LANGUAGE_SETTINGS.showTranslation,
        roomLanguageSettingApplied: source === "ROOM_OVERRIDE",
        source,
    };
}

export function useChatLanguageSettings(
    roomId: number,
): UseChatLanguageSettingsResult {
    const [settings, setSettings] = useState<ChatLanguageSettings | null>(
        null,
    );
    const [defaultSettings, setDefaultSettings] =
        useState<ChatDefaultLanguageSettings | null>(null);
    const [resolvedSource, setResolvedSource] =
        useState<ChatLanguageSettingsSource | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [loadErrorCode, setLoadErrorCode] =
        useState<ChatLanguageSettingsLoadErrorCode | null>(null);
    const [saveErrorCode, setSaveErrorCode] =
        useState<ChatLanguageSettingsSaveErrorCode | null>(null);

    const reload = useCallback(async () => {
        setIsLoading(true);
        setLoadErrorCode(null);

        let loadedDefaultSettings: ChatDefaultLanguageSettings | null = null;
        let fallbackSource: ChatLanguageSettingsSource = "SYSTEM";

        try {
            loadedDefaultSettings =
                await chatService.getMyDefaultLanguageSettings();
            fallbackSource = "DEFAULT";
        } catch (error) {
            if (!isChatApiNotFoundError(error)) {
                console.error(
                    "Failed to load default chat language settings.",
                    error,
                );
            }
        }

        const fallbackSettings = toRoomScopedSettings(
            roomId,
            loadedDefaultSettings,
            fallbackSource,
        );

        try {
            const roomSettings = await chatService.getMyLanguageSettings(
                roomId,
            );
            const resolvedRoomSettings: ChatLanguageSettings = {
                ...roomSettings,
                source: "ROOM_OVERRIDE",
                roomLanguageSettingApplied: true,
            };

            setDefaultSettings(loadedDefaultSettings);
            setSettings(resolvedRoomSettings);
            setResolvedSource("ROOM_OVERRIDE");
        } catch (error) {
            if (!isChatApiNotFoundError(error)) {
                console.error("Failed to load chat language settings", error);
                setLoadErrorCode("LOAD_FAILED");
            }

            setDefaultSettings(loadedDefaultSettings);
            setSettings(fallbackSettings);
            setResolvedSource(fallbackSource);
        } finally {
            setIsLoading(false);
        }
    }, [roomId]);

    const saveSettings = useCallback(
        async (request: ChatLanguageSettingsUpdateRequest) => {
            setIsSaving(true);
            setSaveErrorCode(null);

            try {
                const response = await chatService.updateMyLanguageSettings(
                    roomId,
                    request,
                );
                const resolvedRoomSettings: ChatLanguageSettings = {
                    ...response,
                    source: "ROOM_OVERRIDE",
                    roomLanguageSettingApplied: true,
                };
                setSettings(resolvedRoomSettings);
                setResolvedSource("ROOM_OVERRIDE");
                return true;
            } catch (error) {
                console.error("Failed to update chat language settings", error);
                setSaveErrorCode("SAVE_FAILED");
                return false;
            } finally {
                setIsSaving(false);
            }
        },
        [roomId],
    );

    useEffect(() => {
        void reload();
    }, [reload]);

    return {
        settings,
        defaultSettings,
        resolvedSource,
        isLoading,
        isSaving,
        loadErrorCode,
        saveErrorCode,
        reload,
        saveSettings,
    };
}
