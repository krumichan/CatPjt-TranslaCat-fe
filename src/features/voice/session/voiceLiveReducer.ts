import type {
    VoiceChannel,
    VoiceClientChannelState,
    VoiceLiveSegment,
    VoiceLiveState,
    VoicePublicEvent,
} from "@/types/voice";

export type VoiceLiveAction =
    | { type: "RESET" }
    | {
          type: "CHANNEL_STATE";
          channel: VoiceChannel;
          state: VoiceClientChannelState;
      }
    | { type: "EVENT"; event: VoicePublicEvent };

export const INITIAL_VOICE_LIVE_STATE: VoiceLiveState = {
    channelStates: {
        SELF: "DISCONNECTED",
        REMOTE: "DISCONNECTED",
    },
    partials: {
        SELF: "",
        REMOTE: "",
    },
    segments: [],
};

function segmentKey(event: VoicePublicEvent): string | null {
    if (event.utteranceKey) return event.utteranceKey;
    if (event.channel && event.utteranceSequence !== undefined) {
        return `${event.channel}-${event.utteranceSequence}`;
    }
    return null;
}

function upsertSegment(
    segments: VoiceLiveSegment[],
    event: VoicePublicEvent,
): VoiceLiveSegment[] {
    const key = segmentKey(event);
    if (!key || !event.channel) return segments;

    const current = segments.find((segment) => segment.key === key);
    const errorCode = event.error?.code ?? event.errorCode ?? null;
    const next: VoiceLiveSegment = {
        key,
        channel: event.channel,
        utteranceSequence: event.utteranceSequence ?? current?.utteranceSequence ?? 0,
        sourceText: event.sourceText ?? current?.sourceText ?? "",
        sourceReadingTokens:
            event.sourceReadingTokens ?? current?.sourceReadingTokens ?? null,
        detectedLanguage:
            event.detectedLanguage ?? current?.detectedLanguage ?? null,
        translatedText:
            event.translatedText ?? current?.translatedText ?? null,
        translationSkipped:
            event.translationSkipped ?? current?.translationSkipped ?? false,
        errorCode,
        latency: event.latency ?? current?.latency ?? null,
        completed:
            event.type === "VOICE_PIPELINE_COMPLETED" ||
            event.type === "VOICE_PIPELINE_FAILED" ||
            current?.completed === true,
    };

    if (!current) return [...segments, next];
    return segments.map((segment) => (segment.key === key ? next : segment));
}

export function voiceLiveReducer(
    state: VoiceLiveState,
    action: VoiceLiveAction,
): VoiceLiveState {
    switch (action.type) {
        case "RESET":
            return INITIAL_VOICE_LIVE_STATE;
        case "CHANNEL_STATE":
            return {
                ...state,
                channelStates: {
                    ...state.channelStates,
                    [action.channel]: action.state,
                },
            };
        case "EVENT": {
            const event = action.event;
            const channel = event.channel;

            if (event.type === "TRANSCRIPT_PARTIAL" && channel) {
                return {
                    ...state,
                    partials: {
                        ...state.partials,
                        [channel]: event.sourceText ?? "",
                    },
                };
            }

            if (
                event.type === "TRANSCRIPT_FINAL" ||
                event.type === "VOICE_PIPELINE_COMPLETED" ||
                event.type === "VOICE_PIPELINE_FAILED"
            ) {
                return {
                    ...state,
                    partials: channel
                        ? { ...state.partials, [channel]: "" }
                        : state.partials,
                    segments: upsertSegment(state.segments, event),
                };
            }

            if (event.type === "NO_SPEECH" && channel) {
                return {
                    ...state,
                    partials: {
                        ...state.partials,
                        [channel]: "",
                    },
                };
            }

            return state;
        }
    }
}
