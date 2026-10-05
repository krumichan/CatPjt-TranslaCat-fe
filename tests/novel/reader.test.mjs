import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseReaderSnapshot, acceptSnapshot, parseFontSize, episodeBasePath, novelReaderBasePath, planReading } from "../../src/features/novel/readerModel.ts";
import { parseRuby, rubyPlainText } from "../../src/features/common/ruby.ts";

const segment = (id, order) => ({ id, order, paragraphId: `p${order}`, paragraphIndex: order, startOffset: 0, endOffset: 3, rawJa: "猫だ。", plainJa: "猫だ。", ko: "고양이다.", status: "SUCCEEDED", errorCode: null });
const fixture = () => ({ revision: "rev1", segmentationVersion: "v1", title: { rawJa: "題", ja: "題", ko: null }, pagerInfo: null, segments: [segment("a", 0), segment("b", 1)], totalSegments: 2, completedSegments: 2, state: "SUCCEEDED", jobId: "job1", eventSequence: 2, durableComplete: true });

test("ruby readings honor the source service's bounded 500-character contract", () => {
    // 준비: provider 출력이 아니라 source parser가 허용하는 구조화된 루비다.
    const value = fixture();
    value.segments[0].rubyTokens = [{ startOffset: 0, endOffset: 1, text: "猫", reading: "ね".repeat(300) }];

    // 실행 / 검증: 문장 ID 상한256을 reading에 적용하지 않고 source 상한500을 지킨다.
    assert.equal(parseReaderSnapshot(value).segments[0].rubyTokens[0].reading.length, 300);
    value.segments[0].rubyTokens[0].reading = "ね".repeat(501);
    assert.throws(() => parseReaderSnapshot(value), /INVALID_RUBY_TOKENS/);
});

test("reader DTO rejects missing/duplicate IDs, wrong counts/types/order and false completion", () => {
    // 준비 / 실행 / 검증: 동일 문자열이어도 서버가 부여한 위치 ID가 유일해야 한다.
    const value = fixture();
    assert.deepEqual(parseReaderSnapshot(value).segments.map(s => s.id), ["a", "b"]);
    for (const changed of [
        { ...value, segments: [segment("a", 0), segment("a", 1)] },
        { ...value, totalSegments: 3 },
        { ...value, segments: [segment("a", 1), segment("b", 0)] },
        { ...value, segments: [{ ...segment("a", 0), ko: {} }, segment("b", 1)] },
        { ...value, segments: [{ ...segment("a", 0), status: "FAILED", ko: null }, segment("b", 1)] },
    ]) assert.throws(() => parseReaderSnapshot(changed));
});

test("late revision/job/sequence and changed IDs cannot overwrite displayed source", () => {
    // 준비
    const current = parseReaderSnapshot(fixture());
    // 실행 / 검증
    assert.equal(acceptSnapshot(current, { ...current, revision: "old" }), false);
    assert.equal(acceptSnapshot(current, { ...current, eventSequence: 1 }), false);
    assert.equal(acceptSnapshot(current, { ...current, jobId: "other" }), false);
    assert.equal(acceptSnapshot(current, { ...current, segments: [segment("c", 0), segment("b", 1)] }), false);
    assert.equal(acceptSnapshot(current, { ...current, eventSequence: 3 }), true);
});

test("reading plans preserve order and never substitute Japanese for missing Korean", () => {
    // 준비
    const snapshot = parseReaderSnapshot(fixture());
    // 실행 / 검증
    assert.deepEqual(planReading(snapshot.segments, "all", "ko").map(s => s.id), ["a", "b"]);
    assert.deepEqual(planReading(snapshot.segments, "single", "ko", "b").map(s => s.id), ["b"]);
    assert.deepEqual(planReading(snapshot.segments, "from", "ja", "b").map(s => s.id), ["b"]);
    assert.throws(() => planReading([{ ...snapshot.segments[0], ko: null, status: "FAILED" }], "all", "ko"));
});

test("ongoing Korean reading uses only the contiguous completed prefix", () => {
    const snapshot = parseReaderSnapshot(fixture());
    const pending = { ...snapshot.segments[1], ko: null, status: "PENDING" };
    assert.deepEqual(planReading([snapshot.segments[0], pending], "all", "ko", undefined, true).map(s => s.id), ["a"]);
    assert.throws(() => planReading([pending, snapshot.segments[0]], "all", "ko", undefined, true), /TRANSLATION_NOT_READY/);
    assert.throws(() => planReading([snapshot.segments[0], pending], "single", "ko", pending.id, true), /TRANSLATION_NOT_READY/);
});

test("reader settings and absent episode IDs are bounded", () => {
    // 실행 / 검증
    assert.equal(parseFontSize("NaN"), 18);
    assert.equal(parseFontSize("22px"), 18);
    assert.equal(parseFontSize("999"), 32);
    assert.equal(parseFontSize("0"), 12);
    assert.equal(episodeBasePath("syosyetu", "n1", undefined), "/syosyetu/n1/episodes");
    assert.equal(novelReaderBasePath("syosyetu", "n1", "0"), "/syosyetu/n1/episodes/short");
    assert.equal(novelReaderBasePath("syosyetu", "n1", undefined), "/syosyetu/n1/episodes/short");
    assert.throws(() => episodeBasePath("http://localhost", "n1", "1"));
});

test("structured ruby offsets must match source and remain nonoverlapping", () => {
    // 준비
    const value = fixture();
    value.segments[0].rubyTokens = [{ startOffset: 0, endOffset: 1, text: "猫", reading: "ねこ" }];
    // 실행 / 검증
    assert.equal(parseReaderSnapshot(value).segments[0].rubyTokens.length, 1);
    value.segments[0].rubyTokens[0].text = "犬";
    assert.throws(() => parseReaderSnapshot(value), /INVALID_RUBY_TOKENS/);
});

test("ruby preserves literal attack strings while removing readings from speech", () => {
    // 준비
    const text = '<ruby>猫<rp>(</rp><rt>ねこ</rt><rp>)</rp></ruby><img src=x onerror=alert(1)>';
    // 실행 / 검증
    const parsed = parseRuby(text);
    assert.equal(parsed[0].tag, "ruby");
    assert.equal(parsed[1], '<img src=x onerror=alert(1)>');
    assert.equal(rubyPlainText('<ruby>猫<rt>ねこ</rt></ruby>だ。'), "猫だ。");
    assert.equal(rubyPlainText("A &amp; B"), "A & B");
    assert.equal(readFileSync(new URL("../../src/components/common/RubyText.tsx", import.meta.url), "utf8").includes("dangerouslySetInnerHTML"), false);
});

test("empty paragraphs preserve display alignment but never become speech requests", () => {
    // 준비: 서버가 보존한 빈 문단은 번역 대상이 아니지만 동일 revision의 ID/순서를 가진다.
    const value = fixture();
    value.segments[0] = { ...value.segments[0], rawJa: "  ", plainJa: "  ", ko: "", endOffset: 2 };
    // 실행
    const parsed = parseReaderSnapshot(value);
    // 검증
    assert.equal(parsed.segments.length, 2);
    assert.deepEqual(planReading(parsed.segments, "all", "ko").map(item => item.id), ["b"]);
    assert.deepEqual(planReading(parsed.segments, "all", "ja").map(item => item.id), ["b"]);
});
