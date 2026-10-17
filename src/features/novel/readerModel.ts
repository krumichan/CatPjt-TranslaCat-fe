import type { NovelLanguage, NovelSegment, ReaderSnapshot, ReadingMode } from "@/types/novel/reader";
import { novelTranslation, type NovelTargetLanguage } from "@/features/novel/translationLanguage";

const states = new Set(["SOURCE_READY", "QUEUED", "RUNNING", "PARTIAL", "SUCCEEDED", "FAILED", "CANCELLED"]);
const identifier = /^[a-zA-Z0-9_-]{1,160}$/;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.length <= 100_000;
const identity = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 256;
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

export function episodeBasePath(platform: string, novel: string, episode?: string | null) {
    if (!identifier.test(platform) || !identifier.test(novel) || (episode && !identifier.test(episode))) {
        throw new Error("INVALID_EPISODE_ID");
    }
    return `/${platform.toLowerCase()}/${novel}/episodes${episode && episode !== "0" ? `/${episode}` : ""}`;
}

export function novelReaderBasePath(platform: string, novel: string, episode?: string | null) {
    // 카쿠요무는 단편에도 고유 회차 ID가 있다. 생략된 ID를 소설가가 되자의 short 경로로 바꾸지 않는다.
    if (platform.toLowerCase() === "kakuyomu" && (!episode || episode === "0" || episode === "short")) {
        throw new Error("INVALID_EPISODE_ID");
    }

    // 기존 단편 GET의 생략 경로와 새 reader의 명시적인 회차 경로를 구분한다.
    return episodeBasePath(platform, novel, !episode || episode === "0" ? "short" : episode);
}

export function parseFontSize(value: string | null): number {
    if (!value || !/^\d+$/.test(value)) return 18;
    return Math.max(12, Math.min(32, Number(value)));
}

export function parseReaderSnapshot(value: unknown, expectedTarget?: NovelTargetLanguage): ReaderSnapshot {
    // 계약에서 검증한 문장만 표시한다. 배열 인덱스로 누락 ID를 보충하지 않는다.
    if (!record(value) || !identity(value.revision) || !identity(value.segmentationVersion)
        || !record(value.title) || !text(value.title.rawJa) || !text(value.title.ja)
        || !(value.title.ko === null || text(value.title.ko))
        || !Array.isArray(value.segments) || value.segments.length > 3000
        || !integer(value.totalSegments) || !integer(value.completedSegments)
        || !integer(value.eventSequence) || typeof value.durableComplete !== "boolean"
        || typeof value.state !== "string" || !states.has(value.state) || !(value.jobId === null || identity(value.jobId))) {
        throw new Error("INVALID_READER_CONTRACT");
    }
    // 무언어 구 계약은 ko만 의미한다. 다른 언어 작업의 완료·복구 상태는 수용하지 않는다.
    const target = value.targetLanguage ?? "ko";
    if (!["ko", "en"].includes(String(target)) || (expectedTarget && target !== expectedTarget)
        || (value.title.translatedText !== undefined && value.title.translatedText !== null && !text(value.title.translatedText))
        || (target === "en" && value.title.ko !== null)) throw new Error("INVALID_TRANSLATION_TARGET");
    const ids = new Set<string>();
    for (const field of ["traceId", "runTraceId", "policyVersion", "glossaryVersion", "audioPolicyVersion"]) {
        if (value[field] !== undefined && value[field] !== null && !identity(value[field])) throw new Error("INVALID_READER_METADATA");
    }
    let completed = 0;
    let sourceLength = 0;
    for (const [index, item] of value.segments.entries()) {
        if (!record(item) || !identity(item.id) || ids.has(item.id) || !identity(item.paragraphId)
            || item.order !== index || !integer(item.paragraphIndex) || !integer(item.startOffset)
            || !integer(item.endOffset) || item.endOffset < item.startOffset
            || !text(item.rawJa) || !text(item.plainJa) || !(item.ko === null || text(item.ko))
            || typeof item.status !== "string" || !["PENDING", "SUCCEEDED", "FAILED"].includes(item.status)
            || !(item.errorCode === null || identity(item.errorCode))) throw new Error("INVALID_SEGMENT_CONTRACT");
        if ((item.translatedText !== undefined && item.translatedText !== null && !text(item.translatedText))
            || (item.targetLanguage !== undefined && item.targetLanguage !== target)
            || (target === "en" && item.ko !== null)) throw new Error("INVALID_TRANSLATION_TARGET");
        ids.add(item.id);
        sourceLength += item.rawJa.length;
        if (item.status === "SUCCEEDED") {
            const translated = novelTranslation({ ...item, targetLanguage: target } as unknown as NovelSegment, target as NovelTargetLanguage);
            if (item.plainJa.trim() && !translated) throw new Error("EMPTY_TRANSLATION");
            completed += 1;
        }
        if (item.rubyTokens !== undefined) {
            if (!Array.isArray(item.rubyTokens) || item.rubyTokens.length > 5000) throw new Error("INVALID_RUBY_TOKENS");
            let offset = 0;
            for (const token of item.rubyTokens) {
                if (!record(token) || !integer(token.startOffset) || !integer(token.endOffset)
                    || token.startOffset < offset || token.endOffset <= token.startOffset || token.endOffset > item.plainJa.length
                    || !text(token.text) || typeof token.reading !== "string" || token.reading.length < 1 || token.reading.length > 500
                    || item.plainJa.slice(token.startOffset, token.endOffset) !== token.text) throw new Error("INVALID_RUBY_TOKENS");
                offset = token.endOffset;
            }
        }
    }
    if (sourceLength > 100_000 || value.totalSegments !== ids.size || value.completedSegments !== completed
        || (value.state === "SUCCEEDED" && (completed !== ids.size || ids.size === 0))
        || (value.durableComplete && value.state !== "SUCCEEDED")) throw new Error("INVALID_COMPLETION");

    // 공개 이동 경로는 플랫폼/작품 식별자로만 만든다. 외부 indexUrl을 직접 열지 않는다.
    if (value.pagerInfo !== null) {
        const pager = value.pagerInfo;
        if (!record(pager) || !identity(pager.listIdentifier)
            || !(pager.prevIdentifier === null || identity(pager.prevIdentifier))
            || !(pager.nextIdentifier === null || identity(pager.nextIdentifier))) throw new Error("INVALID_PAGER");
    }
    // 복구 commit 목록은 같은 canonical 집합의 실제 성공 문장에만 대응해야 한다.
    if (value.recovery !== undefined && value.recovery !== null) {
        const recovery = value.recovery;
        if (!record(recovery) || !identity(recovery.repairId) || !identity(recovery.traceId)
            || typeof recovery.state !== "string" || !states.has(recovery.state)
            || !Array.isArray(recovery.targetIds) || !Array.isArray(recovery.committedIds)
            || new Set(recovery.targetIds).size !== recovery.targetIds.length || new Set(recovery.committedIds).size !== recovery.committedIds.length
            || !recovery.targetIds.every(id => typeof id === "string" && ids.has(id))
            || !recovery.committedIds.every(id => recovery.targetIds instanceof Array && recovery.targetIds.includes(id)
                && value.segments instanceof Array && value.segments.some(item => item.id === id && item.status === "SUCCEEDED"))) throw new Error("INVALID_RECOVERY_CONTRACT");
    }
    return { ...value, targetLanguage: target, title: { ...value.title, targetLanguage: target },
        segments: value.segments.map(item => ({ ...item, targetLanguage: target })) } as unknown as ReaderSnapshot;
}

export function acceptSnapshot(current: ReaderSnapshot, next: ReaderSnapshot, newJob = false): boolean {
    // 같은 revision도 문장 집합이나 원문이 달라지면 버그/오래된 응답으로 취급한다.
    return current.revision === next.revision && current.segmentationVersion === next.segmentationVersion
        && (current.targetLanguage ?? "ko") === (next.targetLanguage ?? "ko")
        && current.policyVersion === next.policyVersion && current.glossaryVersion === next.glossaryVersion
        && (newJob || !current.jobId || current.jobId === next.jobId)
        && (newJob || next.eventSequence >= current.eventSequence)
        && current.segments.length === next.segments.length
        && current.segments.every((item, index) => {
            const candidate = next.segments[index];
            return item.id === candidate.id && item.rawJa === candidate.rawJa && item.plainJa === candidate.plainJa
                && (item.status !== "SUCCEEDED" || (candidate.status === "SUCCEEDED"
                    && novelTranslation(item, current.targetLanguage) === novelTranslation(candidate, next.targetLanguage)))
                && item.paragraphId === candidate.paragraphId && item.paragraphIndex === candidate.paragraphIndex
                && item.startOffset === candidate.startOffset && item.endOffset === candidate.endOffset;
        });
}

export function planReading(segments: NovelSegment[], mode: ReadingMode, language: NovelLanguage, selectedId?: string,
                            allowReadyPrefix = false): NovelSegment[] {
    const index = mode === "all" ? 0 : segments.findIndex(item => item.id === selectedId);
    if (index < 0) throw new Error("SEGMENT_NOT_FOUND");
    // 빈 문단의 위치/ID는 화면에 보존하고 음성 요청만 생략한다.
    const selected = (mode === "single" ? segments.slice(index, index + 1) : segments.slice(index)).filter(item => item.plainJa.trim());
    if (!selected.length) throw new Error("EMPTY_READING");
    if (language !== "ja") {
        if (allowReadyPrefix && mode !== "single") {
            const end = selected.findIndex(item => item.status !== "SUCCEEDED" || !novelTranslation(item, language));
            const ready = end < 0 ? selected : selected.slice(0, end);
            if (!ready.length) throw new Error("TRANSLATION_NOT_READY");
            return ready;
        }
        if (selected.some(item => item.status !== "SUCCEEDED" || !novelTranslation(item, language))) {
            throw new Error("TRANSLATION_NOT_READY");
        }
    }
    return selected;
}
