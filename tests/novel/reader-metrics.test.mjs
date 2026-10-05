import assert from "node:assert/strict";
import test from "node:test";
import { translationProgress, paintedReaderTimings, readerPollingBudget } from "../../src/features/novel/readerMetrics.ts";

const item = (plainJa, done) => ({ plainJa, ko: done ? "번역" : null, status: done ? "SUCCEEDED" : "PENDING" });
test("progress is source codepoint weighted and a later chunk is not a readable prefix", () => {
    // 준비 / 실행: UTF-16 길이가 아닌 Unicode codepoint량을 사용하고 빈 문단을 제외한다.
    const progress = translationProgress([item("😀あ", false), item("  ", true), item("いいううええおお", true)]);
    // 검증: 2개중1개가 아니라 원문10자중8자이며 앞부분은 아직0이다.
    assert.deepEqual(progress, { total: 10, completed: 8, prefix: 0, translatedPrefixChars: 0, ratio: 0.8, prefixRatio: 0 });
});

test("50/90/100 paint and durable observation are separate and preserve prefix history", () => {
    // 준비 / 실행
    const first = { segments: [item("ああ", false), item("いいううええおお", true)], eventSequence: 1, durableComplete: false };
    const partial = paintedReaderTimings({}, first, 100, 7);
    const full = paintedReaderTimings({ ...partial, durableObserved: 190 }, { ...first, eventSequence: 2, segments: [item("ああ", true), item("いいううええおお", true)] }, 200, 5);
    // 검증: 뒤쪽80% 표시를 앞쪽 연속 읽기로 계산하지 않고 commit span도 만들지 않는다.
    assert.equal(partial.translations50, 100);
    assert.equal(partial.translations90, undefined);
    assert.equal(full.translations90, 200);
    assert.equal(full.allTranslations, 200);
    assert.equal(full.durableObserved, 190);
    assert.deepEqual(full.prefixHistory, [{ elapsedMs: 100, sourceCodePoints: 0, ratio: 0 }, { elapsedMs: 200, sourceCodePoints: 10, ratio: 1 }]);
    assert.deepEqual(full.translatedPrefixHistory, [{ elapsedMs: 100, translatedCodePoints: 0 }, { elapsedMs: 200, translatedCodePoints: 4 }]);
});

test("readReady200 uses painted contiguous Korean codepoints without hiding the first sentence", () => {
    const first = paintedReaderTimings({}, { segments: [
        { plainJa: "あ", ko: "가".repeat(100), status: "SUCCEEDED" },
        { plainJa: "い", ko: null, status: "PENDING" },
        { plainJa: "う", ko: "나".repeat(300), status: "SUCCEEDED" },
    ], eventSequence: 1 }, 300, 8);
    assert.equal(first.firstTranslation, 300);
    assert.equal(first.readReady200, undefined);
    assert.equal(first.progress.translatedPrefixChars, 100);
    const second = paintedReaderTimings(first, { segments: [
        { plainJa: "あ", ko: "가".repeat(100), status: "SUCCEEDED" },
        { plainJa: "い", ko: "나".repeat(101), status: "SUCCEEDED" },
        { plainJa: "う", ko: "다".repeat(300), status: "SUCCEEDED" },
    ], eventSequence: 2 }, 700, 7);
    assert.equal(second.readReady200, 700);
    assert.equal(second.translatedPrefixHistory.at(-1).translatedCodePoints, 501);
});

test("server job deadline is bounded and a resumed job does not regain its elapsed budget", () => {
    // 준비 / 실행 / 검증
    assert.equal(readerPollingBudget({ execution: { executionDeadlineMs: 300_000 } }), 310_000);
    assert.equal(readerPollingBudget({ execution: { executionDeadlineMs: 300_000, jobElapsedMs: 120_000 } }, true), 190_000);
    assert.equal(readerPollingBudget({ execution: { executionDeadlineMs: Infinity } }), 120_000);
    assert.equal(readerPollingBudget({ execution: { executionDeadlineMs: 900_000 } }), 120_000);
});

test("document navigation and authenticated reader request have separate monotonic origins", () => {
    // 준비: 인증/hydration 뒤1200ms에 reader가 시작되고200ms 후 원문이 표시됐다.
    const source = { segments: [item("ああ", false)], eventSequence: 0, durableComplete: false };
    const read = paintedReaderTimings({ origin: "reader-entry", originDocumentTimeMs: 1200 }, source, 200, 10);
    const clicked = paintedReaderTimings({ origin: "translation-click", originDocumentTimeMs: 3000, firstSource: 0 }, source, 20, 5);

    // 검증: navigation 지연을 reader 요청 지연 또는 이미 보이는 원문의0ms와 혼동하지 않는다.
    assert.equal(read.firstSource, 200);
    assert.equal(read.documentTimeAtFirstSourceMs, 1400);
    assert.equal(clicked.firstSource, 0);
    assert.equal(clicked.documentTimeAtFirstSourceMs, undefined);
});
