import { apiClient } from "@/lib/apiClient";
import { parseReaderSnapshot } from "@/features/novel/readerModel";
import type { NovelAudioPart, NovelLanguage, NovelTransportTiming } from "@/types/novel/reader";
import type { NovelTargetLanguage } from "@/features/novel/translationLanguage";

export class NovelRequestError extends Error {
    constructor(public code: string, public status: number) { super(code); }
}

export async function novelRequest(path: string, signal: AbortSignal, body?: unknown, traceId?: string): Promise<unknown> {
    if (traceId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(traceId)) throw new Error("INVALID_TRACE_ID");
    const request = new AbortController();
    const cancel = () => request.abort();
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    const timer = setTimeout(cancel, 90_000);
    try {
        const started = performance.now();
        const response = await apiClient(path, { signal: request.signal, method: body ? "POST" : "GET", headers: traceId ? { "X-Novel-Trace-Id": traceId } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
        const headersAt = performance.now();
        // 세션 만료의 빈401도 인증 오류로 유지한다. 성공 응답의 잘못된 JSON은 그대로 실패시킨다.
        const envelope = response.ok ? await response.json() : await response.json().catch(() => null);
        if (!response.ok) throw new NovelRequestError(typeof envelope?.body?.code === "string" ? envelope.body.code : `NOVEL_HTTP_${response.status}`, response.status);
        const duration = (header: string) => {
            const value = response.headers.get(header);
            return value !== null && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : undefined;
        };
        // 원문/번역과 다른 기계의 벽시계는 로그에 넣지 않는다. 현재 요청의 독립 duration만 보존한다.
        return envelope.body && typeof envelope.body === "object" ? { ...envelope.body, transport: {
            traceId, requestToHeadersMs: headersAt - started, bodyReadMs: performance.now() - headersAt,
            beDurationMs: duration("X-Novel-Be-Duration-Ms"), beAuthDispatchMs: duration("X-Novel-Be-Auth-Dispatch-Ms"),
            upstreamHeadersMs: duration("X-Novel-Upstream-Headers-Ms"), upstreamDurationMs: duration("X-Novel-Upstream-Duration-Ms"), beValidationMs: duration("X-Novel-Be-Validation-Ms"),
        } } : envelope.body;
    } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", cancel);
    }
}

const request = novelRequest;

export const novelReaderService = {
    async snapshot(base: string, signal: AbortSignal, traceId?: string, targetLanguage: NovelTargetLanguage = "ko") {
        return parseReaderSnapshot(await request(`${base}/reader${targetLanguage === "en" ? "?targetLanguage=en" : ""}`, signal, undefined, traceId), targetLanguage);
    },
    async translate(base: string, revision: string, idempotencyKey: string, retryFailed: boolean, signal: AbortSignal, traceId?: string, targetLanguage: NovelTargetLanguage = "ko") {
        return parseReaderSnapshot(await request(`${base}/translations`, signal, { revision, idempotencyKey, retryFailed, targetLanguage }, traceId), targetLanguage);
    },
    async status(base: string, jobId: string, signal: AbortSignal, traceId?: string, targetLanguage: NovelTargetLanguage = "ko") {
        return parseReaderSnapshot(await request(`${base}/translations/${encodeURIComponent(jobId)}`, signal, undefined, traceId), targetLanguage);
    },
    async repair(base: string, jobId: string, revision: string, idempotencyKey: string, segmentId: string | undefined, signal: AbortSignal, traceId: string, targetLanguage: NovelTargetLanguage = "ko") {
        return parseReaderSnapshot(await request(`${base}/translations/${encodeURIComponent(jobId)}/repair`, signal, { revision, idempotencyKey, ...(segmentId ? { segmentId } : {}) }, traceId), targetLanguage);
    },
    async cancel(base: string, jobId: string, signal: AbortSignal, traceId: string, targetLanguage: NovelTargetLanguage = "ko") {
        return parseReaderSnapshot(await request(`${base}/translations/${encodeURIComponent(jobId)}/cancel`, signal, {}, traceId), targetLanguage);
    },
    async audio(base: string, revision: string, segmentId: string, language: NovelLanguage, partIndex: number, signal: AbortSignal, traceId?: string, targetLanguage: NovelTargetLanguage = "ko"): Promise<NovelAudioPart> {
        if (language !== "ja" && language !== targetLanguage) throw new Error("INVALID_TRANSLATION_TARGET");
        const value = await request(`${base}/audio`, signal, { revision, segmentId, language, partIndex, targetLanguage }, traceId);
        // 음성은 현재 문장/revision과 OpenAI 제공자를 확인한 뒤에만 디코딩한다.
        if (!value || typeof value !== "object") throw new Error("INVALID_AUDIO_CONTRACT");
        const dto = value as Record<string, unknown>;
        if (dto.revision !== revision || dto.segmentId !== segmentId || dto.language !== language || dto.partIndex !== partIndex
            || (dto.targetLanguage !== undefined && dto.targetLanguage !== targetLanguage)
            || !Number.isInteger(dto.partCount) || Number(dto.partCount) < 1 || Number(dto.partCount) > 32 || partIndex >= Number(dto.partCount)
            || typeof dto.provider !== "string" || dto.provider.toLowerCase() !== "openai"
            || typeof dto.contentType !== "string" || !["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3"].includes(dto.contentType)
            || typeof dto.audioBase64 !== "string" || dto.audioBase64.length === 0 || dto.audioBase64.length > 12_000_000) {
            throw new Error("INVALID_AUDIO_CONTRACT");
        }
        const bytes = Uint8Array.from(atob(dto.audioBase64), char => char.charCodeAt(0));
        return { revision, segmentId, language, partIndex, partCount: Number(dto.partCount), blob: new Blob([bytes], { type: String(dto.contentType) }),
            cacheHit: dto.cacheHit === true || dto.cacheDisposition === "HIT", audioPolicyVersion: typeof dto.audioPolicyVersion === "string" ? dto.audioPolicyVersion : undefined,
            transport: dto.transport as NovelTransportTiming };
    },
};
