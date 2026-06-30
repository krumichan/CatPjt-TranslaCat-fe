import type {
    ChatLanguageSettings,
    ChatMessageTranslation,
} from "@/types/chat";

const normalizeLanguageCode = (languageCode: string | null | undefined) =>
    languageCode?.trim().toLowerCase() ?? "";

export const getPreferredTranslationLanguageCode = (
    languageSettings: ChatLanguageSettings | null,
): string | null => {
    if (!languageSettings) {
        return null;
    }

    /*
     * 기존 로직은 내 메시지일 때 originalLanguageCode를 우선했다.
     * 하지만 실제 번역 레코드는 "내가 쓴 원문 → 상대 언어"로 생성되므로,
     * 예: KO → JA 설정에서 내가 한국어로 보낸 메시지의 translation.languageCode는 "ja"가 된다.
     *
     * 따라서 화면에 표시할 번역은 기본적으로 translationLanguageCode를 우선한다.
     */
    return (
        normalizeLanguageCode(languageSettings.translationLanguageCode) ||
        normalizeLanguageCode(languageSettings.originalLanguageCode) ||
        null
    );
};

export const getPreferredTranslation = (
    translations: ChatMessageTranslation[],
    languageSettings: ChatLanguageSettings | null,
): ChatMessageTranslation | null => {
    if (translations.length === 0) {
        return null;
    }

    const preferredLanguageCode =
        getPreferredTranslationLanguageCode(languageSettings);

    if (!preferredLanguageCode) {
        return translations[0];
    }

    const normalizedPreferredLanguageCode =
        normalizeLanguageCode(preferredLanguageCode);

    return (
        translations.find(
            (translation) =>
                normalizeLanguageCode(translation.languageCode) ===
                normalizedPreferredLanguageCode,
        ) ??
        translations[0] ??
        null
    );
};

export const getVisibleTranslations = (
    translations: ChatMessageTranslation[],
    languageSettings: ChatLanguageSettings | null,
): ChatMessageTranslation[] => {
    if (translations.length === 0) {
        return [];
    }

    if (languageSettings && !languageSettings.showTranslation) {
        return [];
    }

    const preferredTranslation = getPreferredTranslation(
        translations,
        languageSettings,
    );

    return preferredTranslation ? [preferredTranslation] : [];
};

export const shouldShowOriginalMessageContent = (
    translations: ChatMessageTranslation[],
    languageSettings: ChatLanguageSettings | null,
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
    );

    return (
        !preferredTranslation ||
        preferredTranslation.status !== "COMPLETED" ||
        !preferredTranslation.translatedContent
    );
};
