import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

import * as contracts from "../../src/features/account-deletion/contracts.ts";
import { sameAuthSession } from "../../src/lib/authPolicy.ts";

const receipt = { operationId: "714d5b48-0215-4f51-b74d-21777c2f401e", receiptSecret: "a".repeat(43), expectedPublicId: "TC-SYNTHETIC", returnScheme: "translacat-dev" };
const pending = { operationId: receipt.operationId, status: "PENDING", requestedAtUtc: "2026-10-23T00:00:00Z", completedAtUtc: null, receiptExpiresAtUtc: null };

test("web handoff is strictly parsed and remains recoverable in the same tab", () => {
    // 준비
    const saved = new Map();
    const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
    const fragment = "#" + new URLSearchParams(receipt);

    // 실행
    const captured = contracts.captureDeletionReceipt(storage, fragment);

    // 검증: 로그인 왕복 뒤에도 같은 요청이며 callback에는 상태 조회 증명도 들어가지 않는다.
    assert.deepEqual(captured, receipt);
    assert.deepEqual(contracts.captureDeletionReceipt(storage, ""), receipt);
    assert.equal(contracts.deletionCallback(captured), `translacat-dev://account-deletion?operationId=${receipt.operationId}`);
    assert.throws(() => contracts.captureDeletionReceipt(storage, fragment + "&receiptSecret=second"));
    assert.throws(() => contracts.captureDeletionReceipt(storage, fragment + "&accessToken=unexpected"));
    assert.throws(() => contracts.parseDeletionReceipt({ ...receipt, returnScheme: "https" }));
    assert.throws(() => contracts.parseDeletionStatus({ ...pending, status: "COMPLETED" }, receipt.operationId));
});

class AuthRequestError extends Error {
    constructor(code, status) { super(code); this.code = code; this.status = status; }
}

function harness({ current = { accessToken: "synthetic-web-access", loginSessionId: "login-one", user: { publicId: receipt.expectedPublicId } }, proof = {
    reauthToken: "synthetic-proof", publicId: receipt.expectedPublicId, loginSessionId: "login-one", validUntil: Date.now() + 60000,
}, result = pending } = {}) {
    const evidence = { backend: [], cookies: [], sessions: 0 };
    const modules = {
        "@/lib/authRouteHelpers": {
            authJson: (body, status = 200) => ({ body, status }),
            authRouteError: error => ({ body: { errorCode: error.code }, status: error.status ?? 503 }),
            requireAuthSession: async () => { evidence.sessions++; if (!current) throw new AuthRequestError("AUTH_REQUIRED", 401); return current; },
            requireSameOrigin: request => { if (request.headers.get("origin") !== "https://web.example.test") throw new AuthRequestError("INVALID_REQUEST", 403); },
            readAuthRequest: request => request.json(),
        },
        "@/lib/authFlowCookies": {
            DELETION_REAUTH_COOKIE: "deletion-proof", GOOGLE_FLOW_COOKIE: "google-flow",
            readAuthCookie: async () => proof, clearAuthCookie: (_response, name) => evidence.cookies.push({ name, cleared: true }),
            clearGoogleFlow: () => {}, writeAuthCookie: async (_response, name, value) => evidence.cookies.push({ name, value }),
        },
        "@/lib/authPolicy": { sameAuthSession },
        "@/services/authService": { AuthRequestError, requestServerAuth: async (...args) => { evidence.backend.push(args); return { body: result }; } },
        "@/features/account-deletion/contracts": contracts,
        "@/i18n/config": { locales: ["ko", "en", "ja", "learning"] },
    };
    const source = fs.readFileSync(new URL("../../src/app/api/account-deletion/[...path]/route.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, { exports, Date, Number, String, Error, require: name => { assert.ok(name in modules, name); return modules[name]; } });
    return { evidence, run: async (path, body, origin = "https://web.example.test") => {
        const request = new Request("https://web.example.test/api/account-deletion/" + path, {
            method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        request.cookies = { get: () => ({ value: "encrypted" }) };
        return exports.POST(request, { params: Promise.resolve({ path: path.split("/") }) });
    } };
}

test("deletion BFF requires same-origin, same account and purpose-bound fresh proof", async () => {
    // 준비·실행
    const csrf = harness();
    assert.equal((await csrf.run("request", { ...receipt, confirmation: "DELETE_ACCOUNT" }, "https://evil.example.test")).status, 403);
    assert.equal(csrf.evidence.backend.length, 0);
    const mismatch = harness();
    assert.equal((await mismatch.run("request", { ...receipt, expectedPublicId: "OTHER", confirmation: "DELETE_ACCOUNT" })).status, 409);
    assert.equal(mismatch.evidence.backend.length, 0);
    const stale = harness({ proof: { reauthToken: "old-proof", publicId: receipt.expectedPublicId, loginSessionId: "different-login", validUntil: Date.now() + 60000 } });
    assert.equal((await stale.run("request", { ...receipt, confirmation: "DELETE_ACCOUNT" })).status, 403);

    // 검증: 입력 증명 대신 HttpOnly 전용 쿠키의 현재 sid proof만 BE에 보낸다.
    const valid = harness();
    const response = await valid.run("request", { ...receipt, confirmation: "DELETE_ACCOUNT", reauthenticationToken: "browser-injected" });
    assert.equal(response.status, 200);
    assert.equal(valid.evidence.backend[0][1].reauthenticationToken, "synthetic-proof");
    assert.equal(valid.evidence.backend[0][1].expectedPublicId, receipt.expectedPublicId);
    assert.equal(valid.evidence.backend[0][1].returnScheme, undefined);
    assert.equal(valid.evidence.cookies.some(item => item.name === "deletion-proof" && item.cleared), true);
});

test("receipt status is read-only after logout and cannot receive a different operation result", async () => {
    // 준비
    const f = harness({ current: null });

    // 실행
    const response = await f.run("status", receipt);

    // 검증: 세션이나 Bearer 토큰 없이 상태만 조회하고 타 작업의 성공을 잘못 표시하지 않는다.
    assert.equal(response.status, 200);
    assert.equal(f.evidence.sessions, 0);
    assert.equal(f.evidence.backend[0][0], "/account-deletion/status");
    assert.equal(f.evidence.backend[0][2], undefined);
    const wrong = harness({ current: null, result: { ...pending, operationId: "different" } });
    assert.equal((await wrong.run("status", receipt)).status, 503);
});


test("submitted receipt survives same-app handoff and cannot be overwritten by another request", () => {
    // 준비
    const saved = new Map([[contracts.DELETION_RECEIPT_KEY, JSON.stringify({ ...receipt, submitted: true })]]);
    const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };

    // 실행·검증: 동일 요청 재진입은 submitted를 유지하고 다른 fragment는 기존 영수증을 남긴다.
    const restored = contracts.captureDeletionReceipt(storage, "#" + new URLSearchParams(receipt));
    assert.equal(restored.submitted, true);
    for (const changed of [{ operationId: "814d5b48-0215-4f51-b74d-21777c2f401e" }, { receiptSecret: "b".repeat(43) }, { expectedPublicId: "TC-OTHER" }]) {
        assert.throws(() => contracts.captureDeletionReceipt(storage, "#" + new URLSearchParams({ ...receipt, ...changed })), /DELETION_RECEIPT_CONFLICT/);
        assert.equal(JSON.parse(saved.get(contracts.DELETION_RECEIPT_KEY)).submitted, true);
        assert.equal(JSON.parse(saved.get(contracts.DELETION_RECEIPT_KEY)).operationId, receipt.operationId);
    }
});

test("deletion client deadline ends an ignored-abort request without replaying the mutation", async () => {
    // 준비: 전송 대역이 영원히 응답하지 않고 AbortSignal도 무시한다.
    const calls = [], timers = [];
    class IdentityError extends Error {}
    const source = fs.readFileSync(new URL("../../src/features/account-deletion/request.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, { exports, AbortController, Promise, setTimeout: callback => { timers.push(callback); return 1; }, clearTimeout: () => {}, require: name => {
        assert.equal(name, "@/services/identityClient");
        return { IdentityError, identityRequest: (...args) => { calls.push(args); return new Promise(() => {}); } };
    } });

    // 실행
    const request = exports.deletionRequest("/api/account-deletion/request", receipt);
    timers[0]();

    // 검증
    await assert.rejects(request, /AUTH_UNAVAILABLE/);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][2].aborted, true);
});
