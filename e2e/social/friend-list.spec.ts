import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import { makeRoom, responseDto, toFriendApi } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

async function mockList(
    page: import("@playwright/test").Page,
    friends = [
        toFriendApi(TEST_USERS.B, 1),
        toFriendApi(TEST_USERS.C, 2),
    ],
) {
    await page.route("**/friends", (route) =>
        fulfillApiJson(route, responseDto(friends)),
    );
    await page.route("**/blocks", (route) =>
        fulfillApiJson(route, responseDto([])),
    );
}

function friendCard(page: import("@playwright/test").Page, nickname: string) {
    return page.locator("article").filter({ hasText: nickname });
}

test.describe("Friend list", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("FRIEND-09 친구 목록을 조회하고 검색 필터를 적용한다", async ({ page }) => {
        await mockList(page);
        await page.goto("/friends");
        await expect(page.getByText(TEST_USERS.B.nickname)).toBeVisible();
        await expect(page.getByText(TEST_USERS.C.nickname)).toBeVisible();

        await page
            .getByRole("textbox", { name: "친구 검색" })
            .fill(TEST_USERS.B.publicId);

        await expect(page.getByText(TEST_USERS.B.nickname)).toBeVisible();
        await expect(page.getByText(TEST_USERS.C.nickname)).toBeHidden();
    });

    test("FRIEND-10 친구가 없으면 Empty 상태를 표시한다", async ({ page }) => {
        await mockList(page, []);
        await page.goto("/friends");
        await expect(page.getByText("아직 친구가 없습니다.")).toBeVisible();
    });

    test("DIRECT-02 친구 목록에서 DIRECT room 생성/조회 후 이동한다", async ({ page }) => {
        await mockList(page);
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: 778,
                roomType: "DIRECT",
                sourceType: "FRIEND",
            }),
            messages: [],
        });

        await page.route(
            `**/chat/friends/${TEST_USERS.B.userId}/direct-room`,
            (route) => fulfillApiJson(route, responseDto(makeRoom({ id: 778 }))),
        );
        await page.goto("/friends");
        await friendCard(page, TEST_USERS.B.nickname)
            .getByRole("button", { name: "1:1 채팅", exact: true })
            .click();
        await expect(page).toHaveURL(/\/chat\/rooms\/778$/);
    });

    test("FRIEND-13 친구 삭제 성공 후 목록에서 제거한다", async ({ page }) => {
        let friends = [
            toFriendApi(TEST_USERS.B, 1),
            toFriendApi(TEST_USERS.C, 2),
        ];
        await page.route("**/friends", (route) =>
            fulfillApiJson(route, responseDto(friends)),
        );
        await page.route("**/blocks", (route) =>
            fulfillApiJson(route, responseDto([])),
        );
        await page.route(`**/friends/${TEST_USERS.B.userId}`, (route) => {
            friends = friends.filter(
                (friend) => friend.friend.userId !== TEST_USERS.B.userId,
            );
            return fulfillApiJson(route, responseDto(true));
        });

        await page.goto("/friends");
        const card = friendCard(page, TEST_USERS.B.nickname);
        await card
            .getByRole("button", { name: "친구 메뉴", exact: true })
            .click();
        await card
            .getByRole("button", { name: "친구 삭제", exact: true })
            .click();
        await page
            .getByRole("dialog")
            .getByRole("button", { name: "삭제", exact: true })
            .click();
        await expect(card).toHaveCount(0);
    });

    test("GROUP-01~04 그룹 선택 모드에서 복수 선택 후 생성 페이지로 이동한다", async ({ page }) => {
        await mockList(page);
        await page.goto("/friends");
        await page
            .getByRole("button", { name: "그룹 선택", exact: true })
            .click();
        await page
            .getByRole("button", { name: `${TEST_USERS.B.nickname} 선택` })
            .click();
        await page
            .getByRole("button", { name: `${TEST_USERS.C.nickname} 선택` })
            .click();
        await page
            .getByRole("button", { name: "그룹 만들기 (2)", exact: true })
            .click();

        await expect(page).toHaveURL(/\/friends\/group\/new$/);
        const stored = await page.evaluate(() =>
            sessionStorage.getItem(
                "translacat.friend-group.selected-member-user-ids",
            ),
        );
        expect(JSON.parse(stored ?? "[]")).toEqual([
            TEST_USERS.B.userId,
            TEST_USERS.C.userId,
        ]);
    });
});
