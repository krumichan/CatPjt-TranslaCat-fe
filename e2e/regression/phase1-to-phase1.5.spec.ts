import { expect, test } from "../fixtures/mock-test";
import {
    fulfillJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import {
    makeMessage,
    makeRoomListItem,
    responseDto,
} from "../support/mock-data";

test.describe("Phase 1 -> Phase 1.5 transition regression", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("TRANSITION-01 일반 사용자 채팅 목록에 userId 직접 입력 생성 UI가 노출되지 않는다", async ({ page }) => {
        await page.route("**/chat/rooms", (route) =>
            fulfillJson(route, responseDto({ chatRooms: [] })),
        );

        await page.goto("/chat");
        await expect(page.getByText(/사용자 ID|memberUserIds/i)).toHaveCount(0);
        const emptyStateSection = page
            .locator("section")
            .filter({
                hasText: "아직 참여 중인 채팅방이 없습니다",
            });

        await expect(
            emptyStateSection.getByRole("button", {
                name: "친구와 채팅 시작",
                exact: true,
            }),
        ).toBeVisible();
    });

    test("TRANSITION-03 기존 MANUAL 방은 목록과 상세에서 계속 사용할 수 있다", async ({ page }) => {
        const room = makeRoomListItem({
            id: 501,
            roomType: "DIRECT",
            sourceType: "MANUAL",
            name: "Legacy Manual Room",
            memberCount: 2,
        });
        await page.route("**/chat/rooms", (route) =>
            fulfillJson(route, responseDto({ chatRooms: [room] })),
        );

        await page.goto("/chat");
        await expect(page.getByText("Legacy Manual Room")).toBeVisible();

        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: {
                ...room,
                name: "Legacy Manual Room",
                active: true,
                originalLanguageCode: "ko",
                translationLanguageCode: "ja",
                roomLanguageSettingApplied: true,
            },
            messages: [
                makeMessage({ id: 1, content: "legacy core message" }),
            ],
        });

        await page.goto("/chat/rooms/501");
        await expect(page.getByText("legacy core message")).toBeVisible();
        await expect(
            page.getByPlaceholder("메시지를 입력하세요"),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "언어", exact: true }),
        ).toBeVisible();
    });
});
