import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
    requestBody,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import {
    makeRoom,
    responseDto,
    toFriendApi,
} from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

async function seed(
    page: import("@playwright/test").Page,
    ids = [TEST_USERS.B.userId, TEST_USERS.C.userId],
) {
    await page.addInitScript(
        ({ selectedIds }) => {
            sessionStorage.setItem(
                "translacat.friend-group.selected-member-user-ids",
                JSON.stringify(selectedIds),
            );
        },
        { selectedIds: ids },
    );
}

async function mockFriends(page: import("@playwright/test").Page) {
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
        fulfillApiJson(route, responseDto([])),
    );
}

test.describe("FRIEND GROUP create", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockFriends(page);
    });

    test("GROUP-04 선택 멤버를 생성 페이지에 표시한다", async ({ page }) => {
        await seed(page);
        await page.goto("/friends/group/new");
        await expect(page.getByText(TEST_USERS.B.nickname)).toBeVisible();
        await expect(page.getByText(TEST_USERS.C.nickname)).toBeVisible();
    });

    test("GROUP-05 그룹명 필수 validation을 표시한다", async ({ page }) => {
        await seed(page);
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: 902,
                name: "재시도 그룹",
                roomType: "GROUP",
                sourceType: "FRIEND",
            }),
            messages: [],
        });

        let posts = 0;
        await page.route("**/chat/friends/group-rooms", (route) => {
            posts += 1;
            return fulfillApiJson(route, responseDto({ id: 900 }));
        });

        await page.goto("/friends/group/new");
        const nameInput = page.getByPlaceholder("예: 주말 일본어 공부방");
        await page
            .getByRole("button", { name: "그룹 채팅 만들기", exact: true })
            .click();

        // 현재 화면은 HTML required validation을 사용한다.
        const valueMissing = await nameInput.evaluate(
            (element: HTMLInputElement) => element.validity.valueMissing,
        );
        expect(valueMissing).toBe(true);
        expect(posts).toBe(0);
    });

    test("GROUP-06~08 설명 포함 API body와 room.id 이동을 검증한다", async ({ page }) => {
        await seed(page);
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: 901,
                name: "E2E 그룹",
                roomType: "GROUP",
                sourceType: "FRIEND",
            }),
            messages: [],
        });

        let body: unknown = null;
        await page.route("**/chat/friends/group-rooms", (route) => {
            body = requestBody(route);
            return fulfillApiJson(
                route,
                responseDto({ id: 901, name: "E2E 그룹" }),
            );
        });

        await page.goto("/friends/group/new");
        await page
            .getByPlaceholder("예: 주말 일본어 공부방")
            .fill("E2E 그룹");
        await page
            .getByPlaceholder("그룹의 목적이나 대화 주제를 입력해 주세요.")
            .fill("E2E 설명");
        await page
            .getByRole("button", { name: "그룹 채팅 만들기", exact: true })
            .click();

        await expect(page).toHaveURL(/\/chat\/rooms\/901$/);
        expect(body).toEqual({
            name: "E2E 그룹",
            description: "E2E 설명",
            memberUserIds: [TEST_USERS.B.userId, TEST_USERS.C.userId],
        });
    });

    test("GROUP-09 API 실패 후 오류를 표시하고 다시 시도할 수 있다", async ({ page }) => {
        await seed(page);
        let posts = 0;
        await page.route("**/chat/friends/group-rooms", (route) => {
            posts += 1;
            if (posts === 1) {
                return fulfillApiJson(route, { message: "failed" }, 500);
            }
            return fulfillApiJson(route, responseDto({ id: 902 }));
        });

        await page.goto("/friends/group/new");
        await page
            .getByPlaceholder("예: 주말 일본어 공부방")
            .fill("재시도 그룹");
        const create = page.getByRole("button", {
            name: "그룹 채팅 만들기",
            exact: true,
        });
        await create.click();
        await expect(
            page.getByText(
                "그룹 채팅 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
                { exact: true },
            ),
        ).toBeVisible();
        await create.click();
        await expect(page).toHaveURL(/\/chat\/rooms\/902$/);
    });

    test("GROUP selection adjusted 비친구 멤버를 제거한다", async ({ page }) => {
        await seed(page, [TEST_USERS.B.userId, 999999]);
        await page.goto("/friends/group/new");
        await expect(page.getByText(TEST_USERS.B.nickname)).toBeVisible();
        await expect(
            page.getByText(
                "현재 친구 관계와 차단 상태를 반영해 일부 사용자를 선택에서 제외했습니다.",
                { exact: true },
            ),
        ).toBeVisible();
    });
});
