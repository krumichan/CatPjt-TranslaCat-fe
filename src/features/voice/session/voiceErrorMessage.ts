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
    // 저장 이력에는 stage가 없으므로 확정된 번역 실패 코드로도 같은 안내를 선택한다.
    if (
        stage === "TRANSLATION"
        || errorCode === "VOICE_AI_TRANSLATION_TIMEOUT"
        || errorCode === "VOICE_AI_TRANSLATION_FAILED"
    ) return "live.translationFailed";
    return "live.processingFailed";
}
