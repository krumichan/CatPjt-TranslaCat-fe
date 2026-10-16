import assert from "node:assert/strict";
import test from "node:test";

import { buildWebAiTransferPrompt } from "../../src/features/language-learning/web-ai/webAiTransferPrompt.ts";

const connection = {
    token: "synthetic-memory-only-token",
    planId: "plan-1",
    promptUrl: "https://api.translacat.example/api/v1/language-learning/web-ai/external/prompt",
    resultUrl: "https://api.translacat.example/api/v1/language-learning/web-ai/external/results",
    bootstrapPrompt: "Schedule JSON: {\"time\":\"08:00\"}\nPOST prompt; Authorization: Bearer synthetic-memory-only-token",
};
const run = {
    id: "manual-run-1",
    planId: "plan-1",
    prompt: 'Run ID: manual-run-1\nJSON FORMAT: {"runId":"manual-run-1","originalFeedbackMarkdown":"full feedback","items":[]}',
};

test("연동 복사본은 두 POST API와 답안별 원문 피드백 전송 및 수동 회차를 포함한다", () => {
    // 준비 / 실행
    const prompt = buildWebAiTransferPrompt(connection, run, "ko");

    // 검증: 자동 전송 실패와 최초 HTTP 미지원은 각각 기존 회차와 첨부 회차를 사용한다.
    assert.ok(prompt.includes(`POST ${connection.promptUrl}`));
    assert.ok(prompt.includes(`POST ${connection.resultUrl}`));
    assert.match(prompt, /일부 문제만 풀어도 제출한 답안부터/);
    assert.match(prompt, /originalFeedbackMarkdown과 externalFeedbackMarkdown/);
    assert.match(prompt, /최대 10개씩/);
    assert.match(prompt, /같은 submissionId와 같은 본문/);
    assert.match(prompt, /PENDING은 검증 대기/);
    assert.match(prompt, /다른 수동 회차로 바꾸거나 runId를 새로 만들지/);
    assert.match(prompt, /이후 날짜의 반복 예약에 같은 runId/);
    assert.ok(prompt.endsWith(run.prompt));
    assert.ok(prompt.includes(connection.bootstrapPrompt));
});

test("일본어와 학습 모드도 평가 후 전송·수동 가져오기 규약을 명시한다", () => {
    // 준비 / 실행 / 검증
    for (const locale of ["ja", "learning"]) {
        const prompt = buildWebAiTransferPrompt(connection, run, locale);
        assert.match(prompt, /全問終了まで待たない/);
        assert.ok(prompt.includes(`POST ${connection.resultUrl}`));
        assert.match(prompt, /originalFeedbackMarkdownとexternalFeedbackMarkdown/);
        assert.match(prompt, /学習結果の取り込み/);
        assert.match(prompt, /別の日の繰り返し予約に同じrunId/);
        assert.ok(prompt.endsWith(run.prompt));
    }
});

test("계획 수정 후 기존 토큰으로 최신 일정만 복사하고 원본 연결은 유지한다", () => {
    // 준비
    const plan = { id: "plan-1", name: "현재 $& 계획", recurrence: "WEEKLY", time: "18:30", timezone: "Asia/Tokyo", weekdays: [1, 3], monthDays: [], includeLastDay: false };
    const original = structuredClone(connection);

    // 실행
    const prompt = buildWebAiTransferPrompt(connection, run, "ko", plan);

    // 검증
    assert.ok(prompt.includes('Schedule JSON: {"name":"현재 $& 계획","recurrence":"WEEKLY","time":"18:30"'));
    assert.doesNotMatch(prompt, /Schedule JSON: \{"time":"08:00"\}/);
    assert.ok(prompt.includes("Authorization: Bearer synthetic-memory-only-token"));
    assert.deepEqual(connection, original);
});

test("다른 계획의 연결·회차와 빈 서버 프롬프트는 합치지 않는다", () => {
    // 준비 / 실행 / 검증
    assert.throws(() => buildWebAiTransferPrompt(connection, { ...run, planId: "other" }, "ko"), /PLAN_MISMATCH/);
    assert.throws(() => buildWebAiTransferPrompt(connection, run, "ko", { id: "other" }), /PLAN_MISMATCH/);
    assert.throws(() => buildWebAiTransferPrompt({ ...connection, bootstrapPrompt: " " }, run, "ko"), /PROMPT_EMPTY/);
    assert.throws(() => buildWebAiTransferPrompt(connection, { ...run, prompt: "" }, "ko"), /PROMPT_EMPTY/);
});
