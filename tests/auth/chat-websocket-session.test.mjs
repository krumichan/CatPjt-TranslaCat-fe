import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

import * as authErrors from "../../src/lib/authError.ts";
import * as authEvents from "../../src/lib/authEvents.ts";
import * as chatParser from "../../src/utils/chat/chatWebSocketParser.ts";

const hookCases = [
    { file: "useChatRoomWebSocket.ts", name: "useChatRoomWebSocket", room: true },
    { file: "useChatRoomsRealtime.ts", name: "useChatRoomsRealtime", room: false },
];

function session(overrides = {}) {
    return {
        expires: new Date(Date.now() + 60_000).toISOString(),
        loginSessionId: "fixture-login-a",
        accessToken: "fixture-access-current",
        user: { email: "fixture@example.test", accessTokenExpires: Date.now() + 60_000 },
        ...overrides,
    };
}

function deferred() {
    let resolve;
    const promise = new Promise(accept => { resolve = accept; });
    return { promise, resolve };
}

function sessionLookup(getSession, fetch = async () => Response.json({})) {
    const source = fs.readFileSync(new URL("../../src/lib/chatWebSocketSession.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
        exports, fetch, AbortSignal,
        require: name => {
            if (name === "next-auth/react") return { getSession };
            if (name === "@/lib/authError") return authErrors;
            assert.fail(`Unexpected session helper dependency: ${name}`);
        },
    });
    return exports.getChatWebSocketSession;
}

function harness(definition, getSession, fetchSession) {
    const effects = [];
    const clients = [];
    const received = [];
    const reconnects = [];
    const window = new EventTarget();
    const timers = new Map();
    let timerSequence = 0;
    const setTimeout = (callback, delay) => {
        const id = ++timerSequence;
        timers.set(id, { callback, delay });
        return id;
    };
    const clearTimeout = id => { timers.delete(id); };

    // 실제 훅을 실행하고 React의 effect 수명·NextAuth·STOMP transport 경계만 대체한다.
    class StompClient {
        constructor(configuration) {
            this.active = false;
            this.connected = false;
            this.connectHeaders = {};
            this.connectTokens = [];
            this.subscriptions = [];
            this.sent = [];
            Object.assign(this, configuration);
            clients.push(this);
        }
        activate() {
            this.active = true;
            this.pending = this.attemptConnection();
        }
        async attemptConnection() {
            await this.beforeConnect?.();
            if (!this.active) return;
            this.connected = true;
            this.connectTokens.push(this.connectHeaders.Authorization);
            this.onConnect?.({ headers: {} });
        }
        async serverExpiresSocket() {
            this.connected = false;
            this.onWebSocketClose?.({ code: 1008 });
            await this.attemptConnection();
        }
        deactivate() {
            this.active = false;
            this.connected = false;
            return Promise.resolve();
        }
        subscribe(destination, callback, headers) {
            this.subscriptions.push({ destination, callback, headers });
            return { unsubscribe() {} };
        }
        publish(frame) { this.sent.push(frame); }
    }

    const modules = {
        "@stomp/stompjs": { Client: StompClient },
        "next-auth/react": { getSession, useSession: () => ({ data: session() }) },
        react: {
            useRef: value => ({ current: value }),
            useState: value => [typeof value === "function" ? value() : value, () => {}],
            useMemo: factory => factory(),
            useCallback: callback => callback,
            useEffect: effect => effects.push(effect),
        },
        "@/lib/chatWebSocketSession": { getChatWebSocketSession: sessionLookup(getSession, fetchSession) },
        "@/lib/authError": authErrors,
        "@/lib/authEvents": authEvents,
        "@/utils/chat/chatWebSocketParser": chatParser,
        "@/utils/websocket": { getChatWebSocketUrl: () => "wss://fixture.example.test/ws/chat" },
    };
    const source = fs.readFileSync(new URL(`../../src/hooks/chat/${definition.file}`, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
        exports, window, Date, setTimeout, clearTimeout, AbortController, console: { error() {}, debug() {} },
        require: name => {
            assert.ok(name in modules, `Unexpected dependency: ${name}`);
            return modules[name];
        },
    });
    const common = {
        accessToken: "fixture-props-token-before-refresh",
        onMessageCreated: message => received.push(message),
        onReadUpdated() {},
        onReconnectSyncRequested: async () => { reconnects.push(true); },
    };
    const result = exports[definition.name](definition.room
        ? { ...common, roomId: 3, openChatEventsEnabled: true }
        : { ...common, roomIds: [3], onNotificationCreated() {} });
    const cleanups = effects.map(effect => effect()).filter(cleanup => typeof cleanup === "function");
    return {
        clients, result, received, reconnects, window, timers,
        runNextRetry: async () => {
            const entry = timers.entries().next().value;
            assert.ok(entry, "Expected a pending session lookup retry");
            const [id, timer] = entry;
            timers.delete(id);
            timer.callback();
            await clients[0].pending;
            return timer.delay;
        },
        cleanup: () => cleanups.reverse().forEach(cleanup => cleanup()),
    };
}

test("session lookup: 200 null/빈 객체와 401/403은 확정된 세션 소실로 구분한다", async () => {
    // 준비
    for (const response of [Response.json(null), Response.json({}), new Response(null, { status: 401 }), new Response(null, { status: 403 })]) {
        const controller = new AbortController();
        const lookup = sessionLookup(async () => null, async (url, options) => {
            assert.equal(url, "/api/auth/session");
            assert.equal(options.credentials, "same-origin");
            assert.equal(options.cache, "no-store");
            assert.equal(options.redirect, "error");
            assert.ok(options.signal instanceof AbortSignal);
            return response;
        });
        // 실행
        const result = await lookup({ isCurrent: () => true, signal: controller.signal });
        // 검증
        assert.equal(result, null);
    }
});

test("session lookup: 5xx·네트워크·JSON·payload 오류는 로그아웃과 구분한다", async () => {
    // 준비
    const responses = [
        async () => new Response(null, { status: 503 }),
        async () => { throw new Error("fixture endpoint offline"); },
        async () => new Response("invalid JSON", { headers: { "Content-Type": "application/json" } }),
        async () => Response.json([]),
        async () => Response.json({ unexpected: true }),
        async () => Response.json(session({ accessToken: 42 })),
        async () => Response.json(session({ loginSessionId: 42 })),
        async () => Response.json(session({ error: "unknown-session-error" })),
        async () => Response.json(session({ user: { email: 42 } })),
        async () => Response.json(session({ user: { publicId: 42 } })),
        async () => Response.json(session({ user: { role: "OTHER" } })),
    ];
    // 실행·검증
    for (const fetch of responses) {
        const lookup = sessionLookup(async () => null, fetch);
        await assert.rejects(lookup({ isCurrent: () => true, signal: new AbortController().signal }));
    }
});

test("session lookup: null을 숨긴 일시 실패 뒤 재확인의 새 세션을 사용한다", async () => {
    // 준비
    const lookup = sessionLookup(async options => {
        assert.equal(options.broadcast, false);
        return null;
    }, async () => Response.json(session({ accessToken: "fixture-probed-token" })));
    // 실행
    const result = await lookup({ isCurrent: () => true, signal: new AbortController().signal });
    // 검증
    assert.equal(result.accessToken, "fixture-probed-token");
});

test("session lookup: 취소·계정 세대 교체 후 늦은 재확인 결과를 버린다", async () => {
    // 준비
    for (const abort of [true, false]) {
        const controller = new AbortController();
        const pending = deferred();
        let current = true;
        const requested = deferred();
        const lookup = sessionLookup(async () => null, async () => { requested.resolve(); return pending.promise; });
        const result = lookup({ isCurrent: () => current, signal: controller.signal });
        await requested.promise;
        // 실행
        if (abort) controller.abort();
        else current = false;
        pending.resolve(Response.json(session()));
        // 검증
        assert.equal(await result, null);
    }
});

for (const definition of hookCases) {
    test(`${definition.name}: 서버가 만료 소켓을 닫으면 새 세션 토큰으로 재연결한다`, async () => {
        // 준비
        let lookups = 0;
        const value = harness(definition, async () => session({ accessToken: `fixture-refreshed-${++lookups}` }));
        const client = value.clients[0];
        await client.pending;

        // 실행: BE의 만료 close 뒤 같은 STOMP Client가 자동 연결을 다시 시도한다.
        await client.serverExpiresSocket();

        // 검증: 최초 props 토큰은 CONNECT·SUBSCRIBE에 한 번도 재사용하지 않는다.
        assert.deepEqual(client.connectTokens, ["Bearer fixture-refreshed-1", "Bearer fixture-refreshed-2"]);
        assert.equal(lookups, 2);
        assert.ok(client.subscriptions.slice(-3).every(subscription => subscription.headers.Authorization === "Bearer fixture-refreshed-2"));
        assert.equal(value.reconnects.length, 1);
        if (definition.room) {
            await value.result.sendMessage("합성 메시지");
            assert.equal(client.sent[0].headers.Authorization, "Bearer fixture-refreshed-2");
        }
        value.cleanup();
    });

    test(`${definition.name}: 같은 이메일의 다른 로그인 세대로 접속하지 않는다`, async () => {
        // 준비
        const value = harness(definition, async () => session({ loginSessionId: "fixture-login-b" }));
        // 실행
        await value.clients[0].pending;
        // 검증
        assert.equal(value.clients[0].connectTokens.length, 0);
        assert.equal(value.clients[0].active, false);
        value.cleanup();
    });

    test(`${definition.name}: 로그아웃 시작 뒤 늦게 돌아온 세션으로 연결하지 않는다`, async () => {
        // 준비
        const pending = deferred();
        const value = harness(definition, () => pending.promise);
        // 실행
        value.window.dispatchEvent(new Event(authEvents.AUTH_SIGN_OUT_STARTED_EVENT));
        pending.resolve(session());
        await value.clients[0].pending;
        // 검증
        assert.equal(value.clients[0].connectTokens.length, 0);
        assert.equal(value.clients[0].active, false);
        value.cleanup();
    });

    test(`${definition.name}: 화면 종료 뒤 늦은 세션 응답과 메시지를 폐기한다`, async () => {
        // 준비
        const pending = deferred();
        const value = harness(definition, () => pending.promise);
        // 실행
        value.cleanup();
        pending.resolve(session());
        await value.clients[0].pending;
        // 검증
        assert.equal(value.clients[0].connectTokens.length, 0);
    });

    test(`${definition.name}: 세션 소실·확정 refresh 실패·잘못된 만료값은 재접속하지 않는다`, async () => {
        // 준비
        const cases = [
            null,
            session({ error: authErrors.AUTH_SESSION_ERROR.REFRESH_FAILED }),
            session({ user: { email: "fixture@example.test", accessTokenExpires: Date.now() - 1 } }),
        ];
        // 실행·검증
        for (const current of cases) {
            const value = harness(definition, async () => current);
            await value.clients[0].pending;
            assert.equal(value.clients[0].connectTokens.length, 0);
            assert.equal(value.clients[0].reconnectDelay, 0);
            assert.equal(value.timers.size, 0);
            value.cleanup();
        }
    });

    test(`${definition.name}: 일시 네트워크·갱신 장애 뒤 새 토큰으로 연결을 회복한다`, async () => {
        // 준비: NextAuth 조회 자체의 실패와 만료 토큰을 동반한 임시 갱신 오류를 각각 확인한다.
        for (const failure of ["network", "temporary-refresh"]) {
            let lookups = 0;
            const value = harness(definition, async () => {
                if (++lookups === 1) {
                    if (failure === "network") throw new Error("fixture temporary endpoint failure");
                    return session({ user: { accessTokenExpires: Date.now() - 1 },
                        error: authErrors.AUTH_SESSION_ERROR.REFRESH_TEMPORARILY_UNAVAILABLE });
                }
                return session({ accessToken: "fixture-after-recovery" });
            });
            const client = value.clients[0];
            await client.pending;
            assert.equal(client.active, false);
            assert.equal(client.connectTokens.length, 0);

            // 실행: 실제 시간을 기다리지 않고 예약된 다음 조회를 실행한다.
            const delay = await value.runNextRetry();

            // 검증: 만료·최초 토큰을 보내지 않고 복구된 새 토큰으로 연결한다.
            assert.equal(delay, 3000);
            assert.equal(lookups, 2);
            assert.deepEqual(client.connectTokens, ["Bearer fixture-after-recovery"]);
            assert.equal(value.timers.size, 0);
            value.cleanup();
        }
    });

    test(`${definition.name}: getSession이 null로 숨긴 HTTP 장애도 복구한다`, async () => {
        // 준비
        let lookups = 0;
        const value = harness(definition, async () => (++lookups === 1 ? null : session()),
            async () => new Response(null, { status: 503 }));
        const client = value.clients[0];
        await client.pending;
        assert.equal(client.connectTokens.length, 0);

        // 실행
        await value.runNextRetry();

        // 검증
        assert.deepEqual(client.connectTokens, ["Bearer fixture-access-current"]);
        assert.equal(lookups, 2);
        value.cleanup();
    });

    test(`${definition.name}: 지속적인 임시 장애는 30초 한도 backoff로 조회한다`, async () => {
        // 준비
        let lookups = 0;
        const value = harness(definition, async () => { lookups++; throw new Error("fixture unavailable"); });
        await value.clients[0].pending;

        // 실행·검증: 즉시 반복이나 잘못된 CONNECT 없이 지연 간격만 증가한다.
        for (const expected of [3000, 6000, 12_000, 24_000, 30_000, 30_000]) {
            assert.equal(value.timers.size, 1);
            assert.equal(await value.runNextRetry(), expected);
        }
        assert.equal(lookups, 7);
        assert.equal(value.clients[0].connectTokens.length, 0);
        value.cleanup();
        assert.equal(value.timers.size, 0);
    });

    test(`${definition.name}: 로그아웃·화면 종료는 예약된 재시도도 취소한다`, async () => {
        // 준비
        for (const action of ["sign-out", "cleanup"]) {
            let lookups = 0;
            const value = harness(definition, async () => { lookups++; throw new Error("fixture unavailable"); });
            await value.clients[0].pending;
            const staleTimer = value.timers.values().next().value;

            // 실행: 이미 이벤트 큐로 넘어갔을 수 있는 오래된 callback도 직접 호출한다.
            if (action === "sign-out") value.window.dispatchEvent(new Event(authEvents.AUTH_SIGN_OUT_STARTED_EVENT));
            else value.cleanup();
            staleTimer.callback();
            await Promise.resolve();

            // 검증
            assert.equal(value.timers.size, 0);
            assert.equal(value.clients[0].active, false);
            assert.equal(lookups, 1);
            if (action === "sign-out") value.cleanup();
        }
    });

    test(`${definition.name}: 명시적인 STOMP 거절은 임시 장애 재시도를 만들지 않는다`, async () => {
        // 준비
        const value = harness(definition, async () => session());
        const client = value.clients[0];
        await client.pending;

        // 실행
        client.onStompError({ headers: {} });
        await Promise.resolve();

        // 검증
        assert.equal(client.active, false);
        assert.equal(client.reconnectDelay, 0);
        assert.equal(value.timers.size, 0);
        value.cleanup();
    });

    test(`${definition.name}: 종료한 이전 소켓의 메시지를 새 화면 콜백에 전달하지 않는다`, async () => {
        // 준비
        const value = harness(definition, async () => session());
        const client = value.clients[0];
        await client.pending;
        const subscription = client.subscriptions[0];
        const frame = { body: JSON.stringify({ eventType: "chat.message.created", message: {
            id: 10, chatRoomId: 3, senderUserId: 2, senderAiMemberId: null, senderName: "합성 참여자",
            senderEmail: "fixture@example.test", senderProfileImageUrl: null,
            senderType: "USER", messageType: "TEXT", content: "합성 메시지", status: "SENT",
            unreadMemberCount: 1, translations: [], createdAt: "2026-10-19T01:00:00Z", updatedAt: "2026-10-19T01:00:00Z", sender: null,
        } }) };
        // 실행: 유효한 메시지가 연결 중에는 실제 parser를 거쳐 전달됨을 먼저 확인한다.
        subscription.callback(frame);
        assert.equal(value.received.length, 1);
        value.cleanup();
        subscription.callback(frame);
        // 검증
        assert.equal(value.received.length, 1);
    });
}
