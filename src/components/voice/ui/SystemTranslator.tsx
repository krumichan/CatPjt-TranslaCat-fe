"use client"

import {VoiceInput} from "@/components/voice/ui/VoiceInput";
import {VoiceHistory} from "@/components/voice/ui/VoiceHistory";
import {TranslatorProps} from "@/components/voice/types";
import {useEffect} from "react";
import {useSystemSpeech} from "@/components/voice/hooks/useSystemSpeech";

export const SystemTranslator = ({ groupId, t, ln, scrollRef, history, onUnitAdded }: TranslatorProps) => {
    const { isListening, japaneseText, units, error, toggleListening, isEngineReady, loadingProgress } = useSystemSpeech({
        groupId,
        mounted: true
    });

    useEffect(() => {
        if (units.length > 0) {
            const lastUnit = units[units.length - 1];
            onUnitAdded(lastUnit);
        }
    }, [units, onUnitAdded]);

    return (
        <div className="space-y-4">
            {/* 1. 엔진 로딩 중일 때 보여줄 프로그레스 바 */}
            {!isEngineReady && (
                <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs text-blue-500 font-medium">
                        <span>{loadingProgress > 0 ? `AI 엔진 다운로드 중... ${Math.round(loadingProgress)}%` : '엔진 초기화 중...'}</span>
                        <span className="animate-bounce">🐱</span>
                    </div>
                    <div className="h-2 w-full bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden border border-blue-200/50 dark:border-blue-800/50">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            style={{ width: `${loadingProgress}%` }} // [핵심] 실제 진행률 적용!
                        />
                    </div>
                    <p className="text-[10px] text-zinc-400 text-center">
                        최초 1회만 다운로드하며, 이후에는 캐시되어 빠르게 실행됩니다.
                    </p>
                </div>
            )}

            {/* 2. 에러 메시지 */}
            {error && isEngineReady && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-center text-sm">
                    {error}
                </div>
            )}

            {/* 3. 버튼에 isDisabled 처리 */}
            <VoiceInput
                isListening={isListening}
                japaneseText={japaneseText}
                toggleListening={toggleListening}
                t={t}
                disabled={!isEngineReady} // [추가] 준비 안 되면 클릭 못함!
            />

            <VoiceHistory units={history} scrollRef={scrollRef} ln={ln} emptyMessage={t('emptyHistory')} />
        </div>
    );
};