import { expect, test } from "../fixtures/mock-test";
import {
    errorDto,
    makeRoom,
    responseDto,
    toFriendRequest,
    toSummaryProfile,
} from "../support/mock-data";
import {
    fulfillJson,
    mockCommonPageDependencies,
    requestBody,
} from "../support/api-mocks";
import { TEST_USERS } from "../support/test-users";

function searchResult(
    status: "NONE" | "REQUEST_SENT" | "FRIEND" | "BLOCKED" | "SELF" = "NONE",
) {
    return { ...toSummaryProfile(TEST_USERS.B), friendStatus: status };
}

test.describe("Public ID user search", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("SOCIAL-05 publicId 검색 성공 결과를 표시한다", async ({ page }) => {
        await page.route("**/users/search?**", (route) =>
            fulfillJson(route, responseDto(searchResult())),
        );
        await page.goto("/friends/search");
        await page.locator("#publicId").fill(TEST_USERS.B.publicId);
        await page.getByRole("button", { name: "검색", exact: true }).click();
        await expect(page.getByText(TEST_USERS.B.publicId)).toBeVisible();
        await expect(page.getByText(TEST_USERS.B.nickname)).toBeVisible();
    });

    test("SOCIAL-06 빈 publicId 검색을 차단한다", async ({ page }) => {
        let calls = 0;
        await page.route("**/users/search?**", (route) => {
            calls += 1;
            return fulfillJson(route, responseDto(searchResult()));
        });
        await page.goto("/friends/search");
        await page.getByRole("button", { name: "검색", exact: true }).click();
        await expect(
            page.getByText("검색할 publicId를 입력해 주세요."),
        ).toBeVisible();
        expect(calls).toBe(0);
    });

    test("SOCIAL-07 존재하지 않는 publicId 상태를 표시한다", async ({ page }) => {
        await page.route("**/users/search?**", (route) =>
            fulfillJson(route, errorDto("PUBLIC_ID_NOT_FOUND"), 404),
        );
        await page.goto("/friends/search");
        await page.locator("#publicId").fill("TC-NOT-FOUND");
        await page.getByRole("button", { name: "검색", exact: true }).click();
        await expect(page.getByText("검색 결과가 없습니다.")).toBeVisible();
    });

    test("FRIEND-01 검색 결과에서 친구 요청을 전송한다", async ({ page }) => {
        let body: unknown = null;
        await page.route("**/users/search?**", (route) =>
            fulfillJson(route, responseDto(searchResult())),
        );
        await page.route("**/friend-requests", async (route) => {
            body = requestBody(route);
            return fulfillJson(
                route,
                responseDto(toFriendRequest({ id: 11 })),
            );
        });
        await page.goto("/friends/search");
        await page.locator("#publicId").fill(TEST_USERS.B.publicId);
        await page.getByRole("button", { name: "검색", exact: true }).click();
        await page
            .getByRole("button", { name: "친구 요청 보내기", exact: true })
            .click();
        await expect(
            page.getByText("친구 요청을 보냈습니다.", { exact: true }),
        ).toBeVisible();
        expect(body).toEqual({ receiverPublicId: TEST_USERS.B.publicId });
    });

    test("DIRECT-01 친구 검색 결과에서 기존/신규 DIRECT room으로 이동한다", async ({ page }) => {
        await page.route("**/users/search?**", (route) =>
            fulfillJson(route, responseDto(searchResult("FRIEND"))),
        );
        await page.route(
            `**/chat/friends/${TEST_USERS.B.userId}/direct-room`,
            (route) => fulfillJson(route, responseDto(makeRoom({ id: 777 }))),
        );
        await page.goto("/friends/search");
        await page.locator("#publicId").fill(TEST_USERS.B.publicId);
        await page.getByRole("button", { name: "검색", exact: true }).click();
        await page
            .getByRole("button", { name: "1:1 채팅 시작", exact: true })
            .click();
        await expect(page).toHaveURL(/\/chat\/rooms\/777$/);
    });
});
