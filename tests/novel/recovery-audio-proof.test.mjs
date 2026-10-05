import test from "node:test";
import assert from "node:assert/strict";
import { safeSpeechAttempts, verifyPaidAudioKeys, verifyAudioRequestPositions, verifyNativeEnded } from "../../e2e/support/novel-recovery-audio-proof.ts";

test("actual speech evidence rejects duplicated paid keys and unbound requests", () => {
    // 준비 / 실행 / 검증: 1개 합성만 허용되고 같은 key 두번째 과금은 캐시로 숨기지 못한다.
    const entry = { segmentId: "s1", language: "ko", partIndex: 0, textSha256: "a".repeat(64) };
    const request = { ...entry, traceId: "t1" };
    const call = { attempt: 1, traceId: "t1", requestSha256: entry.textSha256, language: "ko", voice: "marin" };
    assert.equal(verifyPaidAudioKeys([entry], [request], [call], ["t1"])[0].providerAttempts.length, 1);
    assert.throws(() => verifyPaidAudioKeys([entry], [request], [call, { ...call, attempt: 2 }], ["t1"]), /COUNT_MISMATCH/);
    assert.throws(() => verifyPaidAudioKeys([entry], [{ ...request, segmentId: "unknown" }], [call], ["t1"]), /COUNT_MISMATCH/);
});

test("actual speech evidence rejects premature or two-ahead preparation and single prefetch", () => {
    // 준비: 현재s1끝3초 내에서s2만 준비할 수 있다.
    const value = { segmentId: "s2", partIndex: 0, readIntent: { mode: "from", segmentId: "s1" }, activeSegmentId: "s1", playbackState: "playing",
        nativePosition: { currentTime: 8, duration: 10, paused: false, ended: false } };
    assert.equal(verifyAudioRequestPositions([value], ["s1", "s2", "s3"])[0].kind, "ONE_NEXT_AT_NATIVE_END_WINDOW");
    assert.throws(() => verifyAudioRequestPositions([{ ...value, segmentId: "s3" }], ["s1", "s2", "s3"]), /LOOKAHEAD/);
    assert.throws(() => verifyAudioRequestPositions([{ ...value, nativePosition: { ...value.nativePosition, currentTime: 1 } }], ["s1", "s2"]), /LOOKAHEAD/);
    assert.throws(() => verifyAudioRequestPositions([{ ...value, readIntent: { mode: "single", segmentId: "s1" } }], ["s1", "s2"]), /SINGLE_AUDIO/);
});

test("native ended proof rejects synthetic events and ledger strips unapproved content", () => {
    // 준비 / 검증: play promise나 임의이벤트를 native ended로 대신하지 않는다.
    const ended = { trusted: true, nativeElement: true, phase: "p", segmentId: "s1", currentTime: 2, duration: 2 };
    assert.equal(verifyNativeEnded({ ended: [ended] }, "p", ["s1"]).length, 1);
    assert.throws(() => verifyNativeEnded({ ended: [{ ...ended, trusted: false }] }, "p", ["s1"]), /NATIVE_ENDED/);
    const safe = safeSpeechAttempts({ calls: [{ task: "OPENAI_TTS", attempt: 1, status: "SUCCEEDED", secret: "excluded",
        metadata: { traceId: "t", requestSha256: "b".repeat(64), language: "ja", voice: "marin", text: "excluded" } }] });
    assert.equal(JSON.stringify(safe).includes("excluded"), false);
});
