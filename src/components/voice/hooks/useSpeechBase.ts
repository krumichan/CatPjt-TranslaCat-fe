import {voiceService} from "@/services/voiceService";
import {useCallback, useRef, useState} from "react";
import {BasicSpeechProps, SpeechRecognition, SpeechRecognitionEvent} from "@/components/voice/types";
import {TranslationUnit} from "@/types/common";

export const useSpeechBase = ({ groupId, mounted }: BasicSpeechProps) => {
    const [isListening, setIsListening] = useState(false);
    const [japaneseText, setJapaneseText] = useState("");
    const [units, setUnits] = useState<TranslationUnit[]>([]);
    const [error, setError] = useState("");

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const lastSentTextRef = useRef("");
    const processedTextRef = useRef("");
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const registerRecognition = useCallback((recognition: SpeechRecognition) => {
        recognitionRef.current = recognition;
    }, []);

    const resetStatus = useCallback(() => {
        setJapaneseText("");
        processedTextRef.current = "";
        lastSentTextRef.current = "";
    }, []);

    const sendToBackend = useCallback(async (text: string) => {
        if (!text || lastSentTextRef.current === text) return;
        lastSentTextRef.current = text;
        try {
            const unit = await voiceService.translateAndSave(groupId, text);
            if (unit) setUnits(prev => [...prev, unit]);
            setJapaneseText("");
        } catch (err) {
            console.error("Failed to translate:", err);
        }
    }, [groupId]);

    const handleResult = useCallback((event: SpeechRecognitionEvent) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
            fullTranscript += event.results[i][0].transcript;
        }
        setJapaneseText(fullTranscript.slice(processedTextRef.current.length));

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            const transcript = result[0].transcript.trim();

            if (result.isFinal || /[。？！]/.test(transcript)) {
                const newSentence = fullTranscript.slice(processedTextRef.current.length).trim();
                if (newSentence) {
                    sendToBackend(newSentence);
                    processedTextRef.current = fullTranscript.slice(0, processedTextRef.current.length + newSentence.length);
                }
            }
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            const newSentence = fullTranscript.slice(processedTextRef.current.length).trim();
            if (newSentence && newSentence !== lastSentTextRef.current) {
                sendToBackend(newSentence);
                processedTextRef.current = fullTranscript.slice(0, processedTextRef.current.length + newSentence.length);
            }
        }, 1500);
    }, [sendToBackend]);

    return {
        isListening, setIsListening,
        japaneseText, setJapaneseText,
        units, setUnits,
        error, setError,
        recognitionRef, registerRecognition,
        processedTextRef,
        lastSentTextRef, resetStatus,
        handleResult,
        sendToBackend
    };
};