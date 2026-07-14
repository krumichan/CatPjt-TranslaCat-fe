import type {
    ChatDefaultLanguageSettings,
    ChatLanguageSettings,
    ChatLanguageSettingsSource,
    ChatLanguageSettingsUpdateRequest,
} from "@/types/chat";

export const SYSTEM_DEFAULT_CHAT_LANGUAGE_SETTINGS = {
    originalLanguageCode: "ko",
    translationLanguageCode: "ja",
    showOriginal: true,
    showTranslation: true,
} as const;

export function normalizeLanguageCode(value: string): string {
    return value.trim().toLowerCase();
}

export function normalizeChatLanguageSettingsRequest(
    request: ChatLanguageSettingsUpdateRequest,
): ChatLanguageSettingsUpdateRequest {
    return {
        originalLanguageCode: normalizeLanguageCode(
            request.originalLanguageCode,
        ),
        translationLanguageCode: normalizeLanguageCode(
            request.translationLanguageCode,
        ),
        showOriginal: request.showOriginal,
        showTranslation: request.showTranslation,
    };
}

export function toSystemDefaultChatLanguageSettings(
    userId = 0,
): ChatDefaultLanguageSettings {
    return {
        userId,
        ...SYSTEM_DEFAULT_CHAT_LANGUAGE_SETTINGS,
        source: "SYSTEM",
    };
}

export function withDefaultLanguageSettingsSource(
    settings: ChatDefaultLanguageSettings,
    source: ChatLanguageSettingsSource = "DEFAULT",
): ChatDefaultLanguageSettings {
    return {
        ...settings,
        originalLanguageCode: normalizeLanguageCode(
            settings.originalLanguageCode,
        ),
        translationLanguageCode: normalizeLanguageCode(
            settings.translationLanguageCode,
        ),
        source,
    };
}

export function toRoomScopedLanguageSettings(
    roomId: number,
    defaultSettings: ChatDefaultLanguageSettings | null,
    source: ChatLanguageSettingsSource,
): ChatLanguageSettings {
    return {
        chatRoomId: roomId,
        userId: defaultSettings?.userId ?? 0,
        originalLanguageCode:
            defaultSettings?.originalLanguageCode ??
            SYSTEM_DEFAULT_CHAT_LANGUAGE_SETTINGS.originalLanguageCode,
        translationLanguageCode:
            defaultSettings?.translationLanguageCode ??
            SYSTEM_DEFAULT_CHAT_LANGUAGE_SETTINGS.translationLanguageCode,
        showOriginal:
            defaultSettings?.showOriginal ??
            SYSTEM_DEFAULT_CHAT_LANGUAGE_SETTINGS.showOriginal,
        showTranslation:
            defaultSettings?.showTranslation ??
            SYSTEM_DEFAULT_CHAT_LANGUAGE_SETTINGS.showTranslation,
        roomLanguageSettingApplied: source === "ROOM_OVERRIDE",
        source,
    };
}

export function withRoomLanguageSettingsSource(
    settings: ChatLanguageSettings,
    source: ChatLanguageSettingsSource = "ROOM_OVERRIDE",
): ChatLanguageSettings {
    return {
        ...settings,
        originalLanguageCode: normalizeLanguageCode(
            settings.originalLanguageCode,
        ),
        translationLanguageCode: normalizeLanguageCode(
            settings.translationLanguageCode,
        ),
        roomLanguageSettingApplied: source === "ROOM_OVERRIDE",
        source,
    };
}
