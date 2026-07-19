import { expect, test } from "../fixtures/mock-test";

import {
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import { makeMessage } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const PROFILE_IMAGE_DATA_URL =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">' +
            '<rect width="40" height="40" fill="#f97316"/>' +
        "</svg>",
    );

test.describe("Chat room detail", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("CHAT-01 방 상세와 초기 메시지를 표시한다", async ({ page }) => {
        await mockChatRoomBase(page, {
            room: undefined,
            messages: [
                makeMessage({
                    id: 1,
                    content: "초기 메시지",
                    translations: [
                        {
                            id: 7001,
                            languageCode: "ja",
                            translatedContent: "こんにちは",
                            status: "COMPLETED",
                            failureReason: null,
                            completedAt:
                                "2026-07-05T12:05:00.000Z",
                        },
                    ],
                }),
            ],
        });

        await page.goto("/chat/rooms/501");

        await expect(
            page.getByText("친구와의 1:1 채팅"),
        ).toBeVisible();
        await expect(page.getByText("초기 메시지")).toBeVisible();
        await expect(page.getByText("こんにちは")).toBeVisible();
    });

    test("CHAT-02 메시지가 없으면 Empty 상태를 표시한다", async ({ page }) => {
        await mockChatRoomBase(page, { messages: [] });
        await page.goto("/chat/rooms/501");

        await expect(
            page.getByText("아직 메시지가 없습니다"),
        ).toBeVisible();
    });

    test("CHAT-08 내 메시지와 상대 메시지 및 상대 프로필 이미지를 렌더링한다", async ({
        page,
    }) => {
        const mine = makeMessage({
            id: 1,
            sender: TEST_USERS.A,
            content: "내 메시지",
        });

        const theirs = makeMessage({
            id: 2,
            sender: TEST_USERS.B,
            content: "상대 메시지",
            senderProfileImageUrl: PROFILE_IMAGE_DATA_URL,
        });

        await mockChatRoomBase(page, {
            messages: [mine, theirs],
        });

        await page.goto("/chat/rooms/501");

        await expect(page.getByText("내 메시지")).toBeVisible();
        await expect(page.getByText("상대 메시지")).toBeVisible();

        const avatar = page.getByTestId(
            "chat-message-avatar-2",
        );
        await expect(avatar).toBeVisible();
        await expect(avatar.locator("img")).toHaveAttribute(
            "src",
            PROFILE_IMAGE_DATA_URL,
        );

        await expect(
            page.getByTestId("chat-message-avatar-1"),
        ).toHaveCount(0);
    });
});
