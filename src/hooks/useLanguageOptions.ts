"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import useSWR from "swr";

import { CHAT_LANGUAGE_OPTIONS } from "@/constants/chatLanguages";
import { languageOptions } from "@/features/languageCatalog";
import { languageService } from "@/services/languageService";

export function useLanguageOptions(selectedCodes: readonly string[] = []) {
    const t = useTranslations("Common.languages");
    const locale = useLocale();
    const { status } = useSession();
    const { data } = useSWR(status === "authenticated" ? "service-language-catalog" : null,
        languageService.getLanguages, { revalidateOnFocus: false, errorRetryCount: 1 });

    // DB의 코드·순서를 사용한다. 로딩/장애 중에는 기존 선택지를 유지한다.
    const catalog = data ?? CHAT_LANGUAGE_OPTIONS.map((item) => ({ code: item.code, name: item.label }));
    return languageOptions(catalog, locale, { ko: t("ko"), ja: t("ja"), en: t("en") }, selectedCodes);
}
