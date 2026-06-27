import { useCallback, useEffect, useState } from "react";

import { chatService } from "@/services/chat/chatService";
import type {
    ChatLanguageSettings,
    ChatLanguageSettingsUpdateRequest,
} from "@/types/chat";

type ChatLanguageSettingsLoadErrorCode = "LOAD_FAILED";
type ChatLanguageSettingsSaveErrorCode = "SAVE_FAILED";

interface UseChatLanguageSettingsResult {
    settings: ChatLanguageSettings | null;
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
    const [settings, setSettings] = useState<ChatLanguageSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [loadErrorCode, setLoadErrorCode] =
        useState<ChatLanguageSettingsLoadErrorCode | null>(null);
    const [saveErrorCode, setSaveErrorCode] =
        useState<ChatLanguageSettingsSaveErrorCode | null>(null);

    const reload = useCallback(async () => {
        setIsLoading(true);
        setLoadErrorCode(null);

        try {
            const response = await chatService.getMyLanguageSettings(roomId);
            setSettings(response);
        } catch (error) {
            console.error("Failed to load chat language settings", error);
            setLoadErrorCode("LOAD_FAILED");
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

                setSettings(response);
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
        isLoading,
        isSaving,
        loadErrorCode,
        saveErrorCode,
        reload,
        saveSettings,
    };
}