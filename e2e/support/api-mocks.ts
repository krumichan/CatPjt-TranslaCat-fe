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
}

export async function mockCommonPageDependencies(
    page: Page,
    user: E2ETestUser = TEST_USERS.A,
): Promise<void> {
    await mockAuthenticatedSession(page, user);
    await mockNotificationBackground(page);

    // UserMenu를 열었을 때 조회하는 최근 본 기록이 다른 테스트를 방해하지 않게 한다.
    await page.route("**/recent-views**", (route) =>
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
