import type {
    VoiceChannel,
    VoiceLanguage,
    VoiceMode,
    VoiceSessionCreateRequest,
    VoiceSourceLanguageMode,
} from "@/types/voice";

export type VoiceSessionSetupState = {
    mode: VoiceMode;
    sourceLanguageMode: VoiceSourceLanguageMode;
    targetLanguage: VoiceLanguage;
    saveTranscript: boolean;
    manualSourceLanguages: Partial<Record<VoiceChannel, VoiceLanguage>>;
};

export const DEFAULT_VOICE_SESSION_SETUP: VoiceSessionSetupState = {
    mode: "MIC",
    sourceLanguageMode: "AUTO",
    targetLanguage: "ko",
    saveTranscript: true,
    manualSourceLanguages: {
        SELF: "ja",
        REMOTE: "ja",
    },
};

export function channelsForVoiceMode(mode: VoiceMode): VoiceChannel[] {
    switch (mode) {
        case "MIC":
            return ["SELF"];
        case "MEDIA":
            return ["REMOTE"];
        case "MEETING":
            return ["SELF", "REMOTE"];
    }
}

export function toVoiceSessionCreateRequest(
    setup: VoiceSessionSetupState,
): VoiceSessionCreateRequest {
    const manualSourceLanguages: Partial<Record<VoiceChannel, VoiceLanguage>> = {};

    if (setup.sourceLanguageMode === "MANUAL") {
        for (const channel of channelsForVoiceMode(setup.mode)) {
            const language = setup.manualSourceLanguages[channel];
            if (language) manualSourceLanguages[channel] = language;
        }
    }

    return {
        mode: setup.mode,
        sourceLanguageMode: setup.sourceLanguageMode,
        targetLanguage: setup.targetLanguage,
        saveTranscript: setup.saveTranscript,
        manualSourceLanguages,
    };
}
