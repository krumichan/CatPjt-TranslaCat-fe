"use client";

import NovelLocalizedText from "@/components/novel/NovelLocalizedText";
import type { NovelTextValue } from "@/features/novel/localeText";

export default function NovelBilingualField({ value, locale, showPendingTranslation = false }: {
    value: NovelTextValue;
    locale: string;
    showPendingTranslation?: boolean;
}) {
    if (locale !== "learning") return <NovelLocalizedText value={value} locale={locale} />;

    // 학습 화면에서는 각 언어를 별도 행에 두어 긴 원문 뒤에 한국어 번역이 묻히지 않게 한다.
    const hasTranslation = Boolean(value.ko?.trim());
    return <span className="block min-w-0 space-y-2">
        <span className="block min-w-0">
            <NovelLocalizedText value={value} locale="ja" />
        </span>
        {(hasTranslation || showPendingTranslation) && <span className="block min-w-0 border-t border-slate-200 pt-2 dark:border-zinc-700">
            {hasTranslation
                ? <NovelLocalizedText value={value} locale="ko" />
                : <span lang="ko" className="text-sm font-normal text-slate-500 dark:text-zinc-400">한국어 번역 없음</span>}
        </span>}
    </span>;
}
