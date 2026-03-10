"use client";

import {useParams, useSearchParams} from "next/navigation";
import {useLocalizedName} from "@/hooks/useLocalizedName";
import {useEffect, useRef, useState} from "react";
import {NovelDetail, novelService} from "@/services/novelService";
import SpinLoader from "@/components/common/SpinLoader";
import ListPager from "@/components/common/ListPager";
import {useScrollLock} from "@/hooks/useScrollLock";
import {useSmoothNavigation} from "@/hooks/useSmoothNavigation";
import {NovelHeroCard} from "@/components/novel/NovelHeroCard";
import {EpisodeItem} from "@/components/novel/RawEpisodeItem";
import OverlayLoader from "@/components/common/OverlayLoader";
import {useQuery} from "@/hooks/useQuery";
import FullPageError from "@/components/common/FullPageError";
import {recentViewService} from "@/services/recentViewService";
import {RECENT_VIEW_TYPE} from "@/types/common";
import {useAppRouter} from "@/hooks/useAppRouter";
import {ROUTES, to} from "@/constants/routes";

export default function NovelPage() {
    // 1. Hooks & Router (환경 설정)
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useAppRouter();
    const ln = useLocalizedName();

    // 2. Constants & Derived State (파생 데이터)
    const platformCode = params.platformCode as string;
    const novelIdentifier = params.identifier as string;
    const currentPage = Number(searchParams.get("page")) || 1;

    // 3. State Management (상태 관리)
    // 그룹 A: 데이터 상태
    const { data: novelDetail, isError, isLoading, mutate } = useQuery({
        keys: [platformCode, novelIdentifier, currentPage] as const,
        fetcher: (p, i, page) => novelService.getNovelDetail(p, i, page as number),
    });

    const [cachedNovelInfo, setCachedNovelInfo] = useState<NovelDetail | null>(null);

    // 그룹 B: UI/UX 상태
    const prevPageRef = useRef(currentPage);

    const displayNovelInfo = novelDetail || cachedNovelInfo;
    const currentPageInfo = novelDetail?.pageInfo || cachedNovelInfo?.pageInfo;

    // 4. Interaction Hooks (스크롤 락 등)
    const { navigateWithScroll } = useSmoothNavigation();
    useScrollLock(isLoading && !cachedNovelInfo);

    if (novelDetail && novelDetail !== cachedNovelInfo) {
        // 1페이지거나 아직 캐시가 없을 때만 헤더용으로 저장
        if (!cachedNovelInfo || currentPage === 1) {
            setCachedNovelInfo(novelDetail);
        }
    }

    // 5. Side Effects (데이터 패칭 및 스크롤 제어)
    useEffect(() => {
        if (prevPageRef.current !== currentPage) {
            navigateWithScroll("episode-list");
            // 이동 후 현재 페이지를 다시 저장
            prevPageRef.current = currentPage;
        }
    }, [currentPage, navigateWithScroll]);

    useEffect(() => {
        // 소설 정보가 로드되었을 때 기록 저장 실행
        if (novelDetail) {
            recentViewService.saveRecent(
                platformCode,
                RECENT_VIEW_TYPE.NOVEL,
                novelIdentifier,
                null,
                novelDetail.title.rawJa,
                novelDetail.title.ja,
                novelDetail.title.ko,
            ).catch(err => {
                // 비동기로 처리하되, 실패 시 로그만 남겨서 메인 흐름에 지장이 없게 합니다.
                console.error("Failed to save recent view history:", err);
            });
        }
    }, [novelIdentifier, !!novelDetail]);

    // 6. Event Handlers
    const handlePageChange = (newPage: number) => {
        router.push(`${to(ROUTES.NOVEL_DETAIL, platformCode, novelIdentifier)}?page=${newPage}`);
    };

    // 7. Error & Loading UI
    if (isError) {
        return (
            <FullPageError
                message="failed to load novel information."
                onRetry={() => mutate()}
                onListPath="/"
            />
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 pt-24 py-10 flex flex-col gap-10">

            {/* 1. 상단 카드 영역 */}
            <section className="relative min-h-50">
                <SpinLoader isLoading={isLoading && !displayNovelInfo} size="lg" />
                {displayNovelInfo && <NovelHeroCard novelInfo={displayNovelInfo} ln={ln} />}
            </section>

            {/* 2. 에피소드 리스트 영역 */}
            <section
                id="episode-list"
                className="flex flex-col gap-6 relative min-h-100 scroll-margin-top-[80px]"
            >

                {/* 부분 로딩 인디케이터 */}
                <OverlayLoader isLoading={isLoading || !displayNovelInfo} blur={true} size="lg" />

                {/* 헤더 (타이틀) */}
                <div className="flex items-center justify-between px-4">
                    <h2 className="text-xl font-black text-[#2D2D2D] dark:text-white flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                        Episodes
                    </h2>
                </div>

                {/* 실제 목록 */}
                <div className="grid gap-3">
                    {(novelDetail?.episodes || cachedNovelInfo?.episodes)?.map((episode) => (
                        <EpisodeItem
                            key={episode.identifier}
                            episode={episode}
                            ln={ln}
                            onClick={() => router.push(to(ROUTES.EPISODE_VIEWER, platformCode, novelIdentifier, episode.identifier))}
                        />
                    ))}
                </div>

                {/* 페이징 */}
                {currentPageInfo && (
                    <ListPager
                        pageInfo={currentPageInfo}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                    />
                )}
            </section>
        </div>
    );
}