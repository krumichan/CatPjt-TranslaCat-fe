import type {
    VoiceChannel,
    VoiceClientChannelState,
    VoiceLivePreview,
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
    previews: [],
    closedPreviewKeys: { SELF: [], REMOTE: [] },
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

    const current = segments.find((segment) => segment.channel === event.channel && segment.key === key);
    // 완료된 결과는 늦은 원문 확정이나 중복 이벤트가 덮어쓰지 않는다.
    if (current?.completed) return segments;
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
        translatedText: event.type === "TRANSCRIPT_FINAL" ? null : event.translatedText ?? null,
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
    return segments.map((segment) => (segment.channel === event.channel && segment.key === key ? next : segment));
}

function clearMatchingPartial(state: VoiceLiveState, event: VoicePublicEvent): VoiceLiveState {
    const channel = event.channel;
    if (!channel) return state;
    const current = state.partialUtterances[channel];
    const key = segmentKey(event);

    // 식별자가 없는 무음은 현재의 식별된 발화와 연결하지 않는다.
    // 이전 발화의 확정은 해당 카드만 지우고 다음 발화의 소유권을 보존한다.
    const matches = !current || (current.key === null && current.sequence === null)
        || (key !== null && current.key === key)
        || (event.utteranceSequence !== undefined && current.sequence !== null
            && event.utteranceSequence >= current.sequence);
    const previewKey = key ?? (matches ? current?.key ?? `listening-${channel}` : null);

    // 확정·무음 이후의 임시 응답은 같은 발화를 다시 만들 수 없다.
    const closedPreviewKeys = key !== null && !state.closedPreviewKeys[channel].includes(key)
        ? { ...state.closedPreviewKeys, [channel]: [...state.closedPreviewKeys[channel], key] }
        : state.closedPreviewKeys;
    const clearedPreviews = {
        ...state,
        previews: state.previews.filter((preview) => preview.channel !== channel || preview.key !== previewKey),
        closedPreviewKeys,
    };

    if (!matches) return clearedPreviews;
    return {
        ...clearedPreviews,
        listening: { ...state.listening, [channel]: false },
        partials: { ...state.partials, [channel]: "" },
        partialUtterances: {
            ...state.partialUtterances,
            [channel]: { key, sequence: event.utteranceSequence ?? null },
        },
    };
}

function updatePreview(state: VoiceLiveState, event: VoicePublicEvent): VoiceLiveState {
    const channel = event.channel;
    if (!channel) return state;
    const key = segmentKey(event);
    const previewKey = key ?? `listening-${channel}`;
    const current = state.partialUtterances[channel];
    const previous = state.previews.find((preview) => preview.channel === channel && preview.key === previewKey);

    // 최종 원문부터는 확정 번역 경로가 소유한다. 무음의 늦은 partial도 되살리지 않는다.
    if (key !== null && (state.closedPreviewKeys[channel].includes(key)
        || state.segments.some((segment) => segment.channel === channel && segment.key === key))) {
        return state;
    }
    const olderUtterance = event.utteranceSequence !== undefined && current?.sequence !== null
        && current?.sequence !== undefined && event.utteranceSequence < current.sequence;
    if (olderUtterance && !previous) return state;
    if (event.type === "SPEECH_STARTED" && previous) return state;

    // 임시 이벤트는 누적 스냅샷이다. 늦은 revision과 번역 필드가 빠진 이전 번역을 유지하지 않는다.
    const revision = event.revision ?? null;
    if (event.type === "TRANSCRIPT_PARTIAL" && (
        (revision !== null && (!Number.isInteger(revision) || revision < 1))
        || (previous?.revision !== null && previous?.revision !== undefined
            && (revision === null || revision <= previous.revision))
    )) {
        return state;
    }
    const preview: VoiceLivePreview = {
        key: previewKey,
        channel,
        utteranceSequence: event.utteranceSequence ?? previous?.utteranceSequence ?? null,
        sourceText: event.type === "TRANSCRIPT_PARTIAL" ? event.sourceText ?? "" : "",
        translatedText: event.type === "TRANSCRIPT_PARTIAL" ? event.translatedText ?? null : null,
        revision,
    };
    const previews = previous
        ? state.previews.map((item) => item.channel === channel && item.key === previewKey ? preview : item)
        : [...state.previews, preview];

    // 앞 발화의 느린 임시 번역은 해당 카드만 갱신하며 현재 듣는 발화의 소유권을 바꾸지 않는다.
    if (olderUtterance) return { ...state, previews };
    return {
        ...state,
        previews,
        listening: { ...state.listening, [channel]: true },
        partials: { ...state.partials, [channel]: preview.sourceText },
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
                previews: clearListening
                    ? state.previews.filter((preview) => preview.channel !== action.channel)
                    : state.previews,
                closedPreviewKeys: newConnection
                    ? { ...state.closedPreviewKeys, [action.channel]: [] }
                    : state.closedPreviewKeys,
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
                return updatePreview(state, event);
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
