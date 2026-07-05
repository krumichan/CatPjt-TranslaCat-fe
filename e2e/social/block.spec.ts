import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    mockCommonPageDependencies,
    requestBody,
} from "../support/api-mocks";
import { responseDto, toBlockApi, toFriendApi } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

function friendCard(page: import("@playwright/test").Page, nickname: string) {
    return page.locator("article").filter({ hasText: nickname });
}

test.describe("Block / unblock", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("BLOCK-01~02 친구를 차단하면 목록에서 제외한다", async ({ page }) => {
        let blocks: ReturnType<typeof toBlockApi>[] = [];

        await page.route("**/friends", (route) =>
            fulfillApiJson(route, responseDto([toFriendApi(TEST_USERS.B, 1)])),
        );
        await page.route("**/blocks", async (route) => {
            if (route.request().method() === "POST") {
                expect(requestBody(route)).toEqual({
                    blockedPublicId: TEST_USERS.B.publicId,
                });
                const block = toBlockApi(TEST_USERS.B);
                blocks = [block];
                return fulfillApiJson(route, responseDto(block));
            }
            return fulfillApiJson(route, responseDto(blocks));
        });

        await page.goto("/friends");
        const card = friendCard(page, TEST_USERS.B.nickname);
        await card
            .getByRole("button", { name: "친구 메뉴", exact: true })
            .click();
        await card
            .getByRole("button", { name: "차단", exact: true })
            .click();
        await page
            .getByRole("dialog")
            .getByRole("button", { name: "차단", exact: true })
            .click();

        await expect(friendCard(page, TEST_USERS.B.nickname)).toHaveCount(0);
    });

    test("BLOCK-03~04 차단 목록에서 차단 해제한다", async ({ page }) => {
        let blocks = [toBlockApi(TEST_USERS.C)];

        await page.route("**/friends", (route) =>
            fulfillApiJson(route, responseDto([])),
        );
        await page.route("**/blocks", (route) =>
            fulfillApiJson(route, responseDto(blocks)),
        );
        await page.route(`**/blocks/${TEST_USERS.C.userId}`, (route) => {
            blocks = [];
            return fulfillApiJson(route, responseDto(true));
        });

        await page.goto("/friends");
        await page
            .getByRole("button", { name: /차단 목록 \(1\)/ })
            .click();

        const dialog = page.getByRole("dialog");
        await expect(dialog.getByText(TEST_USERS.C.publicId)).toBeVisible();
        await dialog
            .getByRole("button", { name: "차단 해제", exact: true })
            .click();
        await expect(dialog.getByText(TEST_USERS.C.publicId)).toBeHidden();
    });

    test("GROUP-03 차단 사용자는 그룹 선택 목록에서 제외된다", async ({ page }) => {
        await page.route("**/friends", (route) =>
            fulfillApiJson(
                route,
                responseDto([
                    toFriendApi(TEST_USERS.B, 1),
                    toFriendApi(TEST_USERS.C, 2),
                ]),
            ),
        );
        await page.route("**/blocks", (route) =>
            fulfillApiJson(route, responseDto([toBlockApi(TEST_USERS.C)])),
        );

        await page.goto("/friends");
        await page
            .getByRole("button", { name: "그룹 선택", exact: true })
            .click();

        await expect(page.getByText(TEST_USERS.B.nickname)).toBeVisible();
        await expect(page.getByText(TEST_USERS.C.nickname)).toBeHidden();
    });
});
