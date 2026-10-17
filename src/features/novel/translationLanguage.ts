export type NovelTargetLanguage = "ko" | "en";

export interface NovelTranslationValue {
    ko: string | null;
    translatedText?: string | null;
    targetLanguage?: NovelTargetLanguage;
}

export function novelTargetLanguage(value: string | null | undefined): NovelTargetLanguage {
    return value === "en" ? "en" : "ko";
}

export function supportsNovelTranslation(platform: string) {
    // 두 사이트 모두 같은 내장 번역·복구·사전·음성 경로를 사용한다.
    return ["syosetu", "syosyetu", "kakuyomu"].includes(platform.toLowerCase());
}

export function novelTranslation(value: NovelTranslationValue, target: NovelTargetLanguage = "ko") {
    // 언어가 없는 구 응답은 한국어에서만 허용한다. 영어 화면에 ko 필드를 재사용하지 않는다.
    if ((target === "en" && value.targetLanguage !== "en") || (value.targetLanguage && value.targetLanguage !== target)) return null;
    const translated = value.translatedText ?? (target === "ko" ? value.ko : null);
    return translated?.trim() ? translated : null;
}

export function withNovelTarget(path: string, target: NovelTargetLanguage) {
    const [pathname, search = ""] = path.split("?");
    const query = new URLSearchParams(search);
    if (target === "en") query.set("novelTarget", target);
    else query.delete("novelTarget");
    return `${pathname}${query.size ? `?${query}` : ""}`;
}
