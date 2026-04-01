"use client";

import {useParams} from "next/navigation";
import {useLocalizedName} from "@/hooks/useLocalizedName";
import React, {useEffect, useState} from "react";
import {episodeService} from "@/services/episodeService";
import ReaderPager from "@/components/novel/reader/ReaderPager";
import {scrollToTop} from "@/utils/scroll";
import {useScrollLock} from "@/hooks/useScrollLock";
import OverlayLoader from "@/components/common/loader/OverlayLoader";
import EpisodeHeader from "@/components/novel/episode/EpisodeHeader";
import EpisodeViewer from "@/components/novel/episode/EpisodeViewer";
import {useQuery} from "@/hooks/useQuery";
import FullPageError from "@/components/common/FullPageError";
import {paths} from "@/utils/pathProvider";
import {recentViewService} from "@/services/recentViewService";
import {RECENT_VIEW_TYPE} from "@/types/common";
import {createPortal} from "react-dom";
import {useMenuControl} from "@/hooks/useMenuControl";
import {ROUTES, to} from "@/constants/routes";
import {useAppRouter} from "@/hooks/useAppRouter";

export default function EpisodeDetailPage() {
    // 1. Hooks & Router (환경 설정)
    const params = useParams();
    const router = useAppRouter();
    const ln = useLocalizedName();

    // 2. Constants & Derived State (파생 데이터)
    const platformCode = params.platformCode as string;
    const novelIdentifier = params.identifier as string;
    const episodeIdentifier = params.episodeId as string;

    const { isMenuVisible, portalElement, menuHandlers, containerStyle, mainClassName } = useMenuControl({
        hasBottomBar: true
    });

    // 3. State Management (상태 관리)
    const { data: episodeDetail, isError, isLoading, mutate } = useQuery({
        keys: [platformCode, novelIdentifier, episodeIdentifier] as const,
        fetcher: episodeService.getEpisodeDetail,
    });

    const [fontSize, setFontSize] = useState(() => {
        // 서버 사이드 렌더링(SSR) 중에는 기본값 반환
        if (typeof window === "undefined") return 18;

        const saved = localStorage.getItem("reader_font_size");
        return saved ? parseInt(saved, 10) : 18;
    });

    // 4. Interaction Hooks
    useScrollLock(isLoading);

    // 5. Side Effects (데이터 패칭 및 스크롤 제어)
    useEffect(() => {
        if (episodeDetail) {
            scrollToTop();
        }
    }, [episodeDetail]);

    useEffect(() => {
        if (episodeDetail) {
            recentViewService.saveRecent(
                platformCode,
                RECENT_VIEW_TYPE.EPISODE,
                novelIdentifier,
                episodeIdentifier,
                episodeDetail.title.rawJa,
                episodeDetail.title.ja,
                episodeDetail.title.ko
            ).catch(err => {
                console.error("Failed to save episode view history:", err);
            });
        }
    }, [episodeDetail, episodeIdentifier, novelIdentifier, platformCode]);

    useEffect(() => {
        localStorage.setItem("reader_font_size", fontSize.toString());
    }, [fontSize]);

    // 6. Navigation Handlers
    // [수정] 이전 화로 이동
    const handlePrev = () => {
        const prevId = episodeDetail?.pagerInfo?.prevIdentifier;
        const listId = episodeDetail?.pagerInfo?.listIdentifier;
        if (prevId && listId) {
            router.push(to(ROUTES.EPISODE_VIEWER, platformCode, novelIdentifier, prevId));
        }
    };

    // [수정] 다음 화로 이동
    const handleNext = () => {
        const nextId = episodeDetail?.pagerInfo?.nextIdentifier;
        const listId = episodeDetail?.pagerInfo?.listIdentifier;
        if (nextId && listId) {
            router.push(to(ROUTES.EPISODE_VIEWER, platformCode, listId, nextId));
        }
    };

    // [수정] 목록(소설 상세)으로 이동
    const handleList = () => {
        const listId = episodeDetail?.pagerInfo?.listIdentifier;
        if (listId) {
            // 소설 상세 페이지 경로로 이동!
            router.push(to(ROUTES.NOVEL_DETAIL, platformCode, listId));
        }
    };

    // 실시간 루비 갱신 로직
    const handleRegisterSuccess = (surface: string, reading: string) => {
        if (!episodeDetail) return;

        // mutate를 사용하여 현재 데이터를 직접 수정
        mutate((prev) => {
            if (!prev) {
                return prev;
            }

            // 1. 정규식 패턴 생성 (백엔드 로직 이식)
            // 한자와 한자 사이에 끼어있을 수 있는 루비 태그 조각들을 무시하는 패턴
            let patternString = "";
            for (let i = 0; i < surface.length; i++) {
                // 정규식 특수문자 이스케이프 (Pattern.quote 대응)
                const char = surface[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                patternString += char;

                if (i < surface.length - 1) {
                    patternString += "(?:<rt>.*?</rt></ruby><ruby>|<rt>.*?</rt></ruby>|\\s)*";
                }
            }

            // 앞뒤에 붙어있을 수 있는 ruby 태그까지 포함하여 매칭 (전역 매칭 g 플래그 추가)
            const finalRegex = new RegExp(`(?:<ruby>)?${patternString}(?:<rt>.*?</rt></ruby>)?`, 'g');
            const replacement = `<ruby>${surface}<rt>${reading}</rt></ruby>`;

            // 2. 데이터 변조 시작
            const updatedContents = prev.contents.map(item => {
                // ja 필드에 루비 HTML이 들어있으므로 ja를 집중적으로 교정.
                const correctedJa = item.ja?.replace(finalRegex, replacement);

                return {
                    ...item,
                    ja: correctedJa,
                    // rawJa나 ko는 루비 태그가 없는 순수 텍스트로 그대로 유지.
                };
            });

            return {
                ...prev,
                contents: updatedContents
            };
        }, false);
    };

    if (isError) {
        return (
            <FullPageError
                message="Failed to load episode. Please check your connection."
                onRetry={() => mutate()}
                onListPath={paths.novelDetail(platformCode, novelIdentifier)}
            />
        );
    }

    return (
        <>
            <div
                {...menuHandlers}
                style={containerStyle}
                className="min-h-screen w-full bg-white dark:bg-zinc-950 text-[#2D2D2D] dark:text-zinc-200 transition-colors duration-500"
            >
                {/* 전역 로딩 오버레이 (방금 만든 컴포넌트 활용) */}
                <OverlayLoader isLoading={isLoading} size="lg" containerClassName="fixed inset-0 flex items-center justify-center" />

                <div className="flex flex-col items-center">
                    {!isLoading && episodeDetail && (
                        <main className={mainClassName}>

                            {/* [컴포넌트 1] 에피소드 헤더 */}
                            <EpisodeHeader
                                episodeIdentifier={episodeIdentifier}
                                title={episodeDetail.title}
                                ln={ln}
                            />

                            {/* [컴포넌트 2] 본문 뷰어 */}
                            <EpisodeViewer
                                contents={episodeDetail.contents}
                                fontSize={fontSize}
                                ln={ln}
                            />

                        </main>
                    )}
                </div>
            </div>

            {!isLoading && episodeDetail && portalElement && createPortal(
                <div className={`
                    fixed bottom-0 left-0 w-full z-1
                    transition-transform duration-300
                    ${isMenuVisible ? 'translate-y-0' : 'translate-y-[150%]'} 
                `}>
                    <ReaderPager
                        prevIdentifier={episodeDetail.pagerInfo?.prevIdentifier ?? null}
                        nextIdentifier={episodeDetail.pagerInfo?.nextIdentifier ?? null}
                        isVisible={isMenuVisible}
                        onPrev={handlePrev}
                        onNext={handleNext}
                        onList={handleList}
                        onRegisterSuccess={handleRegisterSuccess}
                        fontSize={fontSize}
                        setFontSize={setFontSize}
                    />
                </div>,
                portalElement
            )}
        </>
    );
}
