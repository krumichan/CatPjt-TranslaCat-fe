export type VoiceMode = "MIC" | "MEDIA" | "MEETING";
export type VoiceSourceLanguageMode = "AUTO" | "MANUAL";
export type VoiceChannel = "SELF" | "REMOTE";

export type VoiceSessionStatus =
    | "CREATED"
    | "ACTIVE"
    | "DEGRADED"
    | "COMPLETING"
    | "COMPLETED"
    | "FAILED";

export type VoiceChannelStatus =
    | "DISCONNECTED"
    | "CONNECTING"
    | "STREAMING"
    | "BACKPRESSURED"
    | "RECONNECTING"
    | "ERROR";

export type VoiceSegmentStatus =
    | "TRANSCRIBED"
    | "COMPLETED"
    | "TRANSLATION_FAILED"
    | "FAILED";

export type VoiceLanguage = "ko" | "ja" | "en";

export interface VoiceSessionCreateRequest {
    mode: VoiceMode;
    sourceLanguageMode: VoiceSourceLanguageMode;
    targetLanguage: VoiceLanguage;
    saveTranscript: boolean;
    manualSourceLanguages: Partial<Record<VoiceChannel, VoiceLanguage>>;
}

export interface VoiceSessionUpdateRequest {
    title: string | null;
}

export interface VoiceChannelResponse {
    channel: VoiceChannel;
    status: VoiceChannelStatus;
    manualSourceLanguage: string | null;
    lastLockedLanguage: string | null;
    reconnectCount: number;
}

export interface VoiceSessionResponse {
    id: string;
    mode: VoiceMode;
    sourceLanguageMode: VoiceSourceLanguageMode;
    targetLanguage: string;
    saveTranscript: boolean;
    status: VoiceSessionStatus;
    title: string | null;
    processedAudioMs: number;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    channels: VoiceChannelResponse[];
}

export interface VoiceSessionListResponse {
    items: VoiceSessionResponse[];
    nextCursor: string | null;
}

export type VoiceReadingToken = {
    text?: string;
    surface?: string;
    source?: string;
    reading?: string | null;
    ruby?: string | null;
};

export type VoiceReadingTokens = VoiceReadingToken[] | unknown;

export interface VoiceSegmentResponse {
    id: number;
    channel: VoiceChannel;
    utteranceKey: string;
    utteranceSequence: number;
    startedAtOffsetMs: number;
    endedAtOffsetMs: number;
    speechDurationMs: number;
    status: VoiceSegmentStatus;
    detectedLanguage: string | null;
    languageConfidence: number | null;
    lockedLanguage: string | null;
    sourceText: string;
    sourceReadingTokens: VoiceReadingTokens | null;
    targetLanguage: string;
    translatedText: string | null;
    translationSkipped: boolean;
    errorCode: string | null;
    retryCount: number;
    endpointingMs: number | null;
    sttFinalizeMs: number | null;
    translationMs: number | null;
    aiTotalAfterSpeechMs: number | null;
    beRelayAndPersistMs: number | null;
    latency: VoicePublicLatency | null;
}

export interface VoiceSegmentListResponse {
    items: VoiceSegmentResponse[];
    nextCursor: number | null;
}

export interface VoiceWebSocketTicketResponse {
    ticket: string;
    expiresInSeconds: number;
}

export interface VoiceTranslationRetryResponse {
    segment: VoiceSegmentResponse;
}

export type VoicePublicEventType =
    | "STREAM_READY"
    | "SPEECH_STARTED"
    | "TRANSCRIPT_PARTIAL"
    | "TRANSCRIPT_FINAL"
    | "VOICE_PIPELINE_COMPLETED"
    | "VOICE_PIPELINE_FAILED"
    | "NO_SPEECH"
    | "BACKPRESSURE"
    | "STREAM_CLOSED";

export interface VoicePublicError {
    code?: string;
    stage?: string;
    message?: string;
    retryable?: boolean;
}

export interface VoicePublicLatency {
    endpointingMs?: number;
    sttFinalizeMs?: number;
    translationMs?: number;
    aiTotalAfterSpeechMs?: number;
    beRelayAndPersistMs?: number;
    totalAfterSpeechMs?: number;
}

export interface VoicePublicEvent {
    type: VoicePublicEventType;
    eventId?: string;
    sessionId?: string;
    channel?: VoiceChannel;
    utteranceKey?: string;
    utteranceSequence?: number;
    revision?: number;
    sourceText?: string;
    sourceReadingTokens?: VoiceReadingTokens | null;
    detectedLanguage?: string | null;
    languageConfidence?: number | null;
    lockedLanguage?: string | null;
    targetLanguage?: string;
    translatedText?: string | null;
    translationSkipped?: boolean;
    errorCode?: string | null;
    error?: VoicePublicError | null;
    latency?: VoicePublicLatency | null;
    bufferedAudioMs?: number;
    retryAfterMs?: number;
}

export type VoiceClientChannelState = VoiceChannelStatus;

export interface VoiceLiveSegment {
    key: string;
    channel: VoiceChannel;
    utteranceSequence: number;
    sourceText: string;
    sourceReadingTokens: VoiceReadingTokens | null;
    detectedLanguage: string | null;
    translatedText: string | null;
    translationSkipped: boolean;
    errorCode: string | null;
    latency: VoicePublicLatency | null;
    completed: boolean;
}

export interface VoiceLiveState {
    channelStates: Record<VoiceChannel, VoiceClientChannelState>;
    partials: Record<VoiceChannel, string>;
    segments: VoiceLiveSegment[];
}
