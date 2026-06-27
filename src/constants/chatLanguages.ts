export const CHAT_LANGUAGE_OPTIONS = [
    { code: "ko", label: "한국어 / Korean" },
    { code: "ja", label: "日本語 / Japanese" },
    { code: "en", label: "English" },
] as const;

export type ChatLanguageCode = (typeof CHAT_LANGUAGE_OPTIONS)[number]["code"];