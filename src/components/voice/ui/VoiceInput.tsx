"use client"

import {GeneralTranslation} from "@/types/common";

interface VoiceInputProps {
    isListening: boolean;
    japaneseText: string;
    toggleListening: () => void;
    t: GeneralTranslation;
    disabled?: boolean;
}

export const VoiceInput = ({ isListening, japaneseText, toggleListening, t, disabled = false }: VoiceInputProps) => {
    return (
        <div className="flex flex-col gap-6">
            {/* 버튼 영역 */}
            <div className="flex justify-center">
                <button
                    onClick={toggleListening}
                    disabled={disabled}
                    className={`group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shadow-xl active:scale-95 ${
                        isListening
                            ? 'bg-red-500 text-white shadow-red-500/20'
                            : 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-500'
                    }`}
                >
                    {/* 상태 표시 등 */}
                    <div className={`w-3 h-3 rounded-full ${
                        disabled
                            ? 'bg-zinc-400'
                            : isListening ? 'bg-white animate-ping' : 'bg-white/50'
                    }`} />

                    {/* 텍스트 변경: 로딩 중일 때 별도 메시지를 보여줘도 좋아요 */}
                    {disabled
                        ? 'Engine Loading...'
                        : (isListening ? t('stopListening') : t('startListening'))
                    }
                </button>
            </div>

            {/* 실시간 입력창 */}
            <div className="relative group">
                <div className="absolute -top-3 left-6 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 rounded-full z-10 uppercase tracking-widest border border-zinc-200 dark:border-zinc-700">
                    Live Input
                </div>
                <div className="p-6 bg-zinc-100/50 dark:bg-zinc-800/30 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-4xl min-h-25 flex items-center justify-center transition-all">
                    <p className="text-xl text-center text-zinc-500 dark:text-zinc-400 font-serif italic font-medium">
                        {/* 로딩 중일 때의 텍스트 처리 */}
                        {disabled
                            ? "🐱 " + 'AI 번역사가 잠시 후 도착합니다...'
                            : japaneseText || (isListening ? t('waiting') : t('idle'))
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};