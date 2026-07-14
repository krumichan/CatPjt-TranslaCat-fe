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
import {
    normalizeChatLanguageSettingsRequest,
    toRoomScopedLanguageSettings,
    toSystemDefaultChatLanguageSettings,
    withDefaultLanguageSettingsSource,
    withRoomLanguageSettingsSource,
} from "@/utils/chat/chatLanguageSettings";

type ChatLanguageSettingsLoadErrorCode = "LOAD_FAILED";
type ChatLanguageSettingsSaveErrorCode = "SAVE_FAILED";

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

        let loadedDefaultSettings: ChatDefaultLanguageSettings | null;
        let fallbackSource: ChatLanguageSettingsSource = "SYSTEM";

        try {
            const defaultResponse =
                await chatService.getMyDefaultLanguageSettings();
            loadedDefaultSettings = withDefaultLanguageSettingsSource(
                defaultResponse,
                "DEFAULT",
            );
            fallbackSource = "DEFAULT";
        } catch (error) {
            if (!isChatApiNotFoundError(error)) {
                console.error(
                    "Failed to load default chat language settings.",
                    error,
                );
            }
            loadedDefaultSettings = toSystemDefaultChatLanguageSettings();
        }

        const fallbackSettings = toRoomScopedLanguageSettings(
            roomId,
            loadedDefaultSettings,
            fallbackSource,
        );

        try {
            const roomSettings = await chatService.getMyLanguageSettings(
                roomId,
            );
            const roomSettingsSource: ChatLanguageSettingsSource =
                roomSettings.roomLanguageSettingApplied
                    ? "ROOM_OVERRIDE"
                    : fallbackSource;
            const resolvedRoomSettings = withRoomLanguageSettingsSource(
                roomSettings,
                roomSettingsSource,
            );

            setDefaultSettings(loadedDefaultSettings);
            setSettings(resolvedRoomSettings);
            setResolvedSource(roomSettingsSource);
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
                    normalizeChatLanguageSettingsRequest(request),
                );
                const resolvedRoomSettings = withRoomLanguageSettingsSource(
                    response,
                    "ROOM_OVERRIDE",
                );
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
