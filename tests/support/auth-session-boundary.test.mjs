import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

import * as authErrors from "../../src/lib/authError.ts";
import { AuthRefreshError, AuthRequestError } from "../../src/services/authService.ts";

const clockStart = Date.UTC(2026, 9, 11, 12);

function loadSource(relativePath, modules, globals = {}) {
    // 실제 운영 소스를 실행하고 프레임워크·인증 서버 경계만 주입한다.
    const source = fs.readFileSync(new URL(`../../src/${relativePath}`, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
        },
    }).outputText;
    const exports = {};

    vm.runInNewContext(compiled, {
        exports,
        process: {
            env: {
                GOOGLE_CLIENT_ID: "unit-test-client",
                GOOGLE_CLIENT_SECRET: "unit-test-secret",
                NEXT_PUBLIC_API_URL: "https://api.example.test/api/v1",
            },
        },
        console: { error() {}, warn() {} },
        fetch: () => {
            throw new Error("실제 네트워크는 단위 테스트에서 사용할 수 없습니다.");
        },
        require: (name) => {
            assert.ok(name in modules, `Unexpected source dependency: ${name}`);
            return modules[name];
        },
        ...globals,
    }, { filename: relativePath });

    return exports;
}

function createAuthHarness({ refresh } = {}) {
    let now = clockStart;
    let issuedIds = 0;
    const loginCalls = [];
    const passwordCalls = [];
    const refreshCalls = [];
    const body = {
        accessToken: "access-next",
        refreshToken: "refresh-next",
        accessTokenExpiresIn: 3600,
        role: "USER",
        publicId: "TC-TEST-USER",
    };

    class ClockDate extends Date {
        static now() {
            return now;
        }
    }

    const { authOptions } = loadSource("lib/auth.ts", {
        "next-auth/providers/google": (options) => ({ id: "google", options }),
        "next-auth/providers/credentials": (options) => ({ id: "credentials", ...options }),
        "node:crypto": {
            createHash,
            randomUUID: () => `login-session-${++issuedIds}`,
        },
        "@/lib/authError": authErrors,
        "@/services/authService": {
            AuthRefreshError,
            AuthRequestError,
            authService: {
                authenticateWithGoogle: async (idToken) => {
                    loginCalls.push(idToken);
                    return { body };
                },
                authenticateWithPassword: async (email, password) => {
                    passwordCalls.push({ email, password });
                    return { body };
                },
                refreshAccessToken: async (refreshToken) => {
                    refreshCalls.push(refreshToken);
                    return refresh ? refresh(refreshCalls.length) : { body };
                },
            },
        },
    }, { Date: ClockDate });

    return {
        callbacks: authOptions.callbacks,
        credentials: authOptions.providers.find((provider) => provider.id === "credentials"),
        loginCalls,
        passwordCalls,
        refreshCalls,
        get issuedIds() { return issuedIds; },
        setNow(value) { now = value; },
    };
}

function validToken(overrides = {}) {
    return {
        sub: "unit-user",
        loginSessionId: "existing-login-session",
        accessToken: "access-current",
        refreshToken: "refresh-current",
        accessTokenExpires: clockStart + 3600000,
        role: "USER",
        publicId: "TC-TEST-USER",
        ...overrides,
    };
}

function deferred() {
    let resolve;
    const promise = new Promise((accept) => {
        resolve = accept;
    });

    return { promise, resolve };
}

function createApiHarness(getSession, { fetchResponse } = {}) {
    const requests = [];
    let unauthorizedCount = 0;
    const response = new Response(JSON.stringify({ body: true }), { status: 200 });
    const { apiClient } = loadSource("lib/apiClient.ts", {
        "next-auth/react": { getSession },
        "@/lib/authError": authErrors,
        "@/lib/authEvents": {
            notifyAuthUnauthorized: () => { unauthorizedCount += 1; },
        },
    }, {
        DOMException,
        FormData,
        Response,
        fetch: async (url, options) => {
            requests.push({ url, options });
            return fetchResponse ? fetchResponse(url, options) : response;
        },
    });

    return {
        apiClient,
        requests,
        response,
        get unauthorizedCount() { return unauthorizedCount; },
    };
}

test("실제 OAuth 로그인을 다시 하면 같은 사용자라도 새 로그인 식별자를 발급한다", async () => {
    // 준비
    const harness = createAuthHarness();
    const account = { provider: "google", id_token: "google-test-token" };
    const firstUser = { id: "unit-user" };
    const secondUser = { id: "unit-user" };

    // 실행: 실제 signIn 인증 결과를 JWT 콜백에 전달하며 두 번째 로그인도 새로 인증한다.
    const firstAccepted = await harness.callbacks.signIn({ account, user: firstUser });
    const first = await harness.callbacks.jwt({ token: validToken(), account, user: firstUser });
    const secondAccepted = await harness.callbacks.signIn({ account, user: secondUser });
    const second = await harness.callbacks.jwt({ token: first, account, user: secondUser });

    // 검증
    assert.equal(firstAccepted, true);
    assert.equal(secondAccepted, true);
    assert.equal(first.loginSessionId, "login-session-1");
    assert.equal(second.loginSessionId, "login-session-2");
    assert.equal(harness.issuedIds, 2);
    assert.deepEqual(harness.loginCalls, ["google-test-token", "google-test-token"]);
    assert.equal(second.publicId, first.publicId);
});

test("이메일 로그인도 authorize와 signIn 이후 실제 로그인마다 새 식별자를 발급한다", async () => {
    // 준비
    const harness = createAuthHarness();
    const account = { provider: "credentials" };
    const input = { email: " unit@example.test ", password: "unit-test-password" };

    // 실행: 비밀번호 인증 경로와 JWT 저장 경로를 실제 콜백 순서로 연결한다.
    const firstUser = await harness.credentials.authorize(input);
    const firstAccepted = await harness.callbacks.signIn({ account, user: firstUser });
    const first = await harness.callbacks.jwt({ token: validToken(), account, user: firstUser });
    const secondUser = await harness.credentials.authorize(input);
    const secondAccepted = await harness.callbacks.signIn({ account, user: secondUser });
    const second = await harness.callbacks.jwt({ token: first, account, user: secondUser });

    // 검증: 인증 수단에 관계없이 로그인 경계는 새로 발급되고 비밀번호는 JWT에 보관하지 않는다.
    assert.equal(firstAccepted, true);
    assert.equal(secondAccepted, true);
    assert.equal(first.loginSessionId, "login-session-1");
    assert.equal(second.loginSessionId, "login-session-2");
    assert.equal(second.password, undefined);
    assert.equal(firstUser.email, "unit@example.test");
    assert.equal(harness.passwordCalls.length, 2);
    assert.equal(harness.passwordCalls[0].email, "unit@example.test");
    assert.equal(harness.loginCalls.length, 0);
});

test("일반 세션 조회와 클라이언트 세션 업데이트는 로그인 식별자를 유지한다", async () => {
    // 준비
    const harness = createAuthHarness();
    const token = validToken();

    // 실행: 클라이언트가 보낸 세션 데이터로 로그인 경계를 덮어쓰지 않는다.
    const queried = await harness.callbacks.jwt({ token });
    const updated = await harness.callbacks.jwt({
        token: queried,
        trigger: "update",
        session: { loginSessionId: "client-supplied-session" },
    });

    // 검증
    assert.equal(queried.loginSessionId, token.loginSessionId);
    assert.equal(updated.loginSessionId, token.loginSessionId);
    assert.equal(updated.accessToken, token.accessToken);
    assert.equal(harness.issuedIds, 0);
    assert.equal(harness.refreshCalls.length, 0);
});

test("액세스 토큰과 갱신 토큰이 교체돼도 같은 로그인 식별자를 유지한다", async () => {
    // 준비
    const harness = createAuthHarness();
    const token = validToken({ accessTokenExpires: clockStart - 1 });

    // 실행
    const refreshed = await harness.callbacks.jwt({ token });

    // 검증
    assert.equal(refreshed.loginSessionId, token.loginSessionId);
    assert.equal(refreshed.accessToken, "access-next");
    assert.equal(refreshed.refreshToken, "refresh-next");
    assert.equal(refreshed.accessTokenExpires, clockStart + 3600000);
    assert.deepEqual(harness.refreshCalls, [token.refreshToken]);
    assert.equal(harness.issuedIds, 0);
});

test("일시적 갱신 오류와 대기 후 재시도에서도 로그인 식별자는 바뀌지 않는다", async () => {
    // 준비: 첫 갱신만 일시 실패하며 두 번째 호출부터 성공한다.
    const harness = createAuthHarness({
        refresh: async (call) => {
            if (call === 1) {
                throw new AuthRefreshError("temporarily unavailable", 503);
            }

            return { body: { accessToken: "access-recovered", accessTokenExpiresIn: 3600 } };
        },
    });
    const token = validToken({ accessTokenExpires: clockStart - 1 });

    // 실행 / 검증: 재시도 대기 중에는 서버를 다시 호출하지 않는다.
    const failed = await harness.callbacks.jwt({ token });
    const waiting = await harness.callbacks.jwt({ token: failed });

    assert.equal(failed.error, authErrors.AUTH_SESSION_ERROR.REFRESH_TEMPORARILY_UNAVAILABLE);
    assert.equal(failed.loginSessionId, token.loginSessionId);
    assert.equal(waiting.loginSessionId, token.loginSessionId);
    assert.equal(harness.refreshCalls.length, 1);

    // 실행 / 검증: 대기 만료 후 정상 회복해도 기존 식별자를 그대로 사용한다.
    harness.setNow(failed.refreshRetryAt + 1);
    const recovered = await harness.callbacks.jwt({ token: waiting });

    assert.equal(recovered.loginSessionId, token.loginSessionId);
    assert.equal(recovered.accessToken, "access-recovered");
    assert.equal(recovered.error, undefined);
    assert.equal(harness.refreshCalls.length, 2);
    assert.equal(harness.issuedIds, 0);
});

test("배포 전 JWT에는 식별자를 한 번 부여하고 이후 조회와 갱신에서 보존한다", async () => {
    // 준비
    const harness = createAuthHarness();
    const token = validToken({ loginSessionId: undefined });

    // 실행
    const migrated = await harness.callbacks.jwt({ token });
    const queried = await harness.callbacks.jwt({ token: migrated });
    const refreshed = await harness.callbacks.jwt({
        token: { ...queried, accessTokenExpires: clockStart - 1 },
    });

    // 검증: 입력 JWT 변경이나 매 조회 재발급 없이 생성한 값을 이어간다.
    assert.equal(token.loginSessionId, undefined);
    assert.equal(migrated.loginSessionId, "login-session-1");
    assert.equal(queried.loginSessionId, migrated.loginSessionId);
    assert.equal(refreshed.loginSessionId, migrated.loginSessionId);
    assert.equal(harness.issuedIds, 1);
});

test("동일한 레거시 쿠키를 동시에 읽어도 같은 로그인 식별자를 사용한다", async () => {
    // 준비: 아직 로그인 식별자가 없는 같은 쿠키를 독립 요청이 각각 디코딩한다.
    const harness = createAuthHarness();
    const token = validToken({ loginSessionId: undefined, jti: "legacy-cookie-id" });

    // 실행: 두 콜백 사이에 반환 JWT를 공유하지 않는다.
    const [first, concurrent] = await Promise.all([
        harness.callbacks.jwt({ token: { ...token } }),
        harness.callbacks.jwt({ token: { ...token } }),
    ]);
    const rotatedCookie = await harness.callbacks.jwt({
        token: { ...first, jti: "rotated-cookie-id", accessTokenExpires: clockStart - 1 },
    });
    const differentAccount = await harness.callbacks.jwt({
        token: { ...token, sub: "another-user" },
    });

    // 검증: 동시 읽기와 쿠키 회전은 같은 경계이며 다른 계정은 분리된다.
    assert.ok(first.loginSessionId);
    assert.equal(concurrent.loginSessionId, first.loginSessionId);
    assert.equal(rotatedCookie.loginSessionId, first.loginSessionId);
    assert.notEqual(differentAccount.loginSessionId, first.loginSessionId);
    assert.equal(harness.issuedIds, 0);
});

test("session 콜백은 JWT 로그인 식별자를 클라이언트 세션에 공개한다", async () => {
    // 준비
    const harness = createAuthHarness();
    const token = validToken();
    const session = { user: { name: "unit user" }, loginSessionId: "stale-session", expires: "future" };

    // 실행
    const result = await harness.callbacks.session({ session, token });

    // 검증: 로그인 경계와 기존 인증 정보가 함께 유지된다.
    assert.equal(result.loginSessionId, token.loginSessionId);
    assert.equal(result.accessToken, token.accessToken);
    assert.equal(result.user.publicId, token.publicId);
    assert.equal(result.user.role, token.role);
    assert.equal(result.user.name, "unit user");
});

test("getSession 대기 중 계정이 바뀐 영구 숨김 요청은 네트워크 전송 전에 중단한다", async () => {
    // 준비
    const sessionQuery = deferred();
    const harness = createApiHarness(() => sessionQuery.promise);

    // 실행: 기존 로그인에서 시작한 요청이 새 로그인 세션 응답을 받는다.
    const request = harness.apiClient("/support/notices/21/dismiss", { method: "PUT" }, "login-before");
    assert.equal(harness.requests.length, 0);
    sessionQuery.resolve({ loginSessionId: "login-after", accessToken: "new-user-token", user: {} });

    // 검증: 새 사용자 토큰으로 숨김 요청을 전송하거나 강제 로그아웃하지 않는다.
    await assert.rejects(request, (error) => error.name === "AbortError");
    assert.equal(harness.requests.length, 0);
    assert.equal(harness.unauthorizedCount, 0);
});

test("동일 로그인 세션의 요청은 갱신된 액세스 토큰으로 정상 전송한다", async () => {
    // 준비
    const sessionQuery = deferred();
    const harness = createApiHarness(() => sessionQuery.promise);
    const options = { method: "PUT", headers: { "X-Test": "guarded" }, body: JSON.stringify({ value: true }) };

    // 실행
    const request = harness.apiClient("/support/notices/21/dismiss", options, "same-login");
    sessionQuery.resolve({ loginSessionId: "same-login", accessToken: "rotated-access-token", user: {} });
    const response = await request;

    // 검증: 경계 확인 외 요청 구성과 정상 응답은 변경되지 않는다.
    assert.equal(response, harness.response);
    assert.equal(harness.requests.length, 1);
    assert.equal(harness.requests[0].url, "https://api.example.test/api/v1/support/notices/21/dismiss");
    assert.equal(harness.requests[0].options.method, "PUT");
    assert.equal(harness.requests[0].options.body, options.body);
    assert.equal(harness.requests[0].options.headers.Authorization, "Bearer rotated-access-token");
    assert.equal(harness.requests[0].options.headers["X-Test"], "guarded");
});

test("세션이 사라지거나 식별자가 없어진 보호 요청도 전송하지 않는다", async () => {
    // 준비: 로그아웃 및 전환 중 아직 식별자가 없는 세션을 각각 검사한다.
    for (const session of [null, { accessToken: "legacy-token", user: {} }]) {
        const harness = createApiHarness(async () => session);

        // 실행 / 검증
        await assert.rejects(
            harness.apiClient("/support/notices/urgent", {}, "expected-login"),
            (error) => error.name === "AbortError",
        );
        assert.equal(harness.requests.length, 0);
    }
});

test("세션 조회가 응답하지 않아도 요청 취소는 즉시 처리하고 뒤늦은 결과를 전송하지 않는다", { timeout: 2000 }, async () => {
    // 준비: fetch를 시작하기 전의 getSession 자체가 대기 중인 상황이다.
    const sessionQuery = deferred();
    const controller = new AbortController();
    const harness = createApiHarness(() => sessionQuery.promise);

    // 실행: 타임아웃이나 언마운트가 요청의 취소 신호를 발생시킨다.
    const request = harness.apiClient("/support/notices/urgent", { signal: controller.signal }, "current-login");
    controller.abort();

    // 검증: getSession 완료를 기다리지 않고 중단된다.
    await assert.rejects(request, (error) => error.name === "AbortError");
    assert.equal(harness.requests.length, 0);

    // 실행 / 검증: 취소된 세션 요청이 뒤늦게 성공해도 API 요청을 재개하지 않는다.
    sessionQuery.resolve({ loginSessionId: "current-login", accessToken: "current-token", user: {} });
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(harness.requests.length, 0);
    assert.equal(harness.unauthorizedCount, 0);
});

test("이전 계정의 늦은 401 응답은 새 계정을 로그아웃시키지 않는다", async () => {
    // 준비: 첫 세션은 유효해서 요청이 이미 네트워크로 전송된 상태를 만든다.
    let currentSession = { loginSessionId: "before-switch", accessToken: "old-token", user: {} };
    let sessionQueries = 0;
    const requestStarted = deferred();
    const serverResponse = deferred();
    const harness = createApiHarness(async () => {
        sessionQueries += 1;
        return currentSession;
    }, {
        fetchResponse: () => {
            requestStarted.resolve();
            return serverResponse.promise;
        },
    });

    // 실행: 송신 이후 계정을 바꾸고 이전 계정 요청에 대한 401이 늦게 도착한다.
    const request = harness.apiClient("/support/notices/urgent", {}, "before-switch");
    await requestStarted.promise;
    currentSession = { loginSessionId: "after-switch", accessToken: "new-token", user: {} };
    serverResponse.resolve(new Response(null, { status: 401 }));

    // 검증: 응답 처리에서도 세션 경계를 재확인하고 전역 로그아웃 이벤트는 보내지 않는다.
    await assert.rejects(request, (error) => error.name === "AbortError");
    assert.equal(harness.requests.length, 1);
    assert.equal(sessionQueries, 2);
    assert.equal(harness.unauthorizedCount, 0);
});

test("동일 로그인 세션의 401 응답은 기존 인증 만료 알림을 유지한다", async () => {
    // 준비
    let sessionQueries = 0;
    const harness = createApiHarness(async () => {
        sessionQueries += 1;
        return { loginSessionId: "same-login", accessToken: "expired-token", user: {} };
    }, {
        fetchResponse: async () => new Response(null, { status: 401 }),
    });

    // 실행
    const response = await harness.apiClient("/support/notices/urgent", {}, "same-login");

    // 검증: 다른 계정 응답을 무시하는 정책이 정상적인 만료 처리를 막지 않는다.
    assert.equal(response.status, 401);
    assert.equal(sessionQueries, 2);
    assert.equal(harness.requests.length, 1);
    assert.equal(harness.unauthorizedCount, 1);
});

test("이전 세션의 종료 오류나 누락된 토큰도 새 계정을 로그아웃시키지 않는다", async () => {
    // 준비: 초기 세션 결과는 이전 계정이지만 실패 처리 시점에는 다른 계정이 로그인했다.
    const staleSessions = [
        {
            loginSessionId: "old-login",
            accessToken: "old-token",
            error: authErrors.AUTH_SESSION_ERROR.REFRESH_FAILED,
            user: {},
        },
        { loginSessionId: "old-login", user: {} },
    ];

    for (const staleSession of staleSessions) {
        let sessionQueries = 0;
        const harness = createApiHarness(async () => {
            sessionQueries += 1;
            return sessionQueries === 1
                ? staleSession
                : { loginSessionId: "new-login", accessToken: "new-token", user: {} };
        });

        // 실행 / 검증: API 송신 이전 실패도 현재 세션을 확인한 뒤 안전하게 취소한다.
        await assert.rejects(
            harness.apiClient("/support/notices/urgent", {}, "old-login"),
            (error) => error.name === "AbortError",
        );
        assert.equal(sessionQueries, 2);
        assert.equal(harness.requests.length, 0);
        assert.equal(harness.unauthorizedCount, 0);
    }
});

test("로그인 경계 인자를 사용하지 않는 기존 API 호출은 이전처럼 동작한다", async () => {
    // 준비: 기존 호출자는 loginSessionId가 없는 세션도 사용한다.
    const harness = createApiHarness(async () => ({ accessToken: "legacy-token", user: {} }));

    // 실행
    const response = await harness.apiClient("/profile");

    // 검증
    assert.equal(response, harness.response);
    assert.equal(harness.requests.length, 1);
    assert.equal(harness.requests[0].url, "https://api.example.test/api/v1/profile");
    assert.equal(harness.requests[0].options.headers.Authorization, "Bearer legacy-token");
});

test("로그인 경계 인자가 없는 기존 비로그인 요청은 401을 반환한다", async () => {
    // 준비
    const harness = createApiHarness(async () => null);

    // 실행
    const response = await harness.apiClient("/profile");

    // 검증
    assert.equal(response.status, 401);
    assert.equal(harness.requests.length, 0);
});
