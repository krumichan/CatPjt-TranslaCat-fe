import { useEffect } from "react";
import {
    IS_SUPPORTED,
    BasicSpeechProps, WindowWithSpeech
} from "../types";
import {useSpeechBase} from "@/components/voice/hooks/useSpeechBase";

export const useMicSpeech = (props: BasicSpeechProps) => {
    const base = useSpeechBase(props);

    useEffect(() => {
        if (!props.mounted || !IS_SUPPORTED) return;
        const SpeechRecognition =
            (window as unknown as WindowWithSpeech).SpeechRecognition ||
            (window as unknown as WindowWithSpeech).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = base.handleResult;
        recognition.onerror = (event) => {
            console.error(event);
            base.setIsListening(false);
        }

        base.registerRecognition(recognition);

        return () => recognition.stop();
    }, [props.mounted, base.handleResult, base]);

    const toggleListening = () => {
        if (base.isListening) {
            base.recognitionRef.current?.stop();
            base.setIsListening(false);
        } else {
            base.setJapaneseText("");
            base.resetStatus();

            base.recognitionRef.current?.start();
            base.setIsListening(true);
        }
    };

    return { ...base, toggleListening };
};
