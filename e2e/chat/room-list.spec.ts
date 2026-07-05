import { expect, test } from "../fixtures/mock-test";
import {
    fulfillJson,
    mockCommonPageDependencies,
} from "../support/api-mocks";
import { makeRoomListItem, responseDto } from "../support/mock-data";

test.describe("Chat room list", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("ROOM-01~04 MANUAL/FRIEND DIRECT/GROUP를 현재 정책으로 표시한다", async ({ page }) => {
        const rooms = [
            makeRoomListItem({
                id: 1,
                roomType: "DIRECT",
                sourceType: "MANUAL",
                name: "Manual Direct",
                memberCount: 2,
            }),
            makeRoomListItem({
                id: 2,
                roomType: "GROUP",
                sourceType: "MANUAL",
                name: "Manual Group",
                memberCount: 3,
            }),
            makeRoomListItem({
                id: 3,
                roomType: "DIRECT",
                sourceType: "FRIEND",
                name: null,
                memberCount: 2,
            }),
            makeRoomListItem({
                id: 4,
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "친구 그룹",
                description: "Phase 1.5 group",
                memberCount: 3,
            }),
        ];

        await page.route("**/chat/rooms", (route) =>
            fulfillJson(route, responseDto({ chatRooms: rooms })),
        );

        await page.goto("/chat");
        await expect(page.getByText("Manual Direct")).toBeVisible();
        await expect(page.getByText("Manual Group")).toBeVisible();
        await expect(page.getByText("친구와의 1:1 채팅")).toBeVisible();
        await expect(page.getByText("친구 그룹")).toBeVisible();
        await expect(page.getByText("Phase 1.5 group")).toBeVisible();
    });

    test("ROOM-05 방 카드를 클릭하면 상세로 이동한다", async ({ page }) => {
        const room = makeRoomListItem({
            id: 555,
            roomType: "GROUP",
            sourceType: "FRIEND",
            name: "이동 테스트",
            memberCount: 3,
        });
        await page.route("**/chat/rooms", (route) =>
            fulfillJson(route, responseDto({ chatRooms: [room] })),
        );

        await page.goto("/chat");
        await page.getByRole("link", { name: /이동 테스트/ }).click();
        await expect(page).toHaveURL(/\/chat\/rooms\/555$/);
    });

    test("BASE-05 목록 조회 실패 후 재시도한다", async ({ page }) => {
        let count = 0;
        await page.route("**/chat/rooms", async (route) => {
            count += 1;
            if (count === 1) {
                return fulfillJson(route, { message: "failed" }, 500);
            }
            return fulfillJson(route, responseDto({ chatRooms: [] }));
        });

        await page.goto("/chat");
        await page
            .getByRole("button", { name: "다시 시도", exact: true })
            .click();
        await expect.poll(() => count).toBeGreaterThanOrEqual(2);
    });

    test("TRANSITION-02 채팅 시작 CTA는 친구 목록으로 이동한다", async ({ page }) => {
        await page.route("**/chat/rooms", (route) =>
            fulfillJson(route, responseDto({ chatRooms: [] })),
        );

        await page.goto("/chat");
        await page
            .getByRole("button", { name: "친구와 채팅 시작", exact: true })
            .click();
        await expect(page).toHaveURL(/\/friends$/);
    });
});
