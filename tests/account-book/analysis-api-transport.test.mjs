import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

import * as authErrors from "../../src/lib/authError.ts";

const standardBase = "https://standard-api.example.test/api/v1";
const analysisBase = "https://analysis-api.example.test/api/v1";
const root = "/account-books/30001/spending-analysis";
const analysisId = "9d3c6de9-e843-456f-9f3e-a15ab6740487";
const routes = [
    { endpoint: root, method: "POST" },
    { endpoint: `${root}/jobs`, method: "POST" },
    { endpoint: `${root}/jobs/current`, method: "GET" },
    { endpoint: `${root}/jobs/42`, method: "GET" },
    { endpoint: `${root}/jobs/42/cancel`, method: "POST" },
    { endpoint: `${root}/snapshot?periodType=MONTHLY&year=2026&month=10`, method: "GET" },
    { endpoint: `${root}/history?page=0&size=10`, method: "GET" },
    { endpoint: `${root}/history/${analysisId}`, method: "GET" },
];

function session(overrides = {}) {
    return {
        loginSessionId: "login-current",
        accessToken: "synthetic-test-token",
        user: { accessTokenExpires: Date.now() + 60_000 },
        ...overrides,
    };
}

function harness(settings = {}) {
    const { getSession = async () => session(), status = 200 } = settings;
    const configured = "configured" in settings ? settings.configured : analysisBase;
    // 실제 apiClient를 실행하고 세션과 네트워크 경계만 대체한다.
    const source = fs.readFileSync(new URL("../../src/lib/apiClient.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const requests = [];
    let unauthorized = 0;
    const modules = {
        "next-auth/react": { getSession },
        "@/lib/authError": authErrors,
        "@/lib/authEvents": { notifyAuthUnauthorized: () => { unauthorized += 1; } },
    };
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        process: { env: { NEXT_PUBLIC_API_URL: standardBase, NEXT_PUBLIC_ACCOUNT_BOOK_ANALYSIS_API_URL: configured } },
        URL, DOMException, FormData, Response, Date,
        require(name) {
            assert.ok(name in modules, `Unexpected dependency: ${name}`);
            return modules[name];
        },
        fetch: async (url, options) => {
            requests.push({ url, options });
            return new Response(null, { status });
        },
    });
    return { apiClient: exports.apiClient, requests, get unauthorized() { return unauthorized; } };
}

for (const route of routes) {
    test(`only analysis ${route.method} ${route.endpoint} uses the dedicated origin`, async () => {
        // 준비
        const client = harness({ configured: ` ${analysisBase}/ ` });
        const controller = new AbortController();
        const body = route.method === "POST" ? JSON.stringify({ periodType: "MONTHLY", year: 2026, month: 10 }) : undefined;

        // 실행
        await client.apiClient(route.endpoint, { method: route.method, body, signal: controller.signal, headers: { "X-Test": "preserved" } }, "login-current");

        // 검증: 쿼리·본문·인증·취소가 기존 apiClient를 그대로 통과한다.
        assert.equal(client.requests.length, 1);
        const request = client.requests[0];
        assert.equal(request.url, analysisBase + route.endpoint);
        assert.equal(request.options.headers.Authorization, "Bearer synthetic-test-token");
        assert.equal(request.options.headers["Content-Type"], "application/json");
        assert.equal(request.options.headers["X-Test"], "preserved");
        assert.equal(request.options.body, body);
        assert.equal(request.options.signal, controller.signal);
        assert.equal(client.unauthorized, 0);
    });
}

test("unset or blank dedicated configuration preserves every original URL", async () => {
    // 준비 / 실행
    for (const configured of [undefined, "", "   "]) {
        const client = harness({ configured });
        for (const route of routes) await client.apiClient(route.endpoint, { method: route.method });

        // 검증
        assert.deepEqual(client.requests.map(request => request.url), routes.map(route => standardBase + route.endpoint));
    }
});

test("unrelated paths, extra suffixes, fragments and unsupported methods retain the standard origin", async () => {
    // 준비
    const client = harness();
    const requests = [
        ["/users/me", "GET"], ["/auth/token/refresh", "POST"],
        ["/account-books/30001/transactions", "POST"], ["/account-books/30001", "GET"],
        [root, "GET"], [root, "DELETE"], [`${root}/history`, "POST"],
        [`${root}/snapshot/extra`, "GET"], [`${root}/history/${analysisId}/extra`, "GET"],
        [`${root}-extra`, "POST"], [`${root}/snapshot#fragment`, "GET"],
        [root.toUpperCase() + "/history", "GET"],
    ];

    // 실행
    for (const [endpoint, method] of requests) await client.apiClient(endpoint, { method });

    // 검증
    assert.deepEqual(client.requests.map(request => request.url), requests.map(([endpoint]) => standardBase + endpoint));
});

test("invalid dedicated configuration fails before fetch but does not affect unrelated API calls", async () => {
    // 준비 / 실행
    for (const configured of ["http://analysis.example.test/api/v1", "https://analysis.example.test/other", "https://user:password@analysis.example.test/api/v1", `${analysisBase}?key=value`, `${analysisBase}#fragment`, "/api/v1"]) {
        const client = harness({ configured });
        await assert.rejects(client.apiClient(root, { method: "POST" }));
        assert.equal(client.requests.length, 0);
        await client.apiClient("/users/me");

        // 검증
        assert.equal(client.requests[0].url, standardBase + "/users/me");
    }
});

test("missing, terminal and expired temporary sessions cannot send analysis requests", async () => {
    // 준비 / 실행
    for (const [current, expected] of [[null, 401], [session({ error: authErrors.AUTH_SESSION_ERROR.REFRESH_FAILED }), 401], [session({ error: authErrors.AUTH_SESSION_ERROR.REFRESH_TEMPORARILY_UNAVAILABLE, user: { accessTokenExpires: 0 } }), 503]]) {
        const client = harness({ getSession: async () => current });
        const response = await client.apiClient(root, { method: "POST" });

        // 검증
        assert.equal(response.status, expected);
        assert.equal(client.requests.length, 0);
    }
});

test("temporary refresh failure with a usable token keeps authenticated analysis available", async () => {
    // 준비
    const client = harness({ getSession: async () => session({ error: authErrors.AUTH_SESSION_ERROR.REFRESH_TEMPORARILY_UNAVAILABLE }) });

    // 실행
    const response = await client.apiClient(root, { method: "POST" });

    // 검증
    assert.equal(response.status, 200);
    assert.equal(client.requests[0].url, analysisBase + root);
    assert.equal(client.requests[0].options.headers.Authorization, "Bearer synthetic-test-token");
});

test("canceling a pending session lookup prevents the analysis network request", async () => {
    // 준비
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    const client = harness({ getSession: () => pending });
    const controller = new AbortController();

    // 실행
    const request = client.apiClient(root, { method: "POST", signal: controller.signal });
    controller.abort();
    await assert.rejects(request, { name: "AbortError" });
    release(session());

    // 검증
    assert.equal(client.requests.length, 0);
});

test("login changes and canceled session lookup still reject before sending credentials", async () => {
    // 준비
    const client = harness();
    const controller = new AbortController();
    controller.abort();

    // 실행 / 검증
    await assert.rejects(client.apiClient(root, { method: "POST" }, "another-login"), { name: "AbortError" });
    await assert.rejects(client.apiClient(root, { method: "POST", signal: controller.signal }), { name: "AbortError" });
    assert.equal(client.requests.length, 0);
});

test("analysis 401 keeps the existing unauthorized notification and login recheck", async () => {
    // 준비
    const client = harness({ status: 401 });

    // 실행
    const response = await client.apiClient(root, { method: "POST" }, "login-current");

    // 검증
    assert.equal(response.status, 401);
    assert.equal(client.requests[0].url, analysisBase + root);
    assert.equal(client.unauthorized, 1);
});

test("a late analysis 401 from an old login cannot invalidate the new login", async () => {
    // 준비
    let count = 0;
    const client = harness({ status: 401, getSession: async () => session({ loginSessionId: ++count === 1 ? "login-current" : "login-new" }) });

    // 실행 / 검증
    await assert.rejects(client.apiClient(root, { method: "POST" }, "login-current"), { name: "AbortError" });
    assert.equal(client.requests.length, 1);
    assert.equal(client.unauthorized, 0);
});
