import assert from "node:assert/strict";
import test from "node:test";

import { createWebAiSchedule } from "../../src/features/language-learning/web-ai/webAiSchedule.ts";
import { parseWebAiResultImport, resolveWebAiConnection, toWebAiPlanRequest } from "../../src/features/language-learning/web-ai/webAiApi.ts";
import { markWebAiDraftImported, readImportedWebAiDraftIds, readWebAiSchedules, writeWebAiSchedules } from "../../src/features/language-learning/web-ai/webAiScheduleStorage.ts";

test("계획 저장 요청은 이행용 id와 수정 revision을 보존하고 사용자 공통 언어는 전송하지 않는다", () => {
    // 준비
    const schedule = createWebAiSchedule({ originLanguage: "ko", learningLanguage: "ja", feedbackLanguage: "en", timezone: "Asia/Tokyo" });
    schedule.name = "고객 회의";
    schedule.areas = [{ code: "WRITING_GUIDED", easy: 0, standard: 5, hard: 0 }];

    // 실행
    const request = toWebAiPlanRequest(schedule, false, 7);

    // 검증
    assert.equal(request.id, schedule.id);
    assert.equal(request.revision, 7);
    assert.equal(request.enabled, false);
    assert.equal(request.originLanguage, undefined);
    assert.equal(request.learningLanguage, undefined);
    assert.equal(request.feedbackLanguage, undefined);
    assert.deepEqual(request.areas, schedule.areas);
});

test("연동 프롬프트의 상대 API 경로를 FE 대신 실제 BE origin으로 완성한다", () => {
    // 준비
    const connection = {
        token: "only-memory",
        planId: "plan",
        promptUrl: "/api/v1/language-learning/web-ai/external/prompt",
        resultUrl: "/api/v1/language-learning/web-ai/external/results",
        bootstrapPrompt: "GET /api/v1/language-learning/web-ai/external/prompt\nPOST /api/v1/language-learning/web-ai/external/results",
    };

    // 실행
    const resolved = resolveWebAiConnection(connection, "https://api.translacat.example/api/v1");

    // 검증
    assert.equal(resolved.promptUrl, "https://api.translacat.example/api/v1/language-learning/web-ai/external/prompt");
    assert.equal(resolved.resultUrl, "https://api.translacat.example/api/v1/language-learning/web-ai/external/results");
    assert.equal(resolved.bootstrapPrompt, `GET ${resolved.promptUrl}\nPOST ${resolved.resultUrl}`);
    assert.equal(connection.promptUrl.startsWith("/"), true);
    assert.equal(resolved.token, "only-memory");
});

test("외부 AI 결과는 코드블록 JSON을 읽되 원문 피드백과 제출 식별자는 재작성하지 않는다", () => {
    // 준비
    const payload = { runId: "run", submissionId: "submission", originalFeedbackMarkdown: "## 원문\n\n**좋은 표현**", items: [{ itemId: "WRITING_GUIDED:STANDARD:1", answerText: "ご確認ください。" }] };

    // 실행
    const parsed = parseWebAiResultImport(`\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``);

    // 검증
    assert.deepEqual(parsed, payload);
    assert.throws(() => parseWebAiResultImport("{broken"));
    assert.throws(() => parseWebAiResultImport(JSON.stringify({ ...payload, submissionId: "" })));
    assert.throws(() => parseWebAiResultImport(JSON.stringify({ ...payload, items: [] })));
    assert.throws(() => parseWebAiResultImport(JSON.stringify([payload])));
});

test("서버 이행 표시는 사용자별로 분리하고 브라우저 원본 계획을 삭제하지 않는다", () => {
    // 준비
    const originalWindow = globalThis.window;
    const values = new Map();
    globalThis.window = { localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } };
    const schedule = createWebAiSchedule({ originLanguage: "ko", learningLanguage: "ja", timezone: "Asia/Tokyo" });
    schedule.name = "원본";
    schedule.areas = [{ code: "WRITING_GUIDED", easy: 0, standard: 1, hard: 0 }];
    try {
        writeWebAiSchedules("owner-a", [schedule]);

        // 실행
        markWebAiDraftImported("owner-a", schedule.id);
        markWebAiDraftImported("owner-a", schedule.id);

        // 검증
        assert.deepEqual(readImportedWebAiDraftIds("owner-a"), [schedule.id]);
        assert.deepEqual(readImportedWebAiDraftIds("owner-b"), []);
        assert.deepEqual(readWebAiSchedules("owner-a"), [schedule]);
    } finally {
        if (originalWindow === undefined) delete globalThis.window;
        else globalThis.window = originalWindow;
    }
});
