import { expect, test } from "../fixtures/mock-test";

import {
    fulfillApiJson,
    fulfillJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import {
    makeRoomListItem,
    responseDto,
    toFriendApi,
} from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

async function mockChatRooms(
    page: import("@playwright/test").Page,
    rooms = [
        makeRoomListItem({
            id: 501,
            roomType: "DIRECT",
            sourceType: "FRIEND",
            name: null,
            memberCount: 2,
        }),
    ],
) {
    await page.route("**/chat/rooms", (route) =>
        fulfillJson(
            route,
            responseDto({ chatRooms: rooms }),
        ),
    );
}

async function mockFriends(
    page: import("@playwright/test").Page,
) {
    await page.route("**/friends", (route) =>
        fulfillApiJson(
            route,
            responseDto([toFriendApi(TEST_USERS.B, 1)]),
        ),
    );

    await page.route("**/blocks", (route) =>
        fulfillApiJson(route, responseDto([])),
    );
}

test.describe("Chat hub tabs", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("HUB-01 /chat 진입 시 채팅 탭을 기본 표시한다", async ({
        page,
    }) => {
        await mockChatRooms(page);

        await page.goto("/chat");

        await expect(
            page.getByRole("tab", {
                name: "채팅",
                exact: true,
            }),
        ).toHaveAttribute("aria-selected", "true");

        await expect(
            page.getByText("친구와의 1:1 채팅"),
        ).toBeVisible();
    });

    test("HUB-02 친구 탭을 선택하면 URL과 콘텐츠가 함께 변경된다", async ({
        page,
    }) => {
        await mockChatRooms(page);
        await mockFriends(page);

        await page.goto("/chat");

        await page
            .getByRole("tab", {
                name: "친구",
                exact: true,
            })
            .click();

        await expect(page).toHaveURL(
            /\/chat\?tab=friends$/,
        );

        await expect(
            page.getByRole("tab", {
                name: "친구",
                exact: true,
            }),
        ).toHaveAttribute("aria-selected", "true");

        await expect(
            page.getByText(TEST_USERS.B.nickname),
        ).toBeVisible();
    });

    test("HUB-03 /chat?tab=friends 직접 진입 시 친구 탭을 표시한다", async ({
        page,
    }) => {
        await mockFriends(page);

        await page.goto("/chat?tab=friends");

        await expect(
            page.getByRole("tab", {
                name: "친구",
                exact: true,
            }),
        ).toHaveAttribute("aria-selected", "true");

        await expect(
            page.getByText(TEST_USERS.B.nickname),
        ).toBeVisible();
    });

    test("HUB-04 기존 /friends 경로는 친구 탭으로 연결된다", async ({
        page,
    }) => {
        await mockFriends(page);

        await page.goto("/friends");

        await expect(page).toHaveURL(
            /\/chat\?tab=friends$/,
        );

        await expect(
            page.getByRole("tab", {
                name: "친구",
                exact: true,
            }),
        ).toHaveAttribute("aria-selected", "true");
    });

    test("HUB-05 채팅 Empty CTA는 페이지 이동 없이 친구 탭으로 전환한다", async ({
        page,
    }) => {
        await mockChatRooms(page, []);
        await mockFriends(page);

        await page.goto("/chat");

        await page
            .getByRole("button", {
                name: "친구와 채팅 시작",
                exact: true,
            })
            .click();

        await expect(page).toHaveURL(
            /\/chat\?tab=friends$/,
        );

        await expect(
            page.getByText(TEST_USERS.B.nickname),
        ).toBeVisible();
    });

    test("HUB-06 방향키로 탭을 전환할 수 있다", async ({
        page,
    }) => {
        await mockChatRooms(page);
        await mockFriends(page);

        await page.goto("/chat");

        const chatTab = page.getByRole("tab", {
            name: "채팅",
            exact: true,
        });

        await chatTab.focus();
        await chatTab.press("ArrowRight");

        await expect(
            page.getByRole("tab", {
                name: "친구",
                exact: true,
            }),
        ).toHaveAttribute("aria-selected", "true");
    });
});
