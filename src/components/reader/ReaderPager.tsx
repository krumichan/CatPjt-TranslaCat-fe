"use client";

import {useState} from "react";
import {BookPlus, List, X} from "lucide-react";
import DictRegistrationModal from "@/components/dictionary/DictRegistrationModal";

interface ReaderPagerProps {
    prevIdentifier: string | null;
    nextIdentifier: string | null;
    isVisible: boolean;
    onPrev: () => void;
    onNext: () => void;
    onList: () => void;
    onRegisterSuccess: (surface: string, reading: string) => void;
    fontSize: number;
    setFontSize: (size: (prev: number) => number) => void;
}

export default function ReaderPager({
    prevIdentifier,
    nextIdentifier,
    isVisible,
    onPrev,
    onNext,
    onList,
    onRegisterSuccess,
    setFontSize
}: ReaderPagerProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [initialSurface, setInitialSurface] = useState("");

    // 메뉴 토글 핸들러
    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    // --- 사전 등록 모달을 위한 상태 ---
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <footer
                className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2.5rem)] max-w-lg transition-all duration-500 ease-in-out ${
                    isVisible
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-32 opacity-0 pointer-events-none'
                }`}
            >
                {/* 위로 펼쳐지는 서브 메뉴 영역 */}
                <div className={`
                    absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48
                    transition-all duration-300 ease-out origin-bottom
                    ${isMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}
                `}>
                    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-4xl shadow-2xl p-2 flex flex-col gap-1">
                        {/* 1. 목록으로 이동 */}
                        <button
                            onClick={() => { onList(); setIsMenuOpen(false); }}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all active:scale-95 group"
                        >
                            <List size={18} className="text-zinc-500 group-hover:text-orange-500 transition-colors" />
                            <span className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300">LIST</span>
                        </button>

                        {/* 구분선 */}
                        <div className="h-px bg-black/5 dark:bg-white/10 mx-3 my-0.5" />

                        {/* 2. 단어장 등록 (Dict Reg.) */}
                        <button
                            onClick={() => {
                                setInitialSurface(window.getSelection()?.toString() || "");
                                setIsModalOpen(true);
                                setIsMenuOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all active:scale-95 group"
                        >
                            <BookPlus size={18} className="text-zinc-500 group-hover:text-orange-500 transition-colors" />
                            <span className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300">Dict Reg.</span>
                        </button>
                    </div>
                </div>

                {/* 메인 바 */}
                <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1.5 flex items-center justify-between gap-1">

                    {/* 이전 화 */}
                    <button
                        disabled={!prevIdentifier}
                        onClick={onPrev}
                        className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-full transition-all group ${
                                prevIdentifier
                                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-md hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-95"
                                    : "bg-zinc-100/50 dark:bg-zinc-800/30 text-zinc-400 opacity-40 cursor-not-allowed"
                        }`}
                    >
                        <span className="text-sm group-hover:-translate-x-0.5 transition-transform">←</span>
                        <span className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400">PREV</span>
                    </button>

                    {/* 중앙: 폰트 & 목록 */}
                    <div
                        className="flex-[2.5] flex items-center bg-black/5 dark:bg-white/10 rounded-full h-11 px-1.5 gap-1"
                    >
                        <button
                            onClick={() => setFontSize(f => Math.max(12, f - 1))}
                            className="w-10 h-9 flex items-center justify-center hover:bg-white dark:hover:bg-zinc-800 rounded-full transition-all text-[10px] font-bold opacity-60 hover:opacity-100"
                        >
                            A-
                        </button>

                        <button
                            onClick={toggleMenu}
                            className={`flex-1 min-w-20 h-9 flex items-center justify-center text-[11px] font-black tracking-[0.15em]
                                rounded-full shadow-sm active:scale-95 transition-all uppercase border ${
                                isMenuOpen
                                    ? "bg-orange-500 text-white border-orange-400"
                                    : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border-black/5"
                            }`}
                        >
                            {/* X 대신 닫기 텍스트나 기호 사용 */}
                            {isMenuOpen ? <X size={16} strokeWidth={3} /> : "OPEN"}
                        </button>

                        <button
                            onClick={() => setFontSize(f => Math.min(32, f + 1))}
                            className="w-10 h-9 flex items-center justify-center hover:bg-white dark:hover:bg-zinc-800 rounded-full transition-all text-sm font-bold opacity-60 hover:opacity-100"
                        >
                            A+
                        </button>
                    </div>

                    {/* 다음 화 */}
                    <button
                        disabled={!nextIdentifier}
                        onClick={onNext}
                        className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-full shadow-lg transition-all group ${
                            nextIdentifier
                                ? "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 opacity-50 cursor-not-allowed"
                        }`}
                    >
                        <span className="text-[10px] font-extrabold tracking-tight">NEXT</span>
                        <span className="text-sm group-hover:translate-x-0.5 transition-transform">→</span>
                    </button>
                </div>
            </footer>

            <DictRegistrationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialSurface={initialSurface}
                onSuccess={(surface, reading) => {
                    onRegisterSuccess(surface, reading);
                    // alert("Is registered!"); // 필요시 유지
                }}
            />

            <div className="h-20"/> {/* 여백 확보 */}
        </>
    );
}