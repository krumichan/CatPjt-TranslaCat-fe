export interface NovelTextValue {
    rawJa: string;
    ja: string;
    ko: string | null;
}

export interface NovelDisplayRow {
    language: "ja" | "ko";
    content: string;
}

export function novelDisplayRows(value: NovelTextValue, locale: string): NovelDisplayRow[] {
    const source = value.ja.trim() ? value.ja : value.rawJa;
    const translation = value.ko?.trim() ? value.ko : null;

    // 언어학습 모드는 항상 원문을 먼저 보여 주고 준비된 한국어를 뒤에 붙인다.
    if (locale === "ja" || !translation) return [{ language: "ja", content: source }];
    if (locale === "learning") return [{ language: "ja", content: source }, { language: "ko", content: translation }];
    return [{ language: "ko", content: translation }];
}
