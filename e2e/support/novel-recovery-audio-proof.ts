import type { AudioRequestObservation } from "./novel-recovery-media-observer";

export interface SpeechAttempt {
    attempt: number;
    task: string;
    status: string;
    traceId: string;
    requestSha256: string;
    language: string;
    voice: string;
}
interface AudioEntry { segmentId: string; language: string; partIndex: number; textSha256: string }
interface AudioRequest { segmentId: string; language: string; partIndex: number; traceId: string | null }

export function safeSpeechAttempts(value: unknown): SpeechAttempt[] {
    const ledger = value as { calls?: { attempt?: unknown; task?: unknown; status?: unknown; metadata?: Record<string, unknown> }[] };
    if (!Array.isArray(ledger?.calls)) throw new Error("ACTUAL_PROVIDER_LEDGER_REQUIRED");
    // wrapper의 기존 장부에서 허용된 메타데이터만 반환한다. 원문/오디오/인증값은 외부로 전달하지 않는다.
    return ledger.calls.filter(call => call.task === "OPENAI_TTS").map(call => {
        const meta = call.metadata ?? {};
        if (!Number.isSafeInteger(call.attempt) || typeof call.status !== "string" || typeof meta.traceId !== "string"
            || typeof meta.requestSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(meta.requestSha256)
            || !["ja", "ko"].includes(String(meta.language)) || typeof meta.voice !== "string") {
            throw new Error("SPEECH_LEDGER_KEY_REQUIRED");
        }
        return { attempt: Number(call.attempt), task: "OPENAI_TTS", status: call.status, traceId: meta.traceId,
            requestSha256: meta.requestSha256.toLowerCase(), language: String(meta.language), voice: meta.voice };
    });
}

export function verifyPaidAudioKeys(entries: AudioEntry[], requests: AudioRequest[], calls: SpeechAttempt[], traces: string[], requiredSegmentIds: string[] = entries.map(entry => entry.segmentId), voice = "marin") {
    // 서로 다른 문장에 같은 텍스트가 있으면 hash만으로 key를 단정할 수 없으므로 표본 선택을 거부한다.
    const textKeys = entries.map(entry => `${entry.language}|${entry.textSha256}`);
    if (new Set(textKeys).size !== textKeys.length) throw new Error("AMBIGUOUS_AUDIO_TEXT_HASH");
    const scope = calls.filter(call => traces.includes(call.traceId));
    const proofs = entries.map(entry => {
        const matchingRequests = requests.filter(request => request.segmentId === entry.segmentId
            && request.language === entry.language && request.partIndex === entry.partIndex);
        const attempts = scope.filter(call => call.requestSha256 === entry.textSha256 && call.language === entry.language && call.voice === voice);
        // 실재생 필수 문장은 정확히1회다. 선택적 다음 문장이 시작 전에 취소되었다면0을 그대로 기록한다.
        const required = requiredSegmentIds.includes(entry.segmentId);
        if (attempts.length > 1 || (required && attempts.length !== 1) || (!matchingRequests.length && attempts.length !== 0)) {
            throw new Error("AUDIO_PER_KEY_PROVIDER_COUNT_MISMATCH");
        }
        return { segmentId: entry.segmentId, language: entry.language, partIndex: entry.partIndex,
            textSha256: entry.textSha256, requiredForCompletedPlayback: required, browserRequests: matchingRequests.length, providerAttempts: attempts.map(call => call.attempt) };
    });
    if (proofs.reduce((count, item) => count + item.providerAttempts.length, 0) !== scope.length
        || requests.some(request => !entries.some(entry => entry.segmentId === request.segmentId
            && entry.language === request.language && entry.partIndex === request.partIndex))) {
        throw new Error("UNBOUND_AUDIO_PROVIDER_ATTEMPT");
    }
    return proofs;
}

export function verifyAudioRequestPositions(requests: AudioRequestObservation[], orderedSegmentIds: string[]) {
    return requests.map(request => {
        const index = orderedSegmentIds.indexOf(request.segmentId);
        const intent = request.readIntent;
        const head = intent?.mode === "all" ? 0 : orderedSegmentIds.indexOf(intent?.segmentId ?? "");
        if (index < 0 || head < 0 || request.partIndex !== 0 || !intent) throw new Error("AUDIO_REQUEST_WITHOUT_BOUND_INTENT");
        if (intent.mode === "single") {
            if (index !== head) throw new Error("SINGLE_AUDIO_PREFETCH_FORBIDDEN");
            return { atMs: request.atMs, phase: request.phase, segmentId: request.segmentId, kind: "EXPLICIT_SINGLE_CURRENT" };
        }
        const native = request.nativePosition;
        const active = orderedSegmentIds.indexOf(request.activeSegmentId ?? "");
        if (native && !native.paused && !native.ended && Number.isFinite(native.duration) && native.duration > 0) {
            if (request.playbackState !== "playing" || active < head || index !== active + 1
                || native.currentTime < Math.max(0, native.duration - 3)) throw new Error("AUDIO_LOOKAHEAD_POSITION_VIOLATION");
            return { atMs: request.atMs, phase: request.phase, segmentId: request.segmentId,
                currentSegmentId: request.activeSegmentId, kind: "ONE_NEXT_AT_NATIVE_END_WINDOW", nativePosition: native };
        }
        const ended = orderedSegmentIds.indexOf(request.lastEndedSegmentId ?? "");
        if (index !== (ended >= head ? ended + 1 : head)) throw new Error("AUDIO_CURRENT_POSITION_VIOLATION");
        return { atMs: request.atMs, phase: request.phase, segmentId: request.segmentId, kind: "CURRENT_LOAD_AFTER_INTENT_OR_ENDED" };
    });
}

export function verifyNativeEnded(value: { ended?: { trusted: boolean; nativeElement: boolean; phase: string; segmentId: string | null; currentTime: number; duration: number }[] }, phase: string, expectedSegmentIds: string[]) {
    const ended = value.ended?.filter(event => event.phase === phase) ?? [];
    if (ended.length !== expectedSegmentIds.length || ended.some((event, index) => !event.trusted || !event.nativeElement
        || event.segmentId !== expectedSegmentIds[index] || !Number.isFinite(event.duration) || event.duration <= 0
        || Math.abs(event.currentTime - event.duration) > 0.1)) throw new Error("NATIVE_ENDED_SEQUENCE_REQUIRED");
    return ended;
}

