import { expect, test } from "../fixtures/mock-test";
import {
    fulfillJson,
    mockCommonPageDependencies,
} from "../support/api-mocks";
import { makeRoomListItem, responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const PROFILE_IMAGE_DATA_URL =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23f97316'/%3E%3C/svg%3E";

test.describe("Chat room list", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("ROOM-01~04 MANUAL/FRIEND DIRECT/GROUP를 현재 정책으로 표시한다", async ({
        page,
    }) => {
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
            {
                ...makeRoomListItem({
                    id: 3,
                    roomType: "DIRECT",
                    sourceType: "FRIEND",
                    name: "Legacy Friend Direct Name",
                    memberCount: 2,
                }),
                directPartner: {
                    userId: TEST_USERS.B.userId,
                    displayName: TEST_USERS.B.nickname,
                    profileImageUrl: PROFILE_IMAGE_DATA_URL,
                },
            },
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
        await expect(page.getByText(TEST_USERS.B.nickname)).toBeVisible();
        await expect(page.getByText("1:1 · 친구 채팅")).toBeVisible();
        await expect(
            page.getByRole("img", { name: TEST_USERS.B.nickname }),
        ).toHaveAttribute("src", /^data:image\/svg\+xml/);
        await expect(
            page.getByText("Legacy Friend Direct Name"),
        ).toHaveCount(0);
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

    test("ROOM-06 FRIEND DIRECT 상대 정보가 없으면 fallback 제목과 기본 아바타를 표시한다", async ({
        page,
    }) => {
        const room = makeRoomListItem({
            id: 556,
            roomType: "DIRECT",
            sourceType: "FRIEND",
            name: "사용하지 않을 레거시 방 이름",
            memberCount: 2,
        });

        await page.route("**/chat/rooms", (route) =>
            fulfillJson(route, responseDto({ chatRooms: [room] })),
        );

        await page.goto("/chat");

        await expect(page.getByText("친구와의 1:1 채팅")).toBeVisible();
        await expect(page.getByText("1:1 · 친구 채팅")).toBeVisible();
        await expect(
            page.getByRole("img", { name: "친구와의 1:1 채팅" }),
        ).toBeVisible();
        await expect(
            page.getByText("사용하지 않을 레거시 방 이름"),
        ).toHaveCount(0);
    });

    test("ROOM-07 FRIEND DIRECT 프로필 이미지가 없으면 상대 이름과 기본 아바타를 표시한다", async ({
        page,
    }) => {
        const room = {
            ...makeRoomListItem({
                id: 557,
                roomType: "DIRECT",
                sourceType: "FRIEND",
                name: null,
                memberCount: 2,
            }),
            directPartner: {
                userId: TEST_USERS.C.userId,
                displayName: TEST_USERS.C.nickname,
                profileImageUrl: null,
            },
        };

        await page.route("**/chat/rooms", (route) =>
            fulfillJson(route, responseDto({ chatRooms: [room] })),
        );

        await page.goto("/chat");

        await expect(page.getByText(TEST_USERS.C.nickname)).toBeVisible();
        await expect(
            page.getByRole("img", { name: TEST_USERS.C.nickname }),
        ).toBeVisible();
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

    test("TRANSITION-02 채팅 시작 CTA는 친구 목록으로 이동한다", async ({
        page,
    }) => {
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
