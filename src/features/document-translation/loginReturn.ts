import { locales, type Locale } from "@/i18n/config";

import { DOCUMENT_TRANSLATION_PATH, isDocumentJobId } from "./model";

export type DocumentLoginReturn = { locale: Locale; href: string; pathname: string };

/** 문서 제출 경로 또는 UUID 작업 경로만 로그인 복귀 대상으로 허용한다. */
export function parseDocumentLoginPath(pathname: string): DocumentLoginReturn | undefined {
    const [, localeValue, ...segments] = pathname.split("/");
    const locale = locales.find((entry) => entry === localeValue);
    if (!pathname.startsWith("/") || !locale) {
        return undefined;
    }

    const href = "/" + segments.join("/");
    const jobPrefix = DOCUMENT_TRANSLATION_PATH + "/jobs/";
    const isJobPath = href.startsWith(jobPrefix) && isDocumentJobId(href.slice(jobPrefix.length));
    return href === DOCUMENT_TRANSLATION_PATH || isJobPath ? { locale, href, pathname } : undefined;
}

/** 로그인 프록시가 넣은 주소를 동일 원점의 알려진 문서 경로로 제한한다. */
export function parseDocumentLoginReturn(value: string | null, origin: string): DocumentLoginReturn | undefined {
    if (!value || value.startsWith("//") || value.includes("\\")) {
        return undefined;
    }

    try {
        const url = new URL(value, origin);
        if (url.origin !== origin || url.username || url.password || url.search || url.hash) {
            return undefined;
        }
        return parseDocumentLoginPath(url.pathname);
    } catch {
        return undefined;
    }
}
