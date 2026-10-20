import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import fs from "node:fs";
import { setImmediate } from "node:timers/promises";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

import { isPublicDocsPath, PUBLIC_AUTH_PAGES, stripLocalePrefix } from "../../src/lib/authPolicy.ts";
import * as policy from "../../src/lib/mobileAuthPolicy.ts";

const requestId = "55b79b33-07b9-4d4b-a3f8-cf24ea76b139";
const otherRequestId = "55b79b33-07b9-4d4b-a3f8-cf24ea76b138";
const origin = "https://translacat.vercel.app";
const authorization = { redirectUri: policy.MOBILE_AUTH_CALLBACK, code: "c".repeat(43), state: "s".repeat(43) };
const testEnvironment = {
    NEXTAUTH_URL: origin, API_URL: "https://api.example.test/api/v1",
    NEXTAUTH_SECRET: "synthetic-mobile-approval-secret-not-a-real-credential",
    MOBILE_AUTH_APPROVAL_SECRET: "synthetic-dedicated-fe-be-approval-key-not-real",
};

function loadSource(relative, modules, globals = {}) {
    const source = fs.readFileSync(new URL(`../../src/${relative}`, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
        exports, Date, URL, Buffer, Request, Response, TextEncoder, TextDecoder, AbortSignal,
        process: { env: testEnvironment }, console: { error() {}, warn() {}, log() {} },
        require(name) {
            assert.ok(name in modules, `Unexpected dependency: ${name}`);
            return modules[name];
        },
        ...globals,
    });
    return exports;
}

function session(overrides = {}) {
    return {
        accessToken: "synthetic-web-access", refreshToken: "synthetic-web-refresh", loginSessionId: "web-login-a",
        user: { publicId: "alice", name: "Alice", email: "alice@example.test", accessTokenExpires: Date.now() + 600000 },
        ...overrides,
    };
}

function harness({ currentSession = session(), response = () => new Response(JSON.stringify({ body: authorization })), env = testEnvironment, clock } = {}) {
    const calls = [];
    let current = currentSession;
    const server = loadSource("lib/mobileAuthApproval.ts", {
        "server-only": {}, "node:crypto": crypto, "@/lib/mobileAuthPolicy": policy,
    }, {
        process: { env },
        Date: clock === undefined ? Date : class extends Date { static now() { return clock; } },
        fetch: async (...args) => { calls.push(args); return response(...args); },
    });
    const route = loadSource("app/api/auth/mobile/approve/route.ts", {
        "next-auth": { getServerSession: async () => current },
        "next/server": { NextResponse: { json: (body, options) => new Response(JSON.stringify(body), options) } },
        "@/lib/auth": { authOptions: {} }, "@/lib/mobileAuthApproval": server,
    });
    function request(body = { requestId }, headers = {}) {
        return new Request(origin + "/api/auth/mobile/approve", {
            method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
        });
    }
    function approvedRequest(body = { requestId }, headers = {}, csrfSession = current) {
        const token = server.createMobileApprovalCsrf(requestId, csrfSession);
        return request(body, { "X-TranslaCat-Mobile-CSRF": token, ...headers });
    }
    return { server, route, calls, request, approvedRequest, setSession: value => { current = value; } };
}

test("모바일 승인 화면만 locale별 공개하며 Google callback은 고정 상대 경로다", () => {
    // 준비 및 실행
    for (const locale of ["ko", "ja", "en", "learning"]) {
        const callback = policy.mobileSignInPath(locale, requestId);
        const parsed = new URL(callback, origin);

        // 검증: 기존 로그인 페이지 목록을 유지하며 승인 endpoint나 유사 경로는 공개하지 않는다.
        assert.equal(parsed.origin, origin);
        assert.equal(parsed.pathname, `/${locale}/mobile/sign-in`);
        assert.equal(parsed.searchParams.get("requestId"), requestId);
        assert.ok(PUBLIC_AUTH_PAGES.includes(stripLocalePrefix(parsed.pathname, ["ko", "ja", "en", "learning"])));
    }
    assert.ok(PUBLIC_AUTH_PAGES.includes("/login"));
    assert.equal(PUBLIC_AUTH_PAGES.includes("/mobile/sign-in/extra"), false);
    assert.equal(policy.mobileSignInPath("//evil.test", requestId), `/ko/mobile/sign-in?requestId=${requestId}`);
    for (const invalid of [requestId.toUpperCase(), "../login", "1", [requestId]]) {
        assert.equal(policy.validMobileRequestId(invalid), false);
    }
});

test("앱 callback은 고정 scheme·host·path와 정확한 일회 파라미터만 허용한다", () => {
    // 준비
    const callback = policy.buildMobileCallback(requestId, authorization);

    // 실행 및 검증
    assert.equal(policy.validMobileCallback(callback, requestId), true);
    assert.equal(policy.validMobileCallback(callback, otherRequestId), false);
    const invalidUris = [
        "https://evil.test/callback", "translacat://auth/callback", "translacat-preview://auth/callback",
        "translacat-dev://evil.test/callback", "translacat-dev://user@auth/callback", "translacat-dev://@auth/callback", "translacat-dev://auth:443/callback",
        "translacat-dev://auth/other", "translacat-dev://auth/callback/", "translacat-dev://auth/callback?extra=1",
        "translacat-dev://auth/callback#fragment",
    ];
    for (const redirectUri of invalidUris) {
        assert.equal(policy.buildMobileCallback(requestId, { ...authorization, redirectUri }), null);
        assert.equal(policy.validMobileCallback(redirectUri + new URL(callback).search, requestId), false);
    }
    for (const extra of ["&accessToken=secret", "&code=" + "c".repeat(43), "#fragment"]) {
        assert.equal(policy.validMobileCallback(callback + extra, requestId), false);
    }
    for (const changed of [{ code: "c".repeat(42) }, { code: "x/".repeat(22) }, { state: "s".repeat(42) }, { state: "s".repeat(129) }]) {
        assert.equal(policy.buildMobileCallback(requestId, { ...authorization, ...changed }), null);
    }
});

function proxyHarness(status = 200) {
    const calls = [];
    const middleware = loadSource("proxy.ts", {
        "next/server": { NextResponse: { next: () => new Response(null) } },
        "next-intl/middleware": { default: () => request => {
            calls.push("intl");
            const url = new URL(request.url);
            const unprefixed = url.pathname === "/mobile/sign-in";
            if (unprefixed) url.pathname = "/ko/mobile/sign-in";
            return new Response(null, {
                status: unprefixed ? 307 : status, headers: unprefixed ? { Location: url.toString() } : {},
            });
        } },
        "next-auth/middleware": { withAuth: () => () => { calls.push("auth"); return new Response(null, { status: 401 }); } },
        "@/i18n/config": { locales: ["ko", "ja", "en", "learning"] },
        "@/lib/authError": { isTerminalAuthError: () => false },
        "@/lib/authPolicy": { isPublicDocsPath, PUBLIC_AUTH_PAGES, stripLocalePrefix },
    }).default;
    const run = pathname => {
        const url = new URL(pathname, origin);
        return middleware({ url: url.toString(), nextUrl: url });
    };
    return { calls, run };
}

test("승인 화면의 locale redirect·성공·오류 응답에만 no-store/referrer/iframe 제한을 적용한다", () => {
    // 준비 및 실행
    for (const status of [200, 400]) {
        const h = proxyHarness(status);
        for (const pathname of ["/mobile/sign-in", "/ko/mobile/sign-in", "/ja/mobile/sign-in", "/en/mobile/sign-in"]) {
            const response = h.run(pathname + "?requestId=" + requestId);

            // 검증: 최초 locale redirect에서도 요청 ID를 보존하며 승인 화면을 frame에 넣지 못한다.
            assert.equal(response.headers.get("Cache-Control"), "no-store");
            assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
            assert.equal(response.headers.get("X-Frame-Options"), "DENY");
            assert.equal(response.headers.get("Content-Security-Policy"), "frame-ancestors 'none'");
            if (pathname === "/mobile/sign-in") {
                assert.equal(response.status, 307);
                assert.equal(response.headers.get("Location"), origin + "/ko/mobile/sign-in?requestId=" + requestId);
            } else assert.equal(response.status, status);
        }
        assert.equal(h.calls.includes("auth"), false);
    }
});

test("다른 로그인·문서·보호 페이지와 비슷한 경로의 인증 및 헤더 정책은 유지한다", () => {
    // 준비
    const h = proxyHarness();

    // 실행 및 검증
    for (const [pathname, boundary] of [
        ["/ko/login", "intl"], ["/ja/register", "intl"], ["/ko/error", "intl"], ["/ko/docs", "intl"],
        ["/ko/settings/account", "auth"], ["/ko/mobile/sign-in/other", "auth"], ["/ko/mobile/sign-in-other", "auth"],
    ]) {
        h.calls.length = 0;
        const response = h.run(pathname);
        assert.deepEqual(h.calls, [boundary]);
        for (const header of ["Referrer-Policy", "X-Frame-Options", "Content-Security-Policy", "Cache-Control"]) {
            assert.equal(response.headers.get(header), null);
        }
    }
});

test("명시적 승인 POST는 현재 웹 access를 고정 BE 경로에만 보내고 브라우저에 반환하지 않는다", async () => {
    // 준비
    const h = harness();

    // 실행
    const response = await h.route.POST(h.approvedRequest());
    const result = await response.json();

    // 검증
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
    assert.equal(h.calls.length, 1);
    const [url, options] = h.calls[0];
    assert.equal(String(url), "https://api.example.test/api/v1/auth/mobile/authorize");
    assert.equal(options.headers.Authorization, "Bearer synthetic-web-access");
    const timestamp = options.headers["X-Mobile-Approval-Timestamp"];
    assert.match(timestamp, /^\d+$/);
    assert.ok(Math.abs(Number(timestamp) - Math.floor(Date.now() / 1000)) <= 1);
    const canonical = ["mobile-auth-approval-v1", "POST", "/api/v1/auth/mobile/authorize", requestId,
        crypto.createHash("sha256").update("synthetic-web-access").digest("hex"), timestamp].join("\n");
    assert.equal(options.headers["X-Mobile-Approval-Signature"],
        crypto.createHmac("sha256", testEnvironment.MOBILE_AUTH_APPROVAL_SECRET).update(canonical).digest("hex"));
    assert.deepEqual(JSON.parse(options.body), { requestId });
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    assert.equal(policy.validMobileCallback(result.body.callbackUrl, requestId), true);
    assert.equal(JSON.stringify(result).includes("synthetic-web-"), false);
    assert.equal(JSON.stringify(result).includes(options.headers["X-Mobile-Approval-Signature"]), false);
});

test("별도 FE↔BE 승인 키가 없거나 짧거나 웹 쿠키 키와 같으면 네트워크 전에 503으로 닫는다", async () => {
    // 준비 및 실행: 실제 환경 값을 생성하거나 읽지 않고 합성 설정만 대체한다.
    for (const value of [undefined, "too-short", testEnvironment.NEXTAUTH_SECRET]) {
        const h = harness({ env: { ...testEnvironment, MOBILE_AUTH_APPROVAL_SECRET: value } });
        const response = await h.route.POST(h.approvedRequest());

        // 검증
        assert.equal(response.status, 503);
        assert.equal((await response.json()).body.errorCode, "MOBILE_AUTH_NOT_CONFIGURED");
        assert.equal(h.calls.length, 0);
    }
});

test("승인 서명은 BE가 독립 계산한 공개 고정 fixture와 정확히 일치한다", async () => {
    // 준비: 실제 비밀값이 아닌 .NET HMAC으로 별도 계산한 상호운용 fixture다.
    const fixtureId = "11111111-1111-4111-8111-111111111111";
    const h = harness({
        env: { ...testEnvironment, MOBILE_AUTH_APPROVAL_SECRET: "synthetic-mobile-approval-key-for-tests-2026" },
        clock: 1800000000000,
    });

    // 실행
    await h.server.authorizeMobileApproval(fixtureId, "synthetic.access.token");

    // 검증: canonical 줄 순서·bearer hash·UTF-8 키·끝 newline 유무가 서버 계약과 일치한다.
    const headers = h.calls[0][1].headers;
    assert.equal(headers["X-Mobile-Approval-Timestamp"], "1800000000");
    assert.equal(headers["X-Mobile-Approval-Signature"], "81e5001286c1b1ba31f5f805ff96b6d17f7fdd7d1ebbc366cbb3e36e9acf25bf");
});

test("다른 출처·누락 Origin·교차 사이트 승인은 BE 호출 전에 차단한다", async () => {
    // 준비 및 실행
    for (const headers of [
        { Origin: "https://evil.test" }, { Origin: "null" }, { Origin: "" },
        { Origin: origin + "/path" }, { "Sec-Fetch-Site": "cross-site" },
    ]) {
        const h = harness();
        const response = await h.route.POST(h.approvedRequest({ requestId }, headers));

        // 검증
        assert.equal(response.status, 403);
        assert.equal(h.calls.length, 0);
        assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
    }
});

test("CSRF는 요청·계정·로그인 세션·만료에 묶이며 위조나 이전 화면 승인을 차단한다", async () => {
    // 준비
    const h = harness();
    const sameUser = session();
    const token = h.server.createMobileApprovalCsrf(requestId, sameUser);
    const variants = [
        "", token.slice(0, -1) + (token.endsWith("x") ? "y" : "x"),
        h.server.createMobileApprovalCsrf(otherRequestId, sameUser),
        h.server.createMobileApprovalCsrf(requestId, session({ loginSessionId: "different-web-login" })),
        h.server.createMobileApprovalCsrf(requestId, session({ user: { ...sameUser.user, publicId: "bob" } })),
        h.server.createMobileApprovalCsrf(requestId, sameUser, Date.now() - 300001),
    ];

    // 실행 및 검증
    for (const csrf of variants) {
        const response = await h.route.POST(h.request({ requestId }, { "X-TranslaCat-Mobile-CSRF": csrf }));
        assert.equal(response.status, 403);
        assert.equal(h.calls.length, 0);
    }
});

test("웹 세션 누락·오류·access 만료는 승인할 수 없다", async () => {
    // 준비 및 실행
    const valid = session();
    for (const currentSession of [
        null, session({ error: "RefreshAccessTokenError" }), session({ error: "RefreshAccessTokenTemporarilyUnavailable" }),
        session({ accessToken: "" }), session({ loginSessionId: "" }),
        session({ user: { ...valid.user, accessTokenExpires: Date.now() - 1 } }),
    ]) {
        const h = harness({ currentSession });
        const response = await h.route.POST(h.request());

        // 검증
        assert.equal(response.status, 401);
        assert.equal(h.calls.length, 0);
    }
});

test("requestId 외 token·redirect·계정 필드와 잘못된 JSON 형식을 받지 않는다", async () => {
    // 준비 및 실행
    for (const body of [
        {}, [], null, { requestId: "../login" }, { requestId: requestId.toUpperCase() },
        { requestId, accessToken: "synthetic-forged-token" }, { requestId, redirectUri: "https://evil.test" },
        { requestId, userId: 2 },
    ]) {
        const h = harness();
        const response = await h.route.POST(h.request(body));

        // 검증
        assert.equal(response.status, 400);
        assert.equal(h.calls.length, 0);
    }
    const h = harness();
    assert.equal((await h.route.POST(h.request({ requestId }, { "Content-Type": "text/plain" }))).status, 400);
    assert.equal(h.calls.length, 0);
});

test("Content-Length 없는 대형 승인 본문도 읽기 중 중단한다", async () => {
    // 준비
    const h = harness();
    let cancelled = false;
    const body = new ReadableStream({
        start(controller) { controller.enqueue(new TextEncoder().encode("x".repeat(2048))); },
        cancel() { cancelled = true; },
    });
    const request = new Request(origin + "/api/auth/mobile/approve", {
        method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body, duplex: "half",
    });

    // 실행 및 검증
    const response = await h.route.POST(request);
    assert.equal(response.status, 413);
    assert.equal(cancelled, true);
    assert.equal(h.calls.length, 0);
});

test("BE 오류 원문과 비허용 callback을 브라우저에 반사하지 않는다", async () => {
    // 준비
    const cases = [
        { status: 410, body: { errorCode: "MOBILE_AUTH_EXPIRED", message: "synthetic-private-detail" }, expected: "MOBILE_AUTH_EXPIRED" },
        { status: 400, body: { errorCode: "SYNTHETIC_PRIVATE_DETAIL" }, expected: "MOBILE_AUTH_UNAVAILABLE" },
        { status: 200, body: { ...authorization, redirectUri: "https://evil.test/private" }, expected: "MOBILE_AUTH_UNAVAILABLE" },
        { status: 200, body: { ...authorization, code: "invalid-code" }, expected: "MOBILE_AUTH_UNAVAILABLE" },
    ];

    // 실행 및 검증
    for (const item of cases) {
        const h = harness({ response: () => new Response(JSON.stringify({ body: item.body }), { status: item.status }) });
        const response = await h.route.POST(h.approvedRequest());
        const result = await response.json();
        assert.equal(result.body.errorCode, item.expected);
        assert.equal(JSON.stringify(result).includes("private"), false);
        assert.equal(JSON.stringify(result).includes("synthetic-web-access"), false);
        assert.equal(response.headers.get("Cache-Control"), "no-store");
    }
});

test("BE redirect·네트워크 오류와 서버 설정 누락은 안전하게 실패한다", async () => {
    // 준비 및 실행
    const h = harness({ response: () => { throw new Error("synthetic network error containing credentials"); } });
    const response = await h.route.POST(h.approvedRequest());

    // 검증
    assert.equal(response.status, 503);
    assert.equal((await response.json()).body.errorCode, "MOBILE_AUTH_UNAVAILABLE");
    assert.equal(h.calls[0][1].redirect, "error");
    const missing = harness({ env: { ...testEnvironment, API_URL: undefined } });
    assert.equal((await missing.route.POST(missing.approvedRequest())).status, 503);
    assert.equal(missing.calls.length, 0);
});

function pageHarness(currentSession, env = testEnvironment) {
    const h = harness({ env });
    let sessionCalls = 0;
    const page = loadSource("app/[locale]/(auth)/mobile/sign-in/page.tsx", {
        "react/jsx-runtime": jsxRuntime,
        "next-auth": { getServerSession: async () => { sessionCalls++; return currentSession; } },
        "@/lib/auth": { authOptions: {} }, "@/lib/mobileAuthPolicy": policy,
        "@/lib/mobileAuthApproval": h.server, "@/components/auth/MobileSignIn": { default: () => null },
    });
    return { page, sessionCalls: () => sessionCalls, calls: h.calls };
}

test("승인 페이지는 계정 표시와 세션 바인딩 CSRF만 전달하고 자동 승인하지 않는다", async () => {
    // 준비
    const h = pageHarness(session());

    // 실행
    const element = await h.page.default({ params: Promise.resolve({ locale: "ko" }), searchParams: Promise.resolve({ requestId }) });

    // 검증
    assert.equal(element.props.account.email, "alice@example.test");
    assert.equal(element.props.callbackPath, `/ko/mobile/sign-in?requestId=${requestId}`);
    assert.equal(typeof element.props.csrfToken, "string");
    assert.equal(JSON.stringify(element.props).includes("synthetic-web-"), false);
    assert.equal(h.calls.length, 0);
    assert.equal(h.page.dynamic, "force-dynamic");
    assert.equal(h.page.metadata.referrer, "no-referrer");
    assert.equal(h.page.metadata.robots.index, false);
});

test("미로그인 페이지는 Google 복귀 경로만 준비하고 비정상 query는 인증 조회도 하지 않는다", async () => {
    // 준비
    const anonymous = pageHarness(null);

    // 실행 및 검증
    const element = await anonymous.page.default({ params: Promise.resolve({ locale: "ja" }), searchParams: Promise.resolve({ requestId }) });
    assert.equal(element.props.account, null);
    assert.equal(element.props.csrfToken, null);
    assert.equal(element.props.callbackPath, `/ja/mobile/sign-in?requestId=${requestId}`);
    assert.equal(anonymous.calls.length, 0);
    for (const query of [{}, { requestId: [requestId, otherRequestId] }, { requestId, redirect: "https://evil.test" }]) {
        const invalid = pageHarness(session());
        const page = await invalid.page.default({ params: Promise.resolve({ locale: "ko" }), searchParams: Promise.resolve(query) });
        assert.equal(page.props.requestId, null);
        assert.equal(invalid.sessionCalls(), 0);
    }
});

test("승인 서버 키가 준비되지 않으면 페이지도 Google 로그인 시작을 유도하지 않는다", async () => {
    // 준비
    const h = pageHarness(null, { ...testEnvironment, MOBILE_AUTH_APPROVAL_SECRET: undefined });

    // 실행
    const element = await h.page.default({ params: Promise.resolve({ locale: "ko" }), searchParams: Promise.resolve({ requestId }) });

    // 검증
    assert.equal(element.props.unavailable, true);
    assert.equal(element.props.csrfToken, null);
    assert.equal(element.props.account, null);
    assert.equal(h.sessionCalls(), 0);
    assert.equal(h.calls.length, 0);
});

function clientHarness(response = { body: { callbackUrl: policy.buildMobileCallback(requestId, authorization) } }, { navigationError = false, beforeResponse } = {}) {
    const calls = { google: [], cancel: [], fetch: [], navigation: [], state: [] };
    const hooks = [];
    let hookIndex = 0;
    const renderComponent = loadSource("components/auth/MobileSignIn.tsx", {
        "react/jsx-runtime": jsxRuntime,
        "react": {
            useState(initial) {
                const index = hookIndex++;
                if (!(index in hooks)) hooks[index] = initial;
                return [hooks[index], value => { hooks[index] = value; calls.state.push(value); }];
            },
            useRef(initial) {
                const index = hookIndex++;
                if (!(index in hooks)) hooks[index] = { current: initial };
                return hooks[index];
            },
        },
        "next-auth/react": { signIn: async (...args) => { calls.google.push(args); } },
        "@/components/auth/AuthFormParts": {
            AuthPageFrame: ({ children }) => React.createElement("section", null, children),
            authButtonClass: "primary", authSecondaryClass: "secondary",
        },
        "@/lib/mobileAuthPolicy": policy,
        "@/services/identityClient": { identityRequest: async (...args) => { calls.cancel.push(args); } },
    }, {
        fetch: async (...args) => {
            calls.fetch.push(args);
            await beforeResponse?.();
            return new Response(JSON.stringify(response));
        },
        window: { location: { assign: value => {
            calls.navigation.push(value);
            if (navigationError) throw new Error("synthetic app navigation failure");
        } } },
    }).default;
    function component(props) {
        hookIndex = 0;
        return renderComponent(props);
    }
    return { calls, component };
}

function buttons(element) {
    if (!element || typeof element !== "object") return [];
    const children = React.Children.toArray(element.props?.children).flatMap(buttons);
    return element.type === "button" ? [element, ...children] : children;
}

function links(element) {
    if (!element || typeof element !== "object") return [];
    const children = React.Children.toArray(element.props?.children).flatMap(links);
    return element.type === "a" ? [element, ...children] : children;
}

function approvedClientProps(locale = "ko") {
    return {
        locale, requestId, callbackPath: policy.mobileSignInPath(locale, requestId), csrfToken: "synthetic-csrf",
        account: { name: "Alice", email: "alice@example.test", publicId: "alice" },
    };
}

test("계정 화면을 렌더링하거나 Google에 로그인하는 것만으로는 승인 API를 호출하지 않는다", async () => {
    // 준비
    const h = clientHarness();
    const element = h.component({
        locale: "ko", requestId, callbackPath: policy.mobileSignInPath("ko", requestId), csrfToken: null, account: null,
    });

    // 실행 및 검증: 명시적 Google 버튼만 기존 취소→OAuth 경로를 시작한다.
    assert.equal(h.calls.fetch.length, 0);
    buttons(element)[0].props.onClick();
    await setImmediate();
    assert.deepEqual(JSON.parse(JSON.stringify(h.calls.cancel[0])), ["/api/account/google/cancel", {}]);
    assert.equal(h.calls.google[0][0], "google");
    assert.equal(h.calls.google[0][1].callbackUrl, `/ko/mobile/sign-in?requestId=${requestId}`);
    assert.equal(h.calls.google[0][2].prompt, "select_account");
    assert.equal(h.calls.fetch.length, 0);
    assert.equal(h.calls.navigation.length, 0);
});

test("계정을 명시한 승인 버튼만 CSRF와 requestId를 보내고 검증한 앱 callback으로 이동한다", async () => {
    // 준비
    const h = clientHarness();
    const element = h.component({
        locale: "ko", requestId, callbackPath: policy.mobileSignInPath("ko", requestId), csrfToken: "synthetic-csrf",
        account: { name: "Alice", email: "alice@example.test", publicId: "alice" },
    });
    const html = renderToStaticMarkup(element);
    assert.match(html, /alice@example\.test/);
    assert.match(html, /이 계정으로 앱에 로그인/);
    assert.equal(h.calls.fetch.length, 0);

    // 실행
    buttons(element)[0].props.onClick();
    await setImmediate();

    // 검증
    assert.equal(h.calls.fetch.length, 1);
    const [path, options] = h.calls.fetch[0];
    assert.equal(path, "/api/auth/mobile/approve");
    assert.deepEqual(JSON.parse(options.body), { requestId });
    assert.equal(options.headers["X-TranslaCat-Mobile-CSRF"], "synthetic-csrf");
    assert.equal(options.referrerPolicy, "no-referrer");
    assert.equal(h.calls.navigation.length, 1);
    assert.equal(policy.validMobileCallback(h.calls.navigation[0], requestId), true);
});

test("브라우저는 승인 응답의 임의 웹 주소로 이동하지 않는다", async () => {
    // 준비
    const h = clientHarness({ body: { callbackUrl: "https://evil.test/private" } });
    const element = h.component({
        locale: "ko", requestId, callbackPath: policy.mobileSignInPath("ko", requestId), csrfToken: "synthetic-csrf",
        account: { name: "Alice", email: "alice@example.test", publicId: "alice" },
    });

    // 실행 및 검증
    buttons(element)[0].props.onClick();
    await setImmediate();
    assert.equal(h.calls.navigation.length, 0);
    assert.equal(h.calls.state.some(value => typeof value === "string" && value.includes("evil.test")), false);
});

test("승인 후 모든 언어에서 앱 복귀 안내와 검증 callback 직접 링크만 표시한다", async () => {
    // 준비: learning도 기존 정책대로 일본어로 안내한다.
    const expectedText = {
        ko: ["앱 로그인을 승인했어요", "브라우저를 닫고 TranslaCat 앱을 열어 주세요"],
        ja: ["ログインを承認しました", "ブラウザーを閉じてTranslaCatアプリを開いてください"],
        en: ["App sign-in approved", "close the browser and open the TranslaCat app"],
        learning: ["ログインを承認しました", "ブラウザーを閉じてTranslaCatアプリを開いてください"],
    };
    for (const [locale, messages] of Object.entries(expectedText)) {
        const h = clientHarness();
        const props = approvedClientProps(locale);
        const initial = h.component(props);
        const approve = buttons(initial)[0].props.onClick;

        // 실행: 승인 후 실제 hook 상태로 화면을 다시 그린다.
        approve();
        await setImmediate();
        const completed = h.component(props);
        const html = renderToStaticMarkup(completed);
        const [returnLink] = links(completed);
        approve();
        await setImmediate();

        // 검증: 앱의 로그인 성공을 단정하거나 승인 POST를 반복하지 않는다.
        for (const message of messages) assert.ok(html.includes(message), locale);
        assert.match(html, /role="status"/);
        assert.equal(html.includes("alice@example.test"), false);
        assert.equal(buttons(completed).length, 0);
        assert.equal(links(completed).length, 1);
        assert.equal(returnLink.props.href, h.calls.navigation[0]);
        assert.equal(policy.validMobileCallback(returnLink.props.href, requestId), true);
        assert.equal(returnLink.props.referrerPolicy, "no-referrer");
        assert.equal(returnLink.props.rel, "noreferrer");
        assert.equal(returnLink.props.onClick, undefined);
        assert.equal(h.calls.fetch.length, 1);
        assert.equal(h.calls.navigation.length, 1);
        assert.equal(h.calls.google.length, 0);
    }
});

test("앱 자동 이동이 throw되어도 승인 완료를 보존하고 다시 승인하지 않는다", async () => {
    // 준비
    const h = clientHarness(undefined, { navigationError: true });
    const props = approvedClientProps();
    const approve = buttons(h.component(props))[0].props.onClick;

    // 실행: 브라우저가 자동 앱 이동을 거부한 뒤 남아 있는 승인 버튼 핸들러도 호출한다.
    approve();
    await setImmediate();
    approve();
    await setImmediate();
    const completed = h.component(props);
    const html = renderToStaticMarkup(completed);

    // 검증: 일반 승인 실패 대신 앱 복귀 실패만 안내하며 같은 검증 callback 링크를 유지한다.
    assert.ok(html.includes("앱 로그인을 승인했어요"));
    assert.ok(html.includes("앱을 자동으로 열지 못했어요"));
    assert.equal(html.includes("로그인을 완료하지 못했어요"), false);
    assert.equal(html.includes("synthetic app navigation failure"), false);
    assert.equal(links(completed)[0].props.href, h.calls.navigation[0]);
    assert.equal(h.calls.fetch.length, 1);
    assert.equal(h.calls.navigation.length, 1);
});

test("승인 응답을 기다리는 동안 재렌더링 전 연속 클릭도 POST 한 번만 보낸다", async () => {
    // 준비: 네트워크 대신 합성 promise로 승인 응답만 보류한다.
    let releaseResponse;
    const pendingResponse = new Promise(resolve => { releaseResponse = resolve; });
    const h = clientHarness(undefined, { beforeResponse: () => pendingResponse });
    const props = approvedClientProps();
    const approve = buttons(h.component(props))[0].props.onClick;

    // 실행
    approve();
    approve();
    const pending = h.component(props);

    // 검증: pending에는 성공 안내나 앱 링크가 없고 승인 버튼은 비활성이다.
    assert.equal(h.calls.fetch.length, 1);
    assert.equal(links(pending).length, 0);
    assert.equal(buttons(pending)[0].props.disabled, true);
    releaseResponse();
    await setImmediate();
    assert.equal(h.calls.navigation.length, 1);
    assert.equal(links(h.component(props)).length, 1);
});

test("검증에 실패한 callback은 승인 완료 안내나 직접 링크를 만들지 않는다", async () => {
    // 준비
    const h = clientHarness({ body: { callbackUrl: "https://evil.test/private" } });
    const props = approvedClientProps();

    // 실행
    buttons(h.component(props))[0].props.onClick();
    await setImmediate();
    const rejected = h.component(props);
    const html = renderToStaticMarkup(rejected);

    // 검증
    assert.equal(links(rejected).length, 0);
    assert.equal(html.includes("앱 로그인을 승인했어요"), false);
    assert.equal(html.includes("evil.test"), false);
    assert.equal(h.calls.navigation.length, 0);
});
