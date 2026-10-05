import assert from "node:assert/strict";
import test from "node:test";
import { audioBudgetPlan, speechPartCount } from "../../e2e/support/novel-audio-budget.ts";

test("audio preflight reserves only first four and one lookahead per language without dropping the long tail", () => {
    // 준비
    const snapshot = { state: "SUCCEEDED", revision: "r", audioPolicyVersion: "v", segments: Array.from({ length: 25 }, (_, index) => ({ id: `s${index}`, plainJa: "猫だ。", ko: "고양이다." })) };

    // 실행 / 검증: 재사용 조건은 actor/work/revision/정책을 고정한 suite가 소유한다.
    const plan = audioBudgetPlan(snapshot);
    assert.equal(plan.expectedUniqueColdCalls, 8);
    assert.equal(plan.maximumUniqueColdCalls, 10);
    assert.equal(plan.unrequestedTailUnits, 20);
    assert.equal(plan.selectedSegmentId, "s1");
    assert.equal(plan.entries.some(item => item.segmentId === "s5"), false);
    assert.throws(() => audioBudgetPlan({ ...snapshot, state: "RUNNING" }), /AUDIO_COMPLETED_SNAPSHOT_REQUIRED/);
    assert.throws(() => audioBudgetPlan({ ...snapshot, audioPolicyVersion: undefined }), /AUDIO_POLICY_BINDING_REQUIRED/);
    assert.throws(() => audioBudgetPlan({ ...snapshot, segments: [{ ...snapshot.segments[0], ko: "가".repeat(401) }, ...snapshot.segments.slice(1)] }), /AUDIO_SINGLE_PART_BUDGET_REQUIRED/);
});

test("UTF-8 audio boundaries preserve non-BMP code points and reject invalid text", () => {
    // 준비 / 실행 / 검증: UTF-16 길이나 문자수로 음성 parts를 과소 계수하지 않는다.
    assert.equal(speechPartCount("가".repeat(400)), 1);
    assert.equal(speechPartCount("가".repeat(401)), 2);
    assert.equal(speechPartCount("😀".repeat(300)), 1);
    assert.equal(speechPartCount("😀".repeat(301)), 2);
    assert.throws(() => speechPartCount("\n "), /AUDIO_PREFLIGHT_TEXT_INVALID/);
});
