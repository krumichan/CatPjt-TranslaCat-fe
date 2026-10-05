import { createHash } from "node:crypto";

const snapshotFields = ["revision", "segmentationVersion", "policyVersion", "glossaryVersion", "audioPolicyVersion",
    "traceId", "runTraceId", "state", "jobId", "eventSequence", "totalSegments", "completedSegments", "durableComplete"] as const;
const segmentFields = ["id", "paragraphId", "order", "paragraphIndex", "startOffset", "endOffset", "rawJa", "plainJa", "ko", "status", "errorCode", "rubyTokens"] as const;

function selectFields(value: Record<string, unknown>, fields: readonly string[]) {
    return Object.fromEntries(fields.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
}

function digest(value: unknown) {
    return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

/** 실제 source/status 응답의 성공·부분·실패 번역을 동일한 ID 순서로 보존한다. */
export function qualityPairSnapshot(value: unknown) {
    if (!value || typeof value !== "object") return null;
    const body = value as Record<string, unknown>;
    if (!Array.isArray(body.segments) || body.segments.length > 3000) return null;
    if (body.segments.some(item => !item || typeof item !== "object")) return null;

    // 전체 HTTP body/headers는 저장하지 않는다. 인증값·평가 메모 없이 계약 필드만 복사한다.
    const segments = body.segments.map(item => selectFields(item as Record<string, unknown>, segmentFields));
    const exactSnapshot = { ...selectFields(body, snapshotFields), segments };
    const orderedSegments = [...segments].sort((a, b) => Number(a.order) - Number(b.order));
    const orderedIds = orderedSegments.map(item => item.id);
    const orderedSource = orderedSegments.map(item => selectFields(item, ["id", "paragraphId", "order", "paragraphIndex", "startOffset", "endOffset", "rawJa", "plainJa"]));
    const orderedTranslations = orderedSegments.map(item => selectFields(item, ["id", "ko", "status"]));

    // 해시 직렬화 규칙을 명시한다. 동결 원본의 PowerShell sourceJsonSha256와 혼용하지 않는다.
    return {
        serialization: "ECMAScript JSON.stringify UTF-8; explicit field insertion order; no whitespace",
        snapshotSha256: digest(exactSnapshot), orderedSourceSha256: digest(orderedSource),
        orderedTranslationsSha256: digest(orderedTranslations),
        canonicalIdsSha256: createHash("sha256").update(orderedIds.join("\n"), "utf8").digest("hex"),
        receivedOrderValid: segments.every((item, index) => item.order === index),
        idsUnique: new Set(orderedIds).size === orderedIds.length,
        snapshot: exactSnapshot, orderedSegments,
    };
}
