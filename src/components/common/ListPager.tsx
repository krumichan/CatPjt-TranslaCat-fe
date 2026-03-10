"use client";

import {PageNumber} from "@/types/common";

interface ListPagerProps {
    pageInfo: PageNumber;
    currentPage: number | null;
    onPageChange: (page: number) => void;
}

export default function ListPager({ pageInfo, currentPage, onPageChange }: ListPagerProps) {
    const activePage = currentPage || pageInfo.currentPage;
    const isFirstPage = activePage === 1 || (pageInfo.firstPage !== null && activePage === pageInfo.firstPage);
    const isLastPage = pageInfo.lastPage !== null && activePage === pageInfo.lastPage;

    return (
        <div className="flex justify-center mt-8 mb-8 px-2"> {/* 좌우 여백 추가 */}
            <nav
                className="flex items-center gap-1 p-1 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 shadow-lg max-w-full overflow-hidden">

                {/* 처음으로: 모바일에서는 너무 좁으면 숨기거나 아이콘만 유지 */}
                {pageInfo.firstPage !== null && !isFirstPage && (
                    <button
                        onClick={() => onPageChange(pageInfo.firstPage!)}
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-zinc-400 shrink-0"
                    >
                        «
                    </button>
                )}

                {/* 이전 버튼: 모바일에서 텍스트 숨김 */}
                {pageInfo.prevPage !== null && (
                    <button
                        onClick={() => onPageChange(pageInfo.prevPage!)}
                        className="w-9 h-9 sm:w-auto sm:px-3 sm:h-10 flex items-center justify-center sm:gap-1.5 rounded-xl font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-300 shrink-0"
                    >
                        <span className="text-lg sm:text-sm">←</span>
                        <span className="text-[9px] uppercase tracking-tighter hidden sm:inline">PREV</span>
                    </button>
                )}

                {/* 페이지 번호 목록: 모바일에서 너무 많으면 스크롤되거나 일부만 보이게 처리 */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-1">
                    {pageInfo.pages && pageInfo.pages.length > 0 ? (
                        pageInfo.pages.map((pageNum) => {
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => onPageChange(pageNum)}
                                    className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-xl font-bold transition-all text-sm sm:text-base ${
                                        pageNum === activePage
                                            ? "bg-blue-600 text-white shadow-md scale-105 z-10"
                                            : "hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400"
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })
                    ) : (
                        <div
                            className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center bg-blue-600 text-white rounded-xl font-black shadow-md">
                            {activePage}
                        </div>
                    )}
                </div>

                {/* 다음 버튼 */}
                {pageInfo.nextPage !== null && (
                    <button
                        onClick={() => onPageChange(pageInfo.nextPage!)}
                        className="w-9 h-9 sm:w-auto sm:px-3 sm:h-10 flex items-center justify-center sm:gap-1.5 rounded-xl font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-300 shrink-0"
                    >
                        <span className="text-[9px] uppercase tracking-tighter hidden sm:inline">NEXT</span>
                        <span className="text-lg sm:text-sm">→</span>
                    </button>
                )}

                {/* 마지막으로 */}
                {pageInfo.lastPage !== null && !isLastPage && (
                    <button
                        onClick={() => onPageChange(pageInfo.lastPage!)}
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-zinc-400 shrink-0"
                    >
                        »
                    </button>
                )}
            </nav>
        </div>
    );
}