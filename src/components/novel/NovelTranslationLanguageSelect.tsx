"use client";

import type { NovelTargetLanguage } from "@/features/novel/translationLanguage";
import { novelUiText } from "@/features/novel/uiText";

export default function NovelTranslationLanguageSelect({ locale, value, onChange }: {
    locale: string;
    value: NovelTargetLanguage;
    onChange: (value: NovelTargetLanguage) => void;
}) {
    const labels = novelUiText(locale);
    return <label className="flex items-center gap-3 text-sm font-semibold">
        <span>{labels.translationLanguage}</span>
        <select aria-label={labels.translationLanguage} value={value}
            onChange={event => onChange(event.target.value === "en" ? "en" : "ko")}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100">
            <option value="ko">{labels.korean}</option>
            <option value="en">{labels.english}</option>
        </select>
    </label>;
}
