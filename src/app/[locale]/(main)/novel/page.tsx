"use client";

import React, {useEffect, useRef, useState} from "react";
import {Platform} from "@/types/platform";
import {useTranslations} from "next-intl";
import {platformService} from "@/services/platformService";
import {Genre, genreService} from "@/services/genreService";
import {useLocalizedName} from "@/hooks/useLocalizedName";
import SelectionGrid from "@/components/common/SelectionGrid";
import SearchForm from "@/components/common/SearchForm";
import TagCloud from "@/components/common/TagCloud";
import {scrollToTop} from "@/utils/scroll";
import {ROUTES, to} from "@/constants/routes";
import {useAppRouter} from "@/hooks/useAppRouter";

export default function PlatformSelectPage() {
    // 1. Hooks & Router (환경 설정)
    const router = useAppRouter();
    const ln = useLocalizedName();
    const t = useTranslations('Platform');

    // 2. Constants & Derived State (파생 데이터)

    // 3. State Management (상태 관리)
    // 그룹 A: 데이터 상태
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [genres, setGenres] = useState<Genre[]>([]);
    const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);

    // 그룹 B: UI/UX 상태
    const [isLoading, setIsLoading] = useState(true);
    const [isGenreLoading, setIsGenreLoading] = useState(false);

    // 4. Refs (참조) - 상태 아래, 이펙트 위에 배치
    const sectionRef = useRef<HTMLDivElement>(null);
    const topRef = useRef<HTMLDivElement>(null);

    // 5. Interaction Hooks (스크롤 락 등)

    // 6. Side Effects (데이터 패칭 및 스크롤 제어)
    useEffect(() => {
        const fetchPlatforms = async () => {
            try {
                const data = await platformService.getPlatforms();
                setPlatforms(data);
            } catch (error) {
                console.error("Platform fetch error:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPlatforms();
    }, []);

    // 7. Event Handlers
    const handlePlatformSelect = async (platform: Platform) => {
        const isNew = selectedPlatform?.id !== platform.id;
        setSelectedPlatform(platform);

        if (isNew) {
            setIsGenreLoading(true);
            setGenres([]);

            try {
                const data = await genreService.getGenres(platform.code);
                setGenres(data);

                // 잠깐의 렌더링 시간 제공.
                setTimeout(() => {
                    if (sectionRef.current) {
                        sectionRef.current.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    }
                }, 150);
            } catch (error) {
                console.error("Genre fetch error:", error);
            } finally {
                setIsGenreLoading(false);
            }
        }
    };

    const handleSearch = (query: string) => {
        if (!query.trim() || !selectedPlatform) return;

        const code = selectedPlatform.code.toLowerCase();
        router.push(`${to(ROUTES.NOVEL_SEARCH, code)}?keyword=${query}&page=1`);
    };

    return (
        <div ref={topRef} className="flex flex-col items-center justify-start min-h-screen gap-12 py-20 overflow-x-hidden">

            <div className="flex flex-col items-center gap-8 min-h-[60vh] justify-center">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-[#2D2D2D] dark:text-white mb-2">{t('title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('subTitle')}</p>
                </div>

                <SelectionGrid
                    items={platforms.map(p => ({...p, name: ln(p)}))}
                    selectedId={selectedPlatform?.id}
                    onSelect={handlePlatformSelect}
                    isLoading={isLoading}
                />
            </div>

            <div
                ref={sectionRef}
                    className={`w-full max-w-4xl flex flex-col gap-10 items-center py-20 transition-all duration-1000 ${
                    selectedPlatform ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20 pointer-events-none"
                }`}
            >
                {selectedPlatform && (
                    <>
                        <div className="h-px w-full bg-linear-to-r from-transparent via-black/10 dark:via-white/20 to-transparent"/>

                        <SearchForm
                            title={`${ln(selectedPlatform)} ${t('searchSuffix')}`}
                            placeholder={t('searchPlaceholder')}
                            buttonText={t('search')}
                            onSearch={handleSearch}
                        />

                        <TagCloud
                            title={t('genreTitle')}
                            items={genres.map(g => ({...g, name: ln(g)}))}
                            isLoading={isGenreLoading}
                            onItemClick={(genre) => {
                                if (selectedPlatform) {
                                    router.push(to(ROUTES.NOVEL_GENRE, selectedPlatform.code, genre.identifier));
                                }
                            }}
                        />

                        <button
                            onClick={() => {
                                scrollToTop();
                                setTimeout(() => {
                                    setSelectedPlatform(null);
                                    setGenres([]);
                                }, 400);
                            }}
                            className="mt-10 px-6 py-3 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                            ↑ {t('backToTop')}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}