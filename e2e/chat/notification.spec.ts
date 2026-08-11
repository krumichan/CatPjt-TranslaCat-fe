import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    fulfillJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { responseDto } from "../support/mock-data";

const summary = {
    unreadChatMessageCount: 4,
    unreadChatRoomCount: 1,
    unreadActivityCount: 2,
    totalAttentionCount: 6,
};

const chats = {
    items: [
        {
            roomId: 100,
            roomType: "GROUP",
            sourceType: "MANUAL",
            roomDisplayName: "알림 테스트방",
            roomAvatarUrl: null,
            latestMessage: {
                id: 1500,
                senderDisplayName: "B",
                messageType: "TEXT",
                contentPreview: "마지막 메시지입니다.",
                createdAt: "2026-08-11T14:30:00",
            },
            unreadCount: 4,
            firstUnreadMessageId: 1497,
        },
    ],
    nextCursorMessageId: null,
    hasNext: false,
};

const activities = {
    items: [
        {
            id: 301,
            notificationType: "OPEN_CHAT_ROLE_CHANGED",
            roomId: 100,
            payload: {
                roomName: "알림 테스트방",
                newRole: "ADMIN",
            },
            isRead: false,
            readAt: null,
            createdAt: "2026-08-11T14:35:00",
        },
        {
            id: 300,
            notificationType: "OPEN_CHAT_ROOM_CLOSED",
            roomId: 99,
            payload: {
                roomName: "종료된 오픈방",
            },
            isRead: false,
            readAt: null,
            createdAt: "2026-08-11T14:20:00",
        },
    ],
    nextCursorId: null,
    hasNext: false,
};

test.describe("FE #15 notification center stage 1", () => {
    test("NOTI-BASE-01 채팅/활동 Tab과 Backend Summary를 표시한다", async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);

        await page.route("**/chat/rooms", (route) =>
            fulfillJson(
                route,
                responseDto({
                    chatRooms: [],
                }),
            ),
        );

        await page.route("**/chat/notifications/summary", (route) =>
            fulfillApiJson(route, responseDto(summary)),
        );
        await page.route("**/chat/notifications/chats**", (route) =>
            fulfillApiJson(route, responseDto(chats)),
        );
        await page.route("**/chat/notifications/activities**", (route) =>
            fulfillApiJson(route, responseDto(activities)),
        );

        await page.goto("/chat");
        await expect(page.getByRole("button", { name: "알림" })).toContainText("6");

        await page.getByRole("button", { name: "알림" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        await expect(dialog.getByText("알림 테스트방", { exact: true })).toBeVisible();
        await expect(dialog.getByText("마지막 메시지입니다.")).toBeVisible();
        await expect(dialog.getByTestId("chat-notification-room-100")).toContainText("4");

        await dialog.getByRole("button", { name: /활동/ }).click();
        await expect(dialog.getByText(/ADMIN/)).toBeVisible();
        await expect(dialog.getByText(/종료된 오픈방/)).toBeVisible();
    });
});
