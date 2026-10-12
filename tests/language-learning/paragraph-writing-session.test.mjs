import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadSource(relative, modules, globals = {}) {
    const source = fs.readFileSync(new URL(`../../src/${relative}`, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
        exports, Response, FormData, DOMException, Date, AbortSignal, process: { env: {} }, ...globals,
        require(name) { assert.ok(name in modules, `Unexpected dependency: ${name}`); return modules[name]; },
    });
    return exports;
}

function harness(getSession, fetchResponse = async () => new Response("{}")) {
    const calls = [];
    let unauthorized = 0;
    const api = loadSource("lib/apiClient.ts", {
        "next-auth/react": { getSession },
        "@/lib/authError": { isTemporaryAuthError: () => false, isTerminalAuthError: () => false },
        "@/lib/authEvents": { notifyAuthUnauthorized: () => { unauthorized++; } },
    }, { fetch: async (...args) => { calls.push(args); return fetchResponse(); } });
    // 응답 DTO 검증은 별도 계약 테스트가 담당한다. 여기서는 실제 서비스→apiClient→세션 경계를 실행한다.
    const service = loadSource("services/language-learning/paragraphWritingService.ts", {
        "@/lib/apiClient": api,
        "@/services/common/responseParser": { parseResponseBody: (response) => response.json() },
        "@/features/language-learning/writing/paragraphWritingContract": {
            validateParagraphConfig: (value) => value, validateParagraphPlan: (value) => value, validateParagraphPreview: (value) => value,
        },
    });
    return { calls, create: service.createParagraphWritingService, unauthorized: () => unauthorized };
}

const session = (loginSessionId, accessToken = "synthetic-access") => ({ loginSessionId, accessToken, user: { publicId: "same-owner" } });

test("all Writing reads and mutations reject the previous login before sending HTTP", async () => {
    // 준비: 같은 소유자의 재로그인도 이전 화면의 권한으로 간주하지 않는다.
    const h = harness(async () => session("new-login"));
    const service = h.create("old-login");
    const operations = [
        () => service.config(), () => service.preview("FREE", 3, false), () => service.start("FREE", 3, false, false),
        () => service.get(1), () => service.history("2026-10-11", "FREE"), () => service.expand(1, 5, 1),
        () => service.restore(1, 1), () => service.delete(1, 1), () => service.submit(2, "answer", "r1"), () => service.retryFeedback(3),
    ];

    // 실행·검증: 새로운 답안·시작·재시도 요청까지 전송 수가 0이다.
    for (const operation of operations) await assert.rejects(operation, { name: "AbortError" });
    assert.equal(h.calls.length, 0);
    assert.equal(h.unauthorized(), 0);
});

test("a login change while getSession is pending cannot start a plan as the new account", async () => {
    // 준비
    let finish;
    const h = harness(() => new Promise((resolve) => { finish = resolve; }));
    const pending = h.create("old-login").start("GUIDED", 3, false, false);

    // 실행
    finish(session("other-account-login"));

    // 검증
    await assert.rejects(pending, { name: "AbortError" });
    assert.equal(h.calls.length, 0);
});

test("access token refresh within the same login preserves Writing submission", async () => {
    // 준비
    const h = harness(async () => session("current-login", "synthetic-refreshed"));

    // 실행
    await h.create("current-login").submit(2, "two\nparagraphs", "r1");

    // 검증
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0][1].headers.Authorization, "Bearer synthetic-refreshed");
    assert.deepEqual(JSON.parse(h.calls[0][1].body), { answer: "two\nparagraphs", contentRevision: "r1" });
});

test("a late Writing 401 cannot log out the new login", async () => {
    // 준비
    let reads = 0;
    const h = harness(async () => session(++reads === 1 ? "old-login" : "new-login"), async () => new Response(null, { status: 401 }));

    // 실행·검증
    await assert.rejects(h.create("old-login").get(1), { name: "AbortError" });
    assert.equal(h.calls.length, 1);
    assert.equal(h.unauthorized(), 0);
});

test("Writing cannot construct an unbound anonymous service", () => {
    // 준비·실행·검증
    assert.throws(() => harness(async () => null).create(""), /WRITING_LOGIN_SESSION_REQUIRED/);
});
