import assert from "node:assert/strict";
import test from "node:test";
import { sameReaderPresentation } from "../../src/features/novel/readerMetrics.ts";

const fixture = () => ({ revision: "r1", segmentationVersion: "s1", jobId: "j1", eventSequence: 1, state: "RUNNING", completedSegments: 0, totalSegments: 1, durableComplete: false, title: { ja: "題", rawJa: "題", ko: null }, pagerInfo: null,
    segments: [{ id: "one", rawJa: "猫だ。", plainJa: "猫だ。", ko: null, status: "PENDING", errorCode: null }], audioPolicyVersion: "v1" });
test("unchanged status polling keeps trace diagnostics without repainting the reader", () => {
    // 준비 / 실행 / 검증
    const previous = fixture();
    assert.equal(sameReaderPresentation(previous, { ...fixture(), execution: { jobElapsedMs: 600 } }), true);
    assert.equal(sameReaderPresentation(previous, { ...fixture(), eventSequence: 2 }), false);
    assert.equal(sameReaderPresentation(previous, { ...fixture(), audioPolicyVersion: "v2" }), false);
    assert.equal(sameReaderPresentation(previous, { ...fixture(), segments: [{ ...previous.segments[0], status: "SUCCEEDED", ko: "고양이다." }] }), false);
    assert.equal(sameReaderPresentation(previous, { ...fixture(), durableComplete: true }), false);
});
