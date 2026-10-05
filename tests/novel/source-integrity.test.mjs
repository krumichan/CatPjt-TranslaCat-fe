import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { assertExecutableManifest, verifyFrozenParagraphs, verifySourceContract } from "../../e2e/support/novel-source-integrity.ts";

const unit = (text, order, paragraphIndex, startOffset) => ({
    rawJa: text, plainJa: text, order, paragraphIndex, startOffset, endOffset: startOffset + text.length,
});

test("frozen paragraph proof permits different segment boundaries but preserves exact source", () => {
    // 준비: 공백/빈 문단/비BMP 문자도 원문과 같은 위치에 남아야 한다.
    const paragraphs = ["😀あ。 い。", "", "引用。続き。"];
    const segments = [unit("😀あ。", 0, 0, 0), unit(" い。", 1, 0, 4), unit("", 2, 1, 0), unit("引用。続き。", 3, 2, 0)];

    // 실행 / 검증: 후보가 인용문을 묶더라도 원문 전체는 변경되지 않는다.
    const proof = verifyFrozenParagraphs(paragraphs, segments);
    assert.equal(proof.verified, true);
    assert.equal(proof.paragraphCount, 3);
    assert.equal(proof.segmentCount, 4);
    assert.equal(proof.rawSourceCodePoints, paragraphs.reduce((sum, text) => sum + [...text].length, 0));
});

test("same-length wrong source, gaps and missing blank paragraphs fail before paid translation", () => {
    // 준비 / 실행 / 검증: 문자열 본문을 오류에 출력하지 않는다.
    assert.throws(() => verifyFrozenParagraphs(["猫だ。"], [unit("犬だ。", 0, 0, 0)]), /FROZEN_SOURCE_MISMATCH/);
    assert.throws(() => verifyFrozenParagraphs(["猫だ。"], [unit("猫だ。", 0, 0, 1)]), /FROZEN_SOURCE_OFFSETS/);
    assert.throws(() => verifyFrozenParagraphs(["猫だ。", ""], [unit("猫だ。", 0, 0, 0)]), /FROZEN_SOURCE_PARAGRAPHS/);
});

test("source contract checks revision, segmentation and ordered canonical IDs before a paid run", () => {
    // 준비: 같은 원문이라도 source/public ID 계약이 다르면 유료 실행 전에 차단한다.
    const ids = ["revision-p0-s0", "revision-p1-s0"];
    const expected = { sourceRevision: "a".repeat(64), segmentationVersion: "ja-boundaries-v1",
        canonicalIdsSha256: createHash("sha256").update(ids.join("\n")).digest("hex"), sourceCodePoints: 3 };
    const actual = { revision: expected.sourceRevision, segmentationVersion: expected.segmentationVersion,
        segments: [{ id: ids[0], plainJa: "猫だ。" }, { id: ids[1], plainJa: "\n " }] };

    // 실행 / 검증: 빈 단위는 가중치0이며 순서/정책/원문 revision 하나라도 다르면 실패한다.
    assert.equal(verifySourceContract(expected, actual).verified, true);
    assert.throws(() => verifySourceContract({ ...expected, sourceRevision: "b".repeat(64) }, actual), /SOURCE_REVISION_MISMATCH/);
    assert.throws(() => verifySourceContract({ ...expected, segmentationVersion: "other-v2" }, actual), /SEGMENTATION_VERSION_MISMATCH/);
    assert.throws(() => verifySourceContract(expected, { ...actual, segments: [...actual.segments].reverse() }), /CANONICAL_IDS_MISMATCH/);
    assert.throws(() => verifySourceContract({ ...expected, sourceCodePoints: 5 }, actual), /ELIGIBLE_SOURCE_MISMATCH/);
});

test("unbound preregistration cannot become an executable benchmark by being passed as a manifest", () => {
    // 준비 / 실행 / 검증: 과거 소규모 manifest와 명시적 최종 binding만 통과시킨다.
    assert.doesNotThrow(() => assertExecutableManifest({ cases: [] }));
    assert.doesNotThrow(() => assertExecutableManifest({ status: "FINAL_BOUND_EXECUTABLE" }));
    assert.throws(() => assertExecutableManifest({ status: "PREREGISTERED_ORDER_ONLY_NOT_YET_EXECUTABLE" }), /MANIFEST_NOT_EXECUTABLE/);
});
