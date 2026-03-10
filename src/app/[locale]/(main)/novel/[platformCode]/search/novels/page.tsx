"use client";

import {useParams, useSearchParams} from "next/navigation";
import {useLocalizedName} from "@/hooks/useLocalizedName";
import React, {useEffect, useState} from "react";
import {Novel} from "@/types/novel";
import {PageNumber} from "@/types/common";
import {useRequestDedupe} from "@/hooks/useRequestOnce";
import {searchService} from "@/services/searchService";
import {scrollToTop} from "@/utils/scroll";
import NovelList from "@/components/ranking/NovelList";
import SearchForm from "@/components/common/SearchForm";
import {useTranslations} from "next-intl";
import ListPager from "@/components/common/ListPager";
import SpinLoader from "@/components/common/SpinLoader";
import {useAppRouter} from "@/hooks/useAppRouter";
import {ROUTES, to} from "@/constants/routes";

export default function SearchNovelPage() {
    // 1. Hooks & Router (환경 설정)
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useAppRouter();
    const ln = useLocalizedName();
    const t = useTranslations('Platform');

    // 2. Constants & Derived State (파생 데이터)
    const platformCode = params.platformCode as string;
    const keyword = searchParams.get("keyword") || "";
    const currentPage = Number(searchParams.get("page")) || 1;

    // 3. State Management (상태 관리)
    // 그룹 A: 데이터 상태
    const [novels, setNovels] = useState<Novel[]>([]);
    const [pageInfo, setPageInfo] = useState<PageNumber | null>(null);

    // 그룹 B: UI/UX 상태
    const [isLoading, setIsLoading] = useState(true);

    // 4. Interaction Hooks (스크롤 락 등)
    const { canExecute } = useRequestDedupe();

    // 5. Side Effects (데이터 패칭 등)
    useEffect(() => {
        if (!canExecute([platformCode, keyword, currentPage])) {
            if (keyword.trim() === "") {
                router.push("/");
            }
            return;
        }

        const fetchNovels = async () => {
            setIsLoading(true);
            try {
                const novelSearchDetail =
                    await searchService.getSearchNovels(platformCode, keyword, currentPage);

                setNovels(novelSearchDetail.novels);
                setPageInfo(novelSearchDetail.pageInfo);

                scrollToTop();
            } finally {
                setIsLoading(false);
            }
        }

        fetchNovels();
    }, [platformCode, keyword, currentPage, router, canExecute]);

    const handleSearch = (query: string) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) return;

        router.push(`${to(ROUTES.NOVEL_SEARCH, platformCode)}?keyword=${encodeURIComponent(trimmedQuery)}&page=1`);
    };

    const handlePageChange = (newPage: number) => {
        router.push(`${to(ROUTES.NOVEL_SEARCH, platformCode)}?keyword=${encodeURIComponent(keyword)}&page=${newPage}`);
    };

    return (
        <div className="max-w-5xl mx-auto px-4 pt-24 py-10 flex flex-col gap-8">

            {/* 1. 검색 폼 제공 */}
            <SearchForm
                title=""
                placeholder={t('searchPlaceholder')}
                buttonText={t('search')}
                defaultValue={keyword}
                onSearch={handleSearch}
            />

            <div className="relative min-h-100">

                <SpinLoader isLoading={isLoading} size="lg"/>

                {/* 2. 검색한 소설 리스트 */}
                <NovelList
                    novels={novels}
                    platformCode={platformCode}
                    ln={ln}
                />

                {/* 3. 페이징 */}
                {pageInfo && (
                    <ListPager
                        pageInfo={pageInfo}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>
        </div>
    );
}