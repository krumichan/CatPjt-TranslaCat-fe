export function isVoiceLanguageRejection(errorCode: string | null): boolean {
    return errorCode === "VOICE_AI_UNSUPPORTED_LANGUAGE"
        || errorCode === "VOICE_AI_LANGUAGE_MISMATCH"
        || errorCode === "VOICE_AI_LANGUAGE_UNDETERMINED";
}

export function voiceErrorMessageKey(errorCode: string, stage?: string | null) {
    // 원문은 보존하되 입력 언어 정책과 번역 서버 실패를 서로 다른 안내로 표시한다.
    if (errorCode === "VOICE_AI_UNSUPPORTED_LANGUAGE") return "live.unsupportedLanguage";
    if (errorCode === "VOICE_AI_LANGUAGE_MISMATCH") return "live.languageMismatch";
    if (errorCode === "VOICE_AI_LANGUAGE_UNDETERMINED") return "live.languageFailed";
    if (stage === "LANGUAGE") return "live.languageFailed";

    // 서버 처리 지연·과부하를 마이크나 공유 설정의 문제로 안내하지 않는다.
    if (errorCode === "VOICE_AI_STT_TIMEOUT") return "live.recognitionTimeout";
    if (["VOICE_AI_BACKPRESSURE", "VOICE_BE_BACKPRESSURE", "VOICE_BACKPRESSURE"].includes(errorCode)) {
        return "live.serverBusy";
    }
    if (errorCode === "VOICE_AI_STT_FAILED" || stage === "STT") return "live.recognitionFailed";
    if (["VOICE_AI_INVALID_AUDIO_FRAME", "VOICE_INVALID_AUDIO_FRAME", "VOICE_AI_UNSUPPORTED_AUDIO_FORMAT"].includes(errorCode)) {
        return "live.audioInputFailed";
    }
    if (["VOICE_AI_INTERNAL_ERROR", "VOICE_BE_INTERNAL_ERROR", "VOICE_AI_MODEL_NOT_READY"].includes(errorCode)) {
        return "live.serverFailed";
    }

    // 저장 이력에는 stage가 없으므로 확정된 번역 실패 코드로도 같은 안내를 선택한다.
    if (
        stage === "TRANSLATION"
        || errorCode === "VOICE_AI_TRANSLATION_TIMEOUT"
        || errorCode === "VOICE_AI_TRANSLATION_FAILED"
    ) return "live.translationFailed";
    return "live.processingFailed";
}
