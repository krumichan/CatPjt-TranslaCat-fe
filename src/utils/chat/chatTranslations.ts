import type {
    ChatLanguageSettings,
    ChatMessageTranslation,
} from "@/types/chat";

const normalizeLanguageCode = (languageCode: string | null | undefined) =>
    languageCode?.trim().toLowerCase() ?? "";

export const getPreferredTranslationLanguageCode = (
    languageSettings: ChatLanguageSettings | null,
    isMine: boolean,
): string | null => {
    if (!languageSettings) {
        return null;
    }

    return isMine
        ? languageSettings.originalLanguageCode
        : languageSettings.translationLanguageCode;
};

export const getPreferredTranslation = (
    translations: ChatMessageTranslation[],
    languageSettings: ChatLanguageSettings | null,
    isMine: boolean,
): ChatMessageTranslation | null => {
    const preferredLanguageCode = getPreferredTranslationLanguageCode(
        languageSettings,
        isMine,
    );

    if (!preferredLanguageCode) {
        return null;
    }

    const normalizedPreferredLanguageCode =
        normalizeLanguageCode(preferredLanguageCode);

    return (
        translations.find(
            (translation) =>
                normalizeLanguageCode(translation.languageCode) ===
                normalizedPreferredLanguageCode,
        ) ?? null
    );
};

export const getVisibleTranslations = (
    translations: ChatMessageTranslation[],
    languageSettings: ChatLanguageSettings | null,
    isMine: boolean,
): ChatMessageTranslation[] => {
    if (!languageSettings) {
        return translations;
    }

    if (!languageSettings.showTranslation) {
        return [];
    }

    const preferredTranslation = getPreferredTranslation(
        translations,
        languageSettings,
        isMine,
    );

    return preferredTranslation ? [preferredTranslation] : [];
};

export const shouldShowOriginalMessageContent = (
    translations: ChatMessageTranslation[],
    languageSettings: ChatLanguageSettings | null,
    isMine: boolean,
): boolean => {
    if (!languageSettings) {
        return true;
    }

    if (languageSettings.showOriginal) {
        return true;
    }

    if (!languageSettings.showTranslation) {
        return true;
    }

    const preferredTranslation = getPreferredTranslation(
        translations,
        languageSettings,
        isMine,
    );

    return (
        !preferredTranslation ||
        preferredTranslation.status !== "COMPLETED" ||
        !preferredTranslation.translatedContent
    );
};