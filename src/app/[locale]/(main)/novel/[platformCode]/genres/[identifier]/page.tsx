"use client";

import {useParams, useSearchParams} from "next/navigation";
import {useTranslations} from "next-intl";
import {useLocalizedName} from "@/hooks/useLocalizedName";
import {useEffect, useRef, useState} from "react";
import {rankingService} from "@/services/rankingService";
import {PageNumber} from "@/types/common";
import ListPager from "@/components/common/ListPager";
import CapsuleTab from "@/components/common/CapsuleTab";
import SectionHeader from "@/components/common/SectionHeader";
import NovelList from "@/components/novel/ranking/NovelList";
import {Novel} from "@/types/novel";
import {useQuery} from "@/hooks/useQuery";
import FullPageError from "@/components/common/FullPageError";
import {useSmoothNavigation} from "@/hooks/useSmoothNavigation";
import OverlayLoader from "@/components/common/loader/OverlayLoader";
import OverlayLoaderSection from "@/components/common/loader/OverlayLoaderSection";
import {useAppRouter} from "@/hooks/useAppRouter";
import {ROUTES, to} from "@/constants/routes";
import {Trophy} from "lucide-react";

export default function GenreRankingPage() {
    // 1. Hooks & Router (환경 설정)
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useAppRouter();
    const ln = useLocalizedName();
    const t = useTranslations('Ranking');

    // 2. Constants & Derived State (파생 데이터)
    const platformCode = params.platformCode as string;
    const identifier = params.identifier as string;
    const currentPeriod = searchParams.get("period") || "";
    const currentPage = Number(searchParams.get("page")) || 1;

    // 3. State Management (상태 관리)
    // A: 랭킹 주기(Periods) 조회
    const { data: periods = [], isLoading: isPeriodLoading } = useQuery({
        keys: [platformCode] as const,
        fetcher: (p) => rankingService.getPeriods(p),
    });

    // B: 실제 랭킹 리스트 조회
    const { data: rankingData, isError, isLoading, mutate } = useQuery({
        keys: [platformCode, currentPeriod, identifier, currentPage] as const,
        fetcher: (p, pr, id, pg) => rankingService.getRankingNovels(p, pr as string, id, pg as number),
        enabled: !!currentPeriod && !!identifier
    });

    // C: State Sync
    const [cachedNovels, setCachedNovels] = useState<Novel[] | null>(null);
    const [cachedPageInfo, setCachedPageInfo] = useState<PageNumber | null>(null);

    if (rankingData && rankingData.rankings !== cachedNovels) {
        setCachedNovels(rankingData.rankings);
        setCachedPageInfo(rankingData.pageInfo);
    }

    const displayNovels = rankingData?.rankings || cachedNovels || [];
    const displayPageInfo = rankingData?.pageInfo || cachedPageInfo;

    // D: URL 변경 감지
    const prevParamsRef = useRef({ currentPeriod, currentPage });

    // 4. Interaction Hooks (스크롤 락 등)
    const { navigateWithScroll } = useSmoothNavigation();

    // 5. Side Effects (데이터 패칭 및 스크롤 제어)
    useEffect(() => {
        if (!isPeriodLoading && periods.length > 0 && !currentPeriod) {
            router.replace(`${to(ROUTES.NOVEL_GENRE, platformCode, identifier)}?period=${periods[0].code}`);
        }
    }, [isPeriodLoading, periods, currentPeriod, platformCode, identifier, router]);

    useEffect(() => {
        // currentPeriod 주입이 안되었으면 대기.
        if (!identifier || !currentPeriod) {
            return;
        }

        const fetchRanking = async () => {
            if (prevParamsRef.current.currentPeriod !== currentPeriod ||
                prevParamsRef.current.currentPage !== currentPage) {

                await navigateWithScroll("ranking-list");

                prevParamsRef.current = { currentPeriod, currentPage };
            }
        };

        fetchRanking();
    }, [currentPeriod, currentPage, navigateWithScroll]);

    // 6. Navigation Handlers
    const handlePeriodChange = (newPeriod: string) => {
        router.push(`${to(ROUTES.NOVEL_GENRE, platformCode, identifier)}?period=${newPeriod}&page=1`);
    };

    const handlePageChange = (newPage: number) => {
        router.push(`${to(ROUTES.NOVEL_GENRE, platformCode, identifier)}?period=${currentPeriod}&page=${newPage}`);
    };

    // 7. Error & Loading UI
    if (isError) {
        return (
            <FullPageError
                message="failed to load ranking list."
                onRetry={() => mutate()}
                onListPath="/"
            />
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 pt-24 pb-10 flex flex-col gap-8">

            {/* 1. 소설 랭킹 표시 주기 - (일간, 주간 등) */}
            <SectionHeader
                title={t('title')}
                icon={<Trophy className="w-6 h-6 text-yellow-500" />}
            >
                <CapsuleTab
                    options={periods}
                    activeValue={currentPeriod}
                    onChange={handlePeriodChange}
                    isLoading={isPeriodLoading}
                />
            </SectionHeader>

            <section id="ranking-list" className="relative min-h-100">

                <OverlayLoader isLoading={isLoading} blur={true} size="lg" />

                <OverlayLoaderSection isLoading={isLoading}>
                    {displayNovels.length > 0 && (
                        <>
                            {/* 2. 소설 랭킹 리스트 */}
                            <NovelList
                                novels={displayNovels}
                                platformCode={platformCode}
                                ln={ln}
                                showRank={true}
                            />

                            {/* 3. 소설 페이징 네비게이션 (하단 고정 대신 리스트 끝에 배치) */}
                            {displayPageInfo && (
                                <ListPager
                                    pageInfo={displayPageInfo}
                                    currentPage={currentPage}
                                    onPageChange={handlePageChange}
                                />
                            )}
                        </>
                    )}
                </OverlayLoaderSection>

            </section>

        </div>
    );
}