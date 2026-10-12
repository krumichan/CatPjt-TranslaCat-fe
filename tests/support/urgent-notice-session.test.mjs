import assert from "node:assert/strict";
import test from "node:test";

import {
    closedUrgentNoticeSnapshot,
    closeUrgentNoticeForLogin,
    subscribeUrgentNoticeClosures,
    urgentNoticeScope,
} from "../../src/features/support/urgentNoticeSession.ts";

function browserWindow({ blocked = false } = {}) {
    const data = new Map();
    const browser = new EventTarget();
    browser.localStorage = {
        get length() { return data.size; },
        key: (index) => [...data.keys()][index] ?? null,
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => {
            if (blocked) {
                throw new Error("브라우저 저장소 제한");
            }
            data.set(key, value);
        },
    };
    return browser;
}

function installWindow(t, browser) {
    const original = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", { value: browser, configurable: true });

    t.after(() => {
        if (original) {
            Object.defineProperty(globalThis, "window", original);
        } else {
            delete globalThis.window;
        }
    });
}

test("닫기는 같은 로그인의 다른 화면에서 유지되고 새 로그인과 다른 계정에는 적용되지 않는다", (t) => {
    // 준비
    installWindow(t, browserWindow());
    const current = urgentNoticeScope("user-a", "login-1");

    // 실행
    closeUrgentNoticeForLogin(current, 10);
    closeUrgentNoticeForLogin(current, 20);

    // 검증: 공지별 키는 다른 공지를 닫을 때 기존 기록을 덮어쓰지 않는다.
    assert.equal(closedUrgentNoticeSnapshot(current), "10,20");
    assert.equal(closedUrgentNoticeSnapshot(urgentNoticeScope("user-a", "login-2")), "");
    assert.equal(closedUrgentNoticeSnapshot(urgentNoticeScope("user-b", "login-1")), "");
});

test("사용자와 로그인 식별자에 구분 문자가 있어도 키가 충돌하지 않는다", () => {
    // 준비 / 실행 / 검증
    assert.notEqual(urgentNoticeScope("a:b", "c"), urgentNoticeScope("a", "b:c"));
    assert.notEqual(urgentNoticeScope("a", "b"), urgentNoticeScope("aa", "b"));
});

test("같은 탭의 닫기와 다른 탭의 관련 저장 이벤트만 구독자에게 전달한다", (t) => {
    // 준비
    const browser = browserWindow();
    installWindow(t, browser);
    const scope = urgentNoticeScope("events", "session");
    let updates = 0;
    const unsubscribe = subscribeUrgentNoticeClosures(scope, () => { updates += 1; });
    const emitStorage = (key) => {
        const event = new Event("storage");
        Object.defineProperty(event, "key", { value: key });
        browser.dispatchEvent(event);
    };

    // 실행
    closeUrgentNoticeForLogin(scope, 30);
    emitStorage(`${scope}40`);
    emitStorage(`${urgentNoticeScope("other", "session")}40`);
    unsubscribe();
    closeUrgentNoticeForLogin(scope, 50);

    // 검증
    assert.equal(updates, 2);
    assert.equal(closedUrgentNoticeSnapshot(scope), "30,50");
});

test("브라우저 저장소가 막혀도 닫기와 다음 공지 진행은 현재 화면에서 동작한다", (t) => {
    // 준비
    installWindow(t, browserWindow({ blocked: true }));
    const scope = urgentNoticeScope("restricted-browser", "session");

    // 실행
    closeUrgentNoticeForLogin(scope, 1);
    closeUrgentNoticeForLogin(scope, 2);

    // 검증
    assert.equal(closedUrgentNoticeSnapshot(scope), "1,2");
    assert.equal(closedUrgentNoticeSnapshot(urgentNoticeScope("restricted-browser", "new-session")), "");
});
