import { novelTranslation, type NovelTargetLanguage } from "@/features/novel/translationLanguage";

export interface NovelTextValue {
    rawJa: string;
    ja: string;
    ko: string | null;
    translatedText?: string | null;
    targetLanguage?: NovelTargetLanguage;
}

export interface NovelDisplayRow {
    language: "ja" | "ko" | "en";
    content: string;
}

export function novelDisplayRows(value: NovelTextValue, locale: string, target: NovelTargetLanguage = "ko"): NovelDisplayRow[] {
    const source = value.ja.trim() ? value.ja : value.rawJa;
    const translation = novelTranslation(value, target);

    // 기존 일본어 UI의 원문 표시는 유지한다. 명시적인 영어 선택은 UI 언어와 독립적이다.
    if ((locale === "ja" && target === "ko") || !translation) return [{ language: "ja", content: source }];
    if (locale === "learning") return [{ language: "ja", content: source }, { language: target, content: translation }];
    return [{ language: target, content: translation }];
}
