export const locales = ['ko', 'ja', 'learning'] as const;
export type Locale = (typeof locales)[number];

export const localeMetadata: Record<Locale, { name: string; flag: string }> = {
    ko: {
        name: "한국어",
        flag: "🇰🇷"
    },
    ja: {
        name: "日本語",
        flag: "🇯🇵"
    },
    learning: {
        name: "학습 모드",
        flag: "🇯🇵🇰🇷"
    }
};

export const defaultLocale: Locale = 'ko';