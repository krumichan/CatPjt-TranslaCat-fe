import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

import { isSameOrigin, PUBLIC_AUTH_PAGES, sameAuthSession, validBirthDate, validPassword } from "../../src/lib/authPolicy.ts";

function loadSource(relative, modules) {
    const source = fs.readFileSync(new URL(`../../src/${relative}`, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
        exports, Date, URL, Response, TextEncoder, TextDecoder, AbortSignal,
        process: { env: {} }, console: { error() {}, warn() {} },
        require(name) {
            assert.ok(name in modules, `Unexpected dependency: ${name}`);
            return modules[name];
        },
    });
    return exports;
}

class AuthRequestError extends Error {
    constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
class AuthRefreshError extends Error {}

function loadAuth(service = {}) {
    return loadSource("lib/auth.ts", {
        "next-auth/providers/google": { default: (options) => ({ id: "google", options }) },
        "next-auth/providers/credentials": { default: (options) => ({ id: "credentials", options }) },
        "node:crypto": { randomUUID: () => "fresh-login-id" },
        "@/lib/authError": {
            AUTH_SESSION_ERROR: { AUTHENTICATION: "AuthError", REFRESH_FAILED: "RefreshAccessTokenError" },
            isTemporaryAuthError: () => false, isTerminalAuthError: (error) => !!error,
        },
        "@/services/authService": { authService: service, AuthRequestError, AuthRefreshError },
    }).authOptions;
}

const tokens = { publicId: "member-1", accessToken: "test-access", refreshToken: "test-refresh", accessTokenExpiresIn: 600, role: "USER" };

test("credentials authenticate through BE and share session tokens without Google exchange", async () => {
    // 준비: 공급자별 네트워크 경계만 대체한다.
    const calls = [];
    const options = loadAuth({ authenticateWithPassword: async (...args) => { calls.push(args); return { body: tokens }; } });
    const credentials = options.providers.find((provider) => provider.id === "credentials").options;

    // 실행: 비밀번호 앞뒤 공백은 보존하고 이메일만 정규화한다.
    const user = await credentials.authorize({ email: " user@example.test ", password: "  secret pass  " });
    assert.equal(await options.callbacks.signIn({ account: { provider: "credentials" }, user }), true);
    const jwt = await options.callbacks.jwt({ token: {}, account: { provider: "credentials" }, user });

    // 검증: 민감한 입력은 JWT에 포함되지 않는다.
    assert.deepEqual(calls, [["user@example.test", "  secret pass  "]]);
    assert.equal(jwt.publicId, tokens.publicId);
    assert.equal(jwt.loginSessionId, "fresh-login-id");
    assert.equal(jwt.password, undefined);
    assert.equal(jwt.accessToken, tokens.accessToken);
});

class TestResponse extends Response {
    constructor(body, options) {
        super(body, options);
        this.cookieWrites = [];
        this.cookies = { set: (...args) => this.cookieWrites.push(args) };
    }
    static redirect(url) { return new TestResponse(null, { status: 307, headers: { location: String(url) } }); }
}

function googleHarness({ flow, session, result = { linked: true } }) {
    const evidence = { authCalls: 0, backendCalls: [], writes: [], cleared: 0, providerChecks: null };
    const handler = loadSource("lib/googleAccountAuth.ts", {
        "next-auth": { default: (options) => async () => {
            evidence.authCalls++;
            const callback = options.providers[0].options.token.request;
            await callback({ client: { callback: async (_url, _params, checks) => { evidence.providerChecks = checks; return {}; } }, params: {}, checks: { state: "state-1", code_verifier: "pkce" }, provider: { callbackUrl: "http://localhost/api/auth/callback/google" } });
            const location = await options.callbacks.signIn({ account: { provider: "google", id_token: "test-google-id" } });
            return new Response(null, { status: 302, headers: { location } });
        } },
        "next-auth/providers/google": { default: (options) => ({ id: "google", options }) },
        "next/server": { NextResponse: TestResponse },
        "@/lib/auth": { authOptions: { providers: [{ id: "google" }], callbacks: {} } },
        "@/lib/authPolicy": { sameAuthSession },
        "@/lib/authRouteHelpers": { requireAuthSession: async () => session },
        "@/lib/authFlowCookies": {
            GOOGLE_FLOW_COOKIE: "flow", GOOGLE_REAUTH_COOKIE: "reauth",
            readAuthCookie: async () => flow,
            clearGoogleFlow: () => evidence.cleared++,
            writeAuthCookie: async (_response, name, context) => evidence.writes.push({ name, context }),
        },
        "@/services/authService": { AuthRequestError, requestServerAuth: async (...args) => { evidence.backendCalls.push(args); return { body: result }; } },
    }).handleAuthentication;
    const request = { url: "http://localhost/api/auth/callback/google?state=state-1", nextUrl: new URL("http://localhost/api/auth/callback/google?state=state-1"), cookies: { get: () => ({ value: "encrypted-flow" }) } };
    return { evidence, run: () => handler(request, { params: Promise.resolve({ nextauth: ["callback", "google"] }) }) };
}

const linkingFlow = { purpose: "LINK", intentToken: "intent", nonce: "backend-nonce", publicId: "member-1", loginSessionId: "login-1", locale: "ko", oauthState: "state-1", validUntil: Date.now() + 60000 };
const linkingSession = { accessToken: "existing-access", loginSessionId: "login-1", user: { publicId: "member-1" } };

test("Google linking calls the protected completion endpoint and preserves OAuth state/PKCE", async () => {
    // 준비
    const { evidence, run } = googleHarness({ flow: linkingFlow, session: linkingSession });
    // 실행
    const response = await run();
    // 검증: 일반 Google 로그인 endpoint나 세션 JWT 발급을 거치지 않는다.
    assert.equal(response.headers.get("location"), "http://localhost/ko/settings/account?google=linked");
    assert.equal(evidence.backendCalls[0][0], "/auth/account/google/complete");
    assert.equal(evidence.backendCalls[0][2], "existing-access");
    assert.equal(evidence.providerChecks.nonce, "backend-nonce");
    assert.equal(evidence.providerChecks.state, "state-1");
    assert.equal(evidence.providerChecks.code_verifier, "pkce");
    assert.equal(evidence.cleared, 1);
});

test("expired, cross-session and cross-state Google callbacks fail closed before OAuth or BE calls", async () => {
    // 준비 및 실행
    for (const flow of [null, { ...linkingFlow, validUntil: 1 }, { ...linkingFlow, loginSessionId: "other-login" }, { ...linkingFlow, oauthState: "other-state" }]) {
        const { evidence, run } = googleHarness({ flow, session: linkingSession });
        const response = await run();
        // 검증
        assert.match(response.headers.get("location"), /GOOGLE_FLOW_EXPIRED$/);
        assert.equal(evidence.authCalls, 0);
        assert.equal(evidence.backendCalls.length, 0);
    }
});

test("Google reauthentication proof is only stored in a server cookie", async () => {
    const { evidence, run } = googleHarness({ flow: { ...linkingFlow, purpose: "REAUTHENTICATE" }, session: linkingSession, result: { reauthToken: "private-proof", expiresIn: 300 } });
    const response = await run();
    assert.match(response.headers.get("location"), /google=reauthenticated$/);
    assert.ok(!response.headers.get("location").includes("private-proof"));
    assert.equal(evidence.writes[0].name, "reauth");
    assert.equal(evidence.writes[0].context.reauthToken, "private-proof");
    assert.equal(evidence.writes[0].context.loginSessionId, "login-1");
});

test("Secure OAuth cookies are deleted with Secure attributes", () => {
    const { clearGoogleFlow } = loadSource("lib/authFlowCookies.ts", { "next-auth/jwt": {} });
    const response = new TestResponse();
    clearGoogleFlow(response);
    for (const [name, value, options] of response.cookieWrites) {
        assert.equal(value, "");
        assert.equal(options.maxAge, 0);
        if (name.startsWith("__Secure-")) assert.equal(options.secure, true);
    }
});

test("authentication JSON reader rejects oversized streaming bodies and cancels further reading", async () => {
    const { readAuthRequest } = loadSource("lib/authRouteHelpers.ts", {
        "next/server": {}, "next-auth": {}, "@/lib/auth": {},
        "@/lib/authError": {}, "@/lib/authPolicy": {}, "@/services/authService": { AuthRequestError },
    });
    let canceled = false;
    const request = { headers: new Headers({ "content-type": "application/json" }), body: new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(8000)); }, cancel() { canceled = true; } }) };
    await assert.rejects(readAuthRequest(request), (error) => error.status === 413);
    assert.equal(canceled, true);
});

test("Google duplicate-email failure redirects before issuing a session", async () => {
    // 준비
    const options = loadAuth({ authenticateWithGoogle: async () => { throw new AuthRequestError("AUTH_ACCOUNT_LINK_REQUIRED", 409); } });
    // 실행
    const result = await options.callbacks.signIn({ account: { provider: "google", id_token: "test-id" }, user: {} });
    // 검증
    assert.equal(result, "/login?authError=AUTH_ACCOUNT_LINK_REQUIRED");
});

test("existing Google login still issues the shared BE token session", async () => {
    // 준비: NextAuth가 같은 profile 객체를 signIn과 jwt callback에 전달한다.
    const options = loadAuth({ authenticateWithGoogle: async () => ({ body: tokens }) });
    const user = { id: "google-sub", name: "Reader", email: "reader@example.test" };
    const account = { provider: "google", id_token: "google-id-token" };
    // 실행
    assert.equal(await options.callbacks.signIn({ account, user }), true);
    const jwt = await options.callbacks.jwt({ token: { name: user.name, email: user.email }, user, account });
    // 검증
    assert.equal(jwt.accessToken, tokens.accessToken);
    assert.equal(jwt.refreshToken, tokens.refreshToken);
    assert.equal(jwt.publicId, tokens.publicId);
    assert.equal(jwt.name, "Reader");
    assert.equal(jwt.id_token, undefined);
});

test("credentials failures expose only stable error codes", async () => {
    const options = loadAuth({ authenticateWithPassword: async () => { throw new AuthRequestError("AUTH_INVALID_CREDENTIALS", 401); } });
    const credentials = options.providers.find((provider) => provider.id === "credentials").options;
    await assert.rejects(credentials.authorize({ email: "a@example.test", password: "password" }), { message: "AUTH_INVALID_CREDENTIALS" });
});

test("refresh preserves login identity and consumes the shared refresh endpoint", async () => {
    // 준비
    const options = loadAuth({ refreshAccessToken: async () => ({ body: { ...tokens, accessToken: "renewed" } }) });
    // 실행
    const jwt = await options.callbacks.jwt({ token: { loginSessionId: "original", refreshToken: "old", accessTokenExpires: 1 } });
    // 검증
    assert.equal(jwt.accessToken, "renewed");
    assert.equal(jwt.loginSessionId, "original");
});

test("registration is public while account management stays protected", () => {
    assert.ok(PUBLIC_AUTH_PAGES.includes("/register"));
    assert.ok(!PUBLIC_AUTH_PAGES.includes("/settings/account"));
    assert.equal(isSameOrigin("https://evil.test", "https://translacat.test"), false);
    assert.equal(isSameOrigin(null, "https://translacat.test"), false);
    assert.equal(isSameOrigin("https://translacat.test", "https://translacat.test/api/account/password"), true);
});

test("linking proof requires the same account AND same login session", () => {
    const flow = { publicId: "member-1", loginSessionId: "login-1" };
    assert.equal(sameAuthSession(flow, { user: { publicId: "member-1" }, loginSessionId: "login-1" }), true);
    assert.equal(sameAuthSession(flow, { user: { publicId: "member-1" }, loginSessionId: "login-2" }), false);
    assert.equal(sameAuthSession(flow, { user: { publicId: "member-2" }, loginSessionId: "login-1" }), false);
    assert.equal(sameAuthSession(flow, null), false);
});

test("birth date accepts today in UTC and leap dates but rejects future and invalid dates", () => {
    const now = new Date("2026-10-11T00:00:00.000Z");
    assert.equal(validBirthDate("2026-10-11", now), true);
    assert.equal(validBirthDate("2026-10-12", now), false);
    assert.equal(validBirthDate("2000-02-29", now), true);
    assert.equal(validBirthDate("2001-02-29", now), false);
    assert.equal(validBirthDate("0000-01-01", now), false);
    assert.equal(validBirthDate("1899-01-01", now), true);
});

test("password validation respects UTF-8 byte limit and preserves spaces", () => {
    assert.equal(validPassword("1234567"), false);
    assert.equal(validPassword("12345678"), true);
    assert.equal(validPassword("가".repeat(24)), true);
    assert.equal(validPassword("가".repeat(25)), false);
    assert.equal(validPassword("  password  "), true);
    assert.equal(validPassword("        "), false);
});
