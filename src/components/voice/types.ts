import {GeneralTranslation, TranslationUnit} from "@/types/common";
import React from "react";

export interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

export interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
}

export interface WindowWithSpeech extends Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
}

export const IS_SUPPORTED = typeof window !== 'undefined' &&
    (!!(window as unknown as WindowWithSpeech).SpeechRecognition ||
     !!(window as unknown as WindowWithSpeech).webkitSpeechRecognition);

export interface BasicSpeechProps {
    groupId: string;
    mounted: boolean;
}

export interface TranslatorProps {
    groupId: string;
    t: GeneralTranslation;
    ln: (unit: TranslationUnit) => string;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    history: TranslationUnit[];
    onUnitAdded: (unit: TranslationUnit) => void;
}

