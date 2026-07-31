import { expect, test } from "../fixtures/mock-test";

import {
    fulfillJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import {
    makeRoomListItem,
    responseDto,
} from "../support/mock-data";

async function mockNavigationDependencies(
    page: import("@playwright/test").Page,
) {
    await mockCommonPageDependencies(page);
    await mockIdleWebSocket(page);

    await page.route("**/recent/top10", (route) =>
        fulfillJson(route, responseDto([])),
    );

    await page.route("**/chat/rooms", (route) =>
        fulfillJson(
            route,
            responseDto({
                chatRooms: [
                    makeRoomListItem({
                        id: 501,
                        roomType: "DIRECT",
                        sourceType: "FRIEND",
                        name: null,
                        memberCount: 2,
                    }),
                ],
            }),
        ),
    );
}

test.describe("Global application navigation", () => {
    test.beforeEach(async ({ page }) => {
        await mockNavigationDependencies(page);
    });

    test("NAV-01 데스크톱에서 Sidebar와 활성 채팅 메뉴를 표시한다", async ({
        page,
    }) => {
        await page.setViewportSize({
            width: 1440,
            height: 900,
        });

        await page.goto("/chat");

        await expect(
            page.getByTestId("app-sidebar"),
        ).toBeVisible();

        await expect(
            page.getByRole("link", {
                name: "채팅",
                exact: true,
            }),
        ).toHaveAttribute("aria-current", "page");
    });

    test("NAV-02 Sidebar 축소 상태가 새로고침 후 유지된다", async ({
        page,
    }) => {
        await page.setViewportSize({
            width: 1440,
            height: 900,
        });

        await page.goto("/chat");

        await page
            .getByTestId("app-sidebar-toggle")
            .click();

        await expect(
            page.getByTestId("app-sidebar"),
        ).toHaveClass(/w-\[72px\]/);

        await page.reload();

        await expect(
            page.getByTestId("app-sidebar"),
        ).toHaveClass(/w-\[72px\]/);
    });

    test("NAV-03 모바일에서 Drawer를 열고 ESC로 닫는다", async ({
        page,
    }) => {
        await page.setViewportSize({
            width: 390,
            height: 844,
        });

        await page.goto("/chat");

        await expect(
            page.getByTestId("app-sidebar"),
        ).toBeHidden();

        await page
            .getByTestId("mobile-navigation-open")
            .click();

        const drawer = page.getByTestId(
            "app-mobile-navigation-drawer",
        );

        await expect(drawer).toHaveClass(
            /translate-x-0/,
        );

        await page.keyboard.press("Escape");

        await expect(drawer).toHaveClass(
            /-translate-x-full/,
        );
    });

    test("NAV-04 UserMenu에는 사용자 관련 메뉴만 표시한다", async ({
        page,
    }) => {
        await page.goto("/chat");

        await page
            .getByTestId("user-menu-toggle")
            .click();

        await expect(
            page.getByRole("menuitem", {
                name: "내 프로필",
            }),
        ).toBeVisible();

        await expect(
            page.getByRole("menuitem", {
                name: "설정",
            }),
        ).toBeVisible();

        await expect(
            page.getByRole("menuitem", {
                name: "로그아웃",
            }),
        ).toBeVisible();

        await expect(
            page.getByRole("menuitem", {
                name: "웹소설",
            }),
        ).toHaveCount(0);
    });
});
