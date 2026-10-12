import type { Page } from "@playwright/test";

import { installMockAuthCookie } from "../fixtures/mock-test";
import { fulfillApiJson, fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { mockLoginSessionId } from "../support/mock-login-session";
import { TEST_USERS, type E2ETestUser } from "../support/test-users";
import type { SupportNotice } from "@/types/support";

type RequestGate = {
    reached: () => void;
    wait: Promise<void>;
};

export function createUrgentNoticeStore(notices: SupportNotice[] = [urgentNotice(41)]) {
    return {
        notices,
        dismissedByUser: new Map<string, Set<number>>(),
        loads: [] as string[],
        completedLoads: [] as string[],
        dismissals: [] as { user: string; id: number }[],
        failedDismissalsRemaining: 0,
        failedLoadsRemaining: 0,
        loadFailures: [] as string[],
        gates: new Map<string, RequestGate>(),
    };
}

type UrgentStore = ReturnType<typeof createUrgentNoticeStore>;

export function urgentNotice(id: number, noticeType: "NORMAL" | "URGENT" = "URGENT"): SupportNotice {
    return {
        id,
        title: `서비스 점검 안내 ${id}`,
        content: `테스트 공지 ${id}입니다. 서비스 점검 일정을 확인해 주세요.`,
        noticeType,
        authorName: "운영팀",
        createdAt: "2026-10-11T09:00:00",
        updatedAt: "2026-10-11T09:00:00",
    };
}

export function holdUrgentRequest(store: UrgentStore, kind: "load" | "dismiss", user = TEST_USERS.A) {
    let reached = () => {};
    let release = () => {};
    const started = new Promise<void>((resolve) => { reached = resolve; });
    const wait = new Promise<void>((resolve) => { release = resolve; });
    store.gates.set(`${kind}:${user.publicId}`, { reached, wait });

    return { started, release };
}

export async function mockUrgentNotices(page: Page, store: UrgentStore, user = TEST_USERS.A) {
    // 세션과 배경 API를 먼저 고정하고 공지 계약만 공유 저장소로 덮어쓴다.
    await mockCommonPageDependencies(page, user);
    await mockIdleWebSocket(page);
    const session = {
        user,
        loginSessionId: mockLoginSessionId(page.context(), user, "USER"),
        authenticated: true,
    };

    await page.route("**/api/auth/session", (route) => fulfillJson(route, session.authenticated ? {
        loginSessionId: session.loginSessionId,
        user: {
            name: session.user.nickname,
            email: session.user.email,
            publicId: session.user.publicId,
            role: "USER",
            accessTokenExpires: Date.now() + 3_600_000,
        },
        accessToken: `mock-access-token-${session.user.key}`,
        refreshToken: `mock-refresh-token-${session.user.key}`,
        expires: new Date(Date.now() + 3_600_000).toISOString(),
    } : null));

    await page.route(/\/support\/notices(?:\?.*)?$/, (route) => fulfillApiJson(route, responseDto({
        items: store.notices,
        page: 0,
        size: 20,
        totalElements: store.notices.length,
        totalPages: store.notices.length > 0 ? 1 : 0,
    })));

    const pauseIfHeld = async (kind: "load" | "dismiss", publicId: string) => {
        const key = `${kind}:${publicId}`;
        const gate = store.gates.get(key);
        if (gate) {
            store.gates.delete(key);
            gate.reached();
            await gate.wait;
        }
    };

    await page.route(/\/support\/notices\/(?:urgent|\d+\/dismiss)(?:\?.*)?$/, async (route) => {
        // 요청 시점의 토큰 소유자를 보존해 계정 전환 뒤 응답도 이전 사용자에게만 적용한다.
        const authorization = route.request().headers().authorization;
        const actor = Object.values(TEST_USERS).find((candidate) => authorization === `Bearer mock-access-token-${candidate.key}`);
        if (!actor) {
            return fulfillApiJson(route, responseDto(null, 401, "인증된 테스트 사용자가 아닙니다."), 401);
        }

        const dismissed = store.dismissedByUser.get(actor.publicId) ?? new Set<number>();
        const path = new URL(route.request().url()).pathname;

        if (path.endsWith("/urgent")) {
            store.loads.push(actor.publicId);
            if (store.failedLoadsRemaining > 0) {
                store.failedLoadsRemaining -= 1;
                store.loadFailures.push(actor.publicId);
                return fulfillApiJson(route, responseDto(null, 503, "일시적인 조회 실패입니다."), 503);
            }

            const notices = store.notices
                .filter((notice) => notice.noticeType === "URGENT" && !dismissed.has(notice.id))
                .sort((left, right) => right.id - left.id)
                .map((notice) => ({ ...notice }));
            await pauseIfHeld("load", actor.publicId);

            // 취소된 이전 계정 요청은 브라우저가 더 이상 응답을 받지 않을 수 있다.
            await fulfillApiJson(route, responseDto(notices)).catch(() => undefined);
            store.completedLoads.push(actor.publicId);
            return;
        }

        const id = Number(path.match(/\/(\d+)\/dismiss$/)?.[1]);
        store.dismissals.push({ user: actor.publicId, id });
        await pauseIfHeld("dismiss", actor.publicId);

        if (store.failedDismissalsRemaining > 0) {
            store.failedDismissalsRemaining -= 1;
            return fulfillApiJson(route, responseDto(null, 503, "일시적인 저장 실패입니다."), 503);
        }

        dismissed.add(id);
        store.dismissedByUser.set(actor.publicId, dismissed);
        await fulfillApiJson(route, responseDto(true)).catch(() => undefined);
    });

    return {
        session,
        async changeLogin(nextUser: E2ETestUser, loginSessionId: string) {
            // 실제 NextAuth 쿠키와 브라우저 세션 응답을 같은 로그인 경계로 바꾼다.
            await installMockAuthCookie(page.context(), "USER", { user: nextUser, loginSessionId });
            session.user = nextUser;
            session.loginSessionId = loginSessionId;
            session.authenticated = true;
        },
        async refreshSession() {
            await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
        },
    };
}
