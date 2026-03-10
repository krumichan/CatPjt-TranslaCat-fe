"use client";

import { useTranslations } from "next-intl";
import SectionHeader from "@/components/common/SectionHeader";
import { Mic, Monitor, MessageSquareQuote } from "lucide-react";
import SpeechToText from "@/components/voice/SpeechToText";
import {useState} from "react";
import {useLocalizedName} from "@/hooks/useLocalizedName";
import {cn} from "@/lib/utils";

export default function VoicePage() {
    const t = useTranslations('Voice');
    const ln = useLocalizedName();
    const [groupId] = useState(() => crypto.randomUUID());

    // 현재 번역 모드 상태 (mic 또는 system)
    const [mode, setMode] = useState<'mic' | 'system'>('mic');

    return (
        <div className="max-w-5xl mx-auto px-4 pt-28 pb-10 flex flex-col gap-8">
            <SectionHeader
                title={t('title')}
                icon={
                    mode === 'mic'
                        ? <Mic className="w-6 h-6 text-red-500 animate-pulse" />
                        : <Monitor className="w-6 h-6 text-blue-500 animate-pulse" />
                }
            />

            {/* 모드 선택 스위치 */}
            {/*<div className="flex justify-center">*/}
            {/*    <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700">*/}
            {/*        <button*/}
            {/*            onClick={() => setMode('mic')}*/}
            {/*            className={cn(*/}
            {/*                "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium transition-all",*/}
            {/*                mode === 'mic' ? "bg-white dark:bg-zinc-700 shadow-sm text-red-500" : "text-zinc-500"*/}
            {/*            )}*/}
            {/*        >*/}
            {/*            <Mic size={18} />*/}
            {/*            {t('micMode')}*/}
            {/*        </button>*/}
            {/*        <button*/}
            {/*            onClick={() => setMode('system')}*/}
            {/*            className={cn(*/}
            {/*                "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium transition-all",*/}
            {/*                mode === 'system' ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-500" : "text-zinc-500"*/}
            {/*            )}*/}
            {/*        >*/}
            {/*            <Monitor size={18} />*/}
            {/*            {t('systemMode')}*/}
            {/*        </button>*/}
            {/*    </div>*/}
            {/*</div>*/}

            {/* 메인 번역 영역 - mode를 props로 전달 */}
            <div className="w-full">
                <SpeechToText groupId={groupId} t={t} ln={ln} mode={mode} />
            </div>

            <div className="p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-3xl border border-zinc-200 dark:border-zinc-700/50 flex gap-4 items-start shadow-sm">
                <MessageSquareQuote className="text-zinc-400 dark:text-zinc-500 shrink-0" size={24} />
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {mode === 'mic' ? t('micDescription') : t('systemDescription')}
                </p>
            </div>
        </div>
    );
}