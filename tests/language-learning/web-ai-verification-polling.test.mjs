import assert from "node:assert/strict";
import test from "node:test";

import { webAiVerificationPollDelay } from "../../src/features/language-learning/web-ai/verificationPolling.ts";

test("대기 결과는 처음 2초 뒤 확인하고 이후에는 5초 간격으로 읽는다", () => {
    // 준비
    const elapsed = 2000;

    // 실행 / 검증
    assert.equal(webAiVerificationPollDelay(0, 0), 2000);
    assert.equal(webAiVerificationPollDelay(1, elapsed), 5000);
    assert.equal(webAiVerificationPollDelay(20, 100_000), 5000);
});

test("5분이 지나면 자동 읽기를 멈추고 수동 새로고침을 기다린다", () => {
    // 준비
    const deadline = 5 * 60 * 1000;

    // 실행 / 검증
    assert.equal(webAiVerificationPollDelay(60, deadline - 5000), 5000);
    assert.equal(webAiVerificationPollDelay(61, deadline - 1), null);
    assert.equal(webAiVerificationPollDelay(61, deadline), null);
    assert.equal(webAiVerificationPollDelay(100, deadline + 60_000), null);
});
