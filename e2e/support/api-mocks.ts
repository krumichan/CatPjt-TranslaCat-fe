import type { Page, Route } from "@playwright/test";
import { responseDto } from "./mock-data";
import type { E2ETestUser } from "./test-users";
import { TEST_USERS } from "./test-users";

export async function fulfillJson(
    route: Route,
    body: unknown,
    status = 200,
): Promise<void> {
    await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
    });
}


export async function fulfillApiJson(
    route: Route,
    body: unknown,
    status = 200,
): Promise<void> {
    if (route.request().resourceType() === "document") {
        await route.fallback();
        return;
    }

    await fulfillJson(route, body, status);
}

export async function mockAuthenticatedSession(
    page: Page,
    user: E2ETestUser = TEST_USERS.A,
): Promise<void> {
    await page.route("**/api/auth/session", async (route) => {
        await fulfillJson(route, {
            user: {
                name: user.nickname,
                email: user.email,
                image: null,
                role: "USER",
                publicId: user.publicId,
                accessToken: `mock-access-token-${user.key}`,
                refreshToken: `mock-refresh-token-${user.key}`,
                accessTokenExpires: Date.now() + 60 * 60 * 1000,
            },
            accessToken: `mock-access-token-${user.key}`,
            refreshToken: `mock-refresh-token-${user.key}`,
            expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        });
    });
}

/** Header의 NotificationBell이 페이지 진입 시 수행하는 배경 조회를 무해한 빈 응답으로 고정한다. */
export async function mockNotificationBackground(page: Page): Promise<void> {
    await page.route("**/account-book-invitations/received", (route) =>
        fulfillJson(route, responseDto([])),
    );
    await page.route("**/friend-requests/received", (route) =>
        fulfillJson(route, responseDto([])),
    );
    await page.route("**/friend-requests/sent", (route) =>
        fulfillJson(route, responseDto([])),
    );
    await page.route("**/chat/notifications/summary", (route) =>
        fulfillJson(
            route,
            responseDto({
                unreadChatMessageCount: 0,
                unreadChatRoomCount: 0,
                unreadActivityCount: 0,
                totalAttentionCount: 0,
            }),
        ),
    );
    await page.route("**/chat/notifications/chats**", (route) =>
        fulfillJson(
            route,
            responseDto({
                items: [],
                nextCursorMessageId: null,
                hasNext: false,
            }),
        ),
    );
    await page.route("**/chat/notifications/activities**", (route) =>
        fulfillJson(
            route,
            responseDto({
                items: [],
                nextCursorId: null,
                hasNext: false,
            }),
        ),
    );
}

export async function mockCommonPageDependencies(
    page: Page,
    user: E2ETestUser = TEST_USERS.A,
): Promise<void> {
    await mockAuthenticatedSession(page, user);
    await mockNotificationBackground(page);

    /*
     * AppSidebarRecentHistory가 인증된 메인 화면 진입 시
     * 자동으로 최근 활동을 조회한다.
     *
     * 공통 Mock이 없으면 실제 API 요청이 발생하고,
     * 401/403 응답으로 apiClient가 signOut을 실행하여
     * 전체 E2E가 로그인 화면으로 이동할 수 있다.
     */
    await page.route("**/recent/top10**", (route) =>
        fulfillJson(route, responseDto([])),
    );
}

export async function mockIdleWebSocket(page: Page): Promise<void> {
    await page.routeWebSocket(/.*/, () => {
        // 연결만 수락하고 STOMP CONNECTED frame은 보내지 않는다.
        // 앱은 CONNECTING 상태를 유지하므로 메시지 전송 테스트는 REST fallback을 사용한다.
    });
}

export function requestBody(route: Route): unknown {
    const raw = route.request().postData();
    if (!raw) return null;
    try {
        return JSON.parse(raw) as unknown;
    } catch {
        return raw;
    }
}
