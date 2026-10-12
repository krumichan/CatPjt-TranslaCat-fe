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
    listening: { SELF: false, REMOTE: false },
    partials: {
        SELF: "",
        REMOTE: "",
    },
    partialUtterances: { SELF: null, REMOTE: null },
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
        errorStage: event.error?.stage ?? current?.errorStage ?? null,
        latency: event.latency ?? current?.latency ?? null,
        completed:
            event.type === "VOICE_PIPELINE_COMPLETED" ||
            event.type === "VOICE_PIPELINE_FAILED" ||
            current?.completed === true,
    };

    if (!current) return [...segments, next];
    return segments.map((segment) => (segment.key === key ? next : segment));
}

function clearMatchingPartial(state: VoiceLiveState, event: VoicePublicEvent): VoiceLiveState {
    const channel = event.channel;
    if (!channel) return state;
    const current = state.partialUtterances[channel];
    const key = segmentKey(event);

    // 이전 발화의 번역이 늦게 끝나도 다음 발화의 실시간 원문을 지우지 않는다.
    const matches = !current || (current.key === null && current.sequence === null)
        || (key !== null && current.key === key)
        || (event.utteranceSequence !== undefined && current.sequence !== null
            && event.utteranceSequence >= current.sequence);
    if (!matches) return state;
    return {
        ...state,
        listening: { ...state.listening, [channel]: false },
        partials: { ...state.partials, [channel]: "" },
        partialUtterances: {
            ...state.partialUtterances,
            [channel]: { key, sequence: event.utteranceSequence ?? null },
        },
    };
}

export function voiceLiveReducer(
    state: VoiceLiveState,
    action: VoiceLiveAction,
): VoiceLiveState {
    switch (action.type) {
        case "RESET":
            return INITIAL_VOICE_LIVE_STATE;
        case "CHANNEL_STATE": {
            // 재접속 sequence는 서버에 저장된 마지막 발화부터 이어진다.
            // 이전 연결의 미확정·무음 발화 번호가 새 partial을 차단하지 않게 소유권만 반납한다.
            const newConnection = action.state === "CONNECTING" || action.state === "RECONNECTING";
            const clearListening = newConnection || action.state === "DISCONNECTED" || action.state === "ERROR";
            return {
                ...state,
                listening: clearListening
                    ? { ...state.listening, [action.channel]: false }
                    : state.listening,
                partials: clearListening
                    ? { ...state.partials, [action.channel]: "" }
                    : state.partials,
                partialUtterances: clearListening
                    ? { ...state.partialUtterances, [action.channel]: null }
                    : state.partialUtterances,
                channelStates: {
                    ...state.channelStates,
                    [action.channel]: action.state,
                },
            };
        }
        case "EVENT": {
            const event = action.event;
            const channel = event.channel;

            if ((event.type === "SPEECH_STARTED" || event.type === "TRANSCRIPT_PARTIAL") && channel) {
                const current = state.partialUtterances[channel];
                const key = segmentKey(event);
                // 이미 확정된 문장에 대한 늦은 시작·partial은 새 듣는 중 카드를 만들지 않는다.
                if (key !== null && state.segments.some((segment) => segment.key === key)) {
                    return state;
                }
                if (event.utteranceSequence !== undefined && current?.sequence !== null
                    && current?.sequence !== undefined && event.utteranceSequence < current.sequence) {
                    return state;
                }
                // 같은 발화의 늦은 시작 이벤트가 이미 보이는 임시 원문을 지우지 않게 한다.
                const sameUtterance = current !== null && (
                    (key !== null && current.key === key)
                    || (event.utteranceSequence !== undefined && current.sequence === event.utteranceSequence)
                );
                return {
                    ...state,
                    listening: { ...state.listening, [channel]: true },
                    partials: {
                        ...state.partials,
                        [channel]: event.type === "TRANSCRIPT_PARTIAL"
                            ? event.sourceText ?? ""
                            : sameUtterance ? state.partials[channel] : "",
                    },
                    partialUtterances: {
                        ...state.partialUtterances,
                        [channel]: { key, sequence: event.utteranceSequence ?? null },
                    },
                };
            }

            if (
                event.type === "TRANSCRIPT_FINAL" ||
                event.type === "VOICE_PIPELINE_COMPLETED" ||
                event.type === "VOICE_PIPELINE_FAILED"
            ) {
                return {
                    ...clearMatchingPartial(state, event),
                    segments: upsertSegment(state.segments, event),
                };
            }

            if (event.type === "NO_SPEECH" && channel) {
                return clearMatchingPartial(state, event);
            }

            return state;
        }
    }
}
