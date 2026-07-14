import { expect, test } from "../fixtures/mock-test";
import {
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import { makeMessage, makeRoom } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const PROFILE_IMAGE_DATA_URL =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23f97316'/%3E%3C/svg%3E";

test.describe("Chat room detail", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("CHAT-01 FRIEND DIRECT 상대 프로필과 초기 메시지를 표시한다", async ({
        page,
    }) => {
        const room = {
            ...makeRoom({ name: "Legacy Friend Direct Name" }),
            directPartner: {
                userId: TEST_USERS.B.userId,
                displayName: TEST_USERS.B.nickname,
                profileImageUrl: PROFILE_IMAGE_DATA_URL,
            },
        };
        let roomMemberApiRequestCount = 0;

        page.on("request", (request) => {
            const pathname = new URL(request.url()).pathname;
            if (/\/chat\/rooms\/501\/members$/.test(pathname)) {
                roomMemberApiRequestCount += 1;
            }
        });

        await mockChatRoomBase(page, {
            room,
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
                            completedAt: "2026-07-05T12:05:00.000Z",
                        },
                    ],
                }),
            ],
        });

        await page.goto("/chat/rooms/501");

        await expect(
            page.getByRole("heading", { name: TEST_USERS.B.nickname }),
        ).toBeVisible();
        await expect(
            page.getByRole("img", { name: TEST_USERS.B.nickname }),
        ).toHaveAttribute("src", /^data:image\/svg\+xml/);
        await expect(
            page.getByText("Legacy Friend Direct Name"),
        ).toHaveCount(0);
        await expect(page.getByText("초기 메시지")).toBeVisible();
        await expect(page.getByText("こんにちは")).toBeVisible();
        expect(roomMemberApiRequestCount).toBe(0);
    });

    test("CHAT-02 메시지가 없으면 Empty 상태를 표시한다", async ({ page }) => {
        await mockChatRoomBase(page, { messages: [] });

        await page.goto("/chat/rooms/501");

        await expect(page.getByText("아직 메시지가 없습니다")).toBeVisible();
    });

    test("CHAT-03 FRIEND DIRECT 상대 정보가 없으면 fallback 제목과 기본 아바타를 표시한다", async ({
        page,
    }) => {
        await mockChatRoomBase(page, {
            room: makeRoom({ name: "사용하지 않을 레거시 방 이름" }),
            messages: [],
        });

        await page.goto("/chat/rooms/501");

        await expect(
            page.getByRole("heading", { name: "친구와의 1:1 채팅" }),
        ).toBeVisible();
        await expect(
            page.getByRole("img", { name: "친구와의 1:1 채팅" }),
        ).toBeVisible();
        await expect(
            page.getByText("사용하지 않을 레거시 방 이름"),
        ).toHaveCount(0);
    });

    test("CHAT-08 내 메시지와 상대 메시지를 모두 렌더링한다", async ({
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
        });

        await mockChatRoomBase(page, { messages: [mine, theirs] });

        await page.goto("/chat/rooms/501");

        await expect(page.getByText("내 메시지")).toBeVisible();
        await expect(page.getByText("상대 메시지")).toBeVisible();
    });
});
