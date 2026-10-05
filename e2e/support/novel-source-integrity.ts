import { createHash } from "node:crypto";

interface SourceUnit {
    rawJa: string;
    plainJa: string;
    order: number;
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
}

export interface SourceContract {
    sourceRevision?: string;
    segmentationVersion?: string;
    canonicalIdsSha256?: string;
    sourceCodePoints?: number;
}

export function assertExecutableManifest(manifest: { status?: unknown }) {
    if (typeof manifest.status === "string" && manifest.status.includes("NOT_YET_EXECUTABLE")) {
        throw new Error("MANIFEST_NOT_EXECUTABLE");
    }
}

export function verifySourceContract(expected: SourceContract, actual: {
    revision: string;
    segmentationVersion: string;
    segments: { id: string; plainJa: string }[];
}) {
    // source-only bridge의 확정 revision/분할/ID와 가중치를 비교한다. 원문 내용은 오류에 넣지 않는다.
    if (expected.sourceRevision !== undefined && actual.revision !== expected.sourceRevision) throw new Error("SOURCE_REVISION_MISMATCH");
    if (expected.segmentationVersion !== undefined && actual.segmentationVersion !== expected.segmentationVersion) throw new Error("SEGMENTATION_VERSION_MISMATCH");
    const canonicalIdsSha256 = createHash("sha256").update(actual.segments.map(segment => segment.id).join("\n"), "utf8").digest("hex");
    if (expected.canonicalIdsSha256 !== undefined && canonicalIdsSha256 !== expected.canonicalIdsSha256.toLowerCase()) throw new Error("CANONICAL_IDS_MISMATCH");
    const eligibleSourceCodePoints = actual.segments.reduce((sum, segment) => sum + (segment.plainJa.trim() ? Array.from(segment.plainJa).length : 0), 0);
    if (expected.sourceCodePoints !== undefined && expected.sourceCodePoints !== eligibleSourceCodePoints) throw new Error("ELIGIBLE_SOURCE_MISMATCH");
    return { verified: true, sourceRevision: actual.revision, segmentationVersion: actual.segmentationVersion, canonicalIdsSha256, eligibleSourceCodePoints };
}

export function verifyFrozenParagraphs(expected: string[], segments: SourceUnit[]) {
    if (!Array.isArray(expected) || !expected.length || !expected.every(text => typeof text === "string") || !Array.isArray(segments)) {
        throw new Error("FROZEN_SOURCE_INVALID");
    }
    const actual = Array.from({ length: expected.length }, () => "");
    const present = new Set<number>();
    let lastParagraph = 0;

    // 모든 출력 단위를 paragraph/UTF16 offset 순으로 재구성한다. 분할 정책의 문장 개수는 고정하지 않는다.
    for (const [index, segment] of segments.entries()) {
        const paragraph = segment.paragraphIndex;
        if (segment.order !== index || !Number.isSafeInteger(paragraph) || paragraph < lastParagraph || paragraph >= expected.length) {
            throw new Error("FROZEN_SOURCE_ORDER");
        }
        if (typeof segment.rawJa !== "string" || segment.rawJa !== segment.plainJa) throw new Error("FROZEN_SOURCE_TEXT");
        if (segment.startOffset !== actual[paragraph].length || segment.endOffset !== segment.startOffset + segment.rawJa.length) {
            throw new Error("FROZEN_SOURCE_OFFSETS");
        }
        present.add(paragraph);
        actual[paragraph] += segment.rawJa;
        lastParagraph = paragraph;
    }
    if (present.size !== expected.length) throw new Error("FROZEN_SOURCE_PARAGRAPHS");
    if (actual.some((paragraph, index) => paragraph !== expected[index])) throw new Error("FROZEN_SOURCE_MISMATCH");

    // 본문은 결과/오류 로그에 복사하지 않는다. 원문 JSON 파일 byte hash는 호출자가 별도로 검증한다.
    return {
        verified: true,
        paragraphCount: expected.length,
        segmentCount: segments.length,
        rawSourceCodePoints: expected.reduce((sum, paragraph) => sum + Array.from(paragraph).length, 0),
        paragraphsDigest: createHash("sha256").update(JSON.stringify(expected), "utf8").digest("hex"),
    };
}
