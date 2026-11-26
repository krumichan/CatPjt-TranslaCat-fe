"use client";

import type { ImageAttribution } from "@/features/image-translation/model";

/** 원본 저작자와 라이선스 정보를 준비 및 읽기 화면에 표시한다. */
export function ImageTranslationAttribution({ value }: { value: ImageAttribution }) {
    return (
        <footer data-testid="image-translation-attribution" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
            <a className="underline" href={value.sourceURL} rel="noreferrer" target="_blank">{value.title}</a>
            <span>· {value.creator}</span>
            <a className="underline" href={value.licenseURL} rel="noreferrer" target="_blank">{value.licenseName}</a>
            {value.changes && <span>· {value.changes}</span>}
        </footer>
    );
}
