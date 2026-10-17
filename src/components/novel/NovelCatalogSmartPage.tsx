"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useQuery } from "@/hooks/useQuery";
import { useNovelCatalogController } from "@/hooks/novel/useNovelCatalogController";
import { rankingService } from "@/services/rankingService";
import { ROUTES, to } from "@/constants/routes";
import SearchForm from "@/components/common/SearchForm";
import CapsuleTab from "@/components/common/CapsuleTab";
import ListPager from "@/components/common/ListPager";
import NovelCatalogView from "@/components/novel/NovelCatalogView";
import NovelTranslationLanguageSelect from "@/components/novel/NovelTranslationLanguageSelect";
import { novelTargetLanguage } from "@/features/novel/translationLanguage";
import { novelUiText } from "@/features/novel/uiText";

export default function NovelCatalogSmartPage({ kind }: { kind: "RANKING" | "SEARCH" }) {
    const params = useParams();
    const query = useSearchParams();
    const router = useAppRouter();
    const locale = useLocale();
    const labels = novelUiText(locale);
    const t = useTranslations("Platform");
    const platform = String(params.platformCode);
    const genre = String(params.identifier ?? "");
    const period = (query.get("period") ?? "").toLowerCase();
    const keyword = query.get("keyword") ?? "";
    const page = Math.max(1, Number(query.get("page")) || 1);
    const sort = query.get("sort") === "source" ? "source" : "arrival";
    const targetLanguage = novelTargetLanguage(query.get("novelTarget"));
    // Catalog의 별칭과 달리 기존 기간 API는 PlatformCode의 정식 이름만 받는다.
    const periodPlatform = platform.toLowerCase() === "syosyetu" ? "syosetu" : platform.toLowerCase();
    const { data: periods = [], isLoading: loadingPeriods, mutate: reloadPeriods } = useQuery({ keys: [periodPlatform, "catalog-periods"] as const,
        fetcher: p => rankingService.getPeriods(p), enabled: kind === "RANKING" });
    const periodOptions = periods.map(value => ({ ...value, code: value.code.toLowerCase() }));
    const controller = useNovelCatalogController(platform, { kind, period: kind === "RANKING" ? period : "", genreId: kind === "RANKING" ? genre : "",
        keyword: kind === "SEARCH" ? keyword : "", page, language: targetLanguage === "en" ? "en" : locale === "ja" ? "ja" : "ko" }, kind === "SEARCH" ? !!keyword.trim() : !!period && !!genre);
    const url = kind === "RANKING" ? to(ROUTES.NOVEL_GENRE, platform, genre) : to(ROUTES.NOVEL_SEARCH, platform);
    const navigate = (changes: Record<string, string>) => {
        const next = new URLSearchParams(query.toString());
        for (const [key, value] of Object.entries(changes)) next.set(key, value);
        router.push(`${url}?${next}`);
    };
    useEffect(() => {
        if (kind !== "RANKING" || period || !periods.length) return;
        const next = new URLSearchParams(query.toString()); next.set("period", periods[0].code.toLowerCase());
        router.replace(`${url}?${next}`);
    }, [kind, period, periods, query, router, url]);

    // 카드 이벤트는 스크롤과 focus를 조작하지 않는다. URL 필터/페이지와 원본 페이지 경계는 유지한다.
    return <main className="max-w-5xl mx-auto px-4 pt-24 pb-12 space-y-8">
        <NovelTranslationLanguageSelect locale={locale} value={targetLanguage} onChange={value => navigate({ novelTarget: value })} />
        {kind === "RANKING" ? loadingPeriods || periodOptions.length > 0
            ? <CapsuleTab options={periodOptions} activeValue={period} onChange={value => navigate({ period: value, page: "1" })} isLoading={loadingPeriods} />
            : <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3">
                <span>{labels.periodError}</span>
                <button type="button" onClick={() => void reloadPeriods()} className="rounded border px-3 py-2">
                    {labels.reloadPeriods}
                </button>
            </div>
            : <SearchForm title="" placeholder={t("searchPlaceholder")} buttonText={t("search")} defaultValue={keyword} onSearch={value => { if (value.trim()) navigate({ keyword: value.trim(), page: "1" }); }} />}
        <NovelCatalogView {...controller} platform={platform} locale={locale} targetLanguage={targetLanguage} sort={sort} setSort={value => navigate({ sort: value })} />
        {controller.snapshot?.pageInfo && <ListPager pageInfo={controller.snapshot.pageInfo} currentPage={page} onPageChange={value => navigate({ page: String(value) })} />}
    </main>;
}
