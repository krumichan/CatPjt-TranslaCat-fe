"use client";

import NovelLocalizedText from "@/components/novel/NovelLocalizedText";
import type { NovelTextValue } from "@/features/novel/localeText";
import { novelTranslation, type NovelTargetLanguage } from "@/features/novel/translationLanguage";

export default function NovelBilingualField({ value, locale, targetLanguage = "ko", showPendingTranslation = false }: {
    value: NovelTextValue;
    locale: string;
    targetLanguage?: NovelTargetLanguage;
    showPendingTranslation?: boolean;
}) {
    if (locale !== "learning") return <NovelLocalizedText value={value} locale={locale} targetLanguage={targetLanguage} />;

    // 원문 행은 target 선택과 무관하게 일본어로 남기고 번역 행만 선택한 언어를 사용한다.
    const hasTranslation = Boolean(novelTranslation(value, targetLanguage));
    return <span className="block min-w-0 space-y-2">
        <span className="block min-w-0">
            <NovelLocalizedText value={value} locale="ja" />
        </span>
        {(hasTranslation || showPendingTranslation) && <span className="block min-w-0 border-t border-slate-200 pt-2 dark:border-zinc-700">
            {hasTranslation
                ? <NovelLocalizedText value={value} locale="ko" targetLanguage={targetLanguage} />
                : <span lang="ko" className="text-sm font-normal text-slate-500 dark:text-zinc-400">{targetLanguage === "en" ? "영어 번역 없음" : "한국어 번역 없음"}</span>}
        </span>}
    </span>;
}
