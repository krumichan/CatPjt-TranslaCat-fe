"use client"

import {VoiceInput} from "@/components/voice/ui/VoiceInput";
import {VoiceHistory} from "@/components/voice/ui/VoiceHistory";
import {TranslatorProps} from "@/components/voice/types";
import {useMicSpeech} from "@/components/voice/hooks/useMicSpeech";
import {useEffect} from "react";

export const MicTranslator = ({ groupId, t, ln, scrollRef, history, onUnitAdded }: TranslatorProps) => {

    const { isListening, japaneseText, units, error, toggleListening } = useMicSpeech({
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
        <>
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-center text-sm font-medium border border-red-100 dark:border-red-800">
                    {error}
                </div>
            )}

            <VoiceInput isListening={isListening} japaneseText={japaneseText} toggleListening={toggleListening} t={t} />
            <VoiceHistory units={history} scrollRef={scrollRef} ln={ln} emptyMessage={t('emptyHistory')} />
        </>
    );
};