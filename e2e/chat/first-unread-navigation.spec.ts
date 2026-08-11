import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatLanguageSettings } from "../support/chat-mocks";
import {
    makeLanguageSettings,
    makeMessage,
    makeRoom,
    makeTranslation,
    responseDto,
} from "../support/mock-data";

const ROOM_ID = 701;
const FIRST_UNREAD_MESSAGE_ID = 1000;

const makeRangeMessages = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, index) => {
        const id = start + index;
        return makeMessage({
            id,
            roomId: ROOM_ID,
            content:
                id === FIRST_UNREAD_MESSAGE_ID
                    ? "첫 번째 안 읽은 메시지"
                    : `anchor message ${id}`,
            translations: [
                makeTranslation({
                    id: 90000 + id,
                    translatedContent: `翻訳 ${id}`,
                }),
            ],
        });
    });

async function mockRoomBase(page: Page) {
    const room = makeRoom({ id: ROOM_ID });

    await page.route(new RegExp(`/chat/rooms/${ROOM_ID}$`), (route) =>
        fulfillApiJson(route, responseDto(room)),
    );
    await mockChatLanguageSettings(page, {
        roomId: ROOM_ID,
        languageSettings: makeLanguageSettings({ chatRoomId: ROOM_ID }),
    });
    await page.route(new RegExp(`/chat/rooms/${ROOM_ID}/read$`), (route) => {
        const body = route.request().postDataJSON() as {
            lastReadMessageId: number;
        };
        return fulfillApiJson(
            route,
            responseDto({
                chatRoomId: ROOM_ID,
                lastReadMessageId: body.lastReadMessageId,
                lastReadAt: new Date().toISOString(),
                unreadCount: 0,
            }),
        );
    });
}

test.describe("FE #15 first-unread room navigation", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
        await mockRoomBase(page);
    });

    test("READ-ANCHOR-01 first unread 주변 Page만 조회하고 Divider/점진적 읽음을 적용한다", async ({
        page,
    }) => {
        const anchorMessages = makeRangeMessages(995, 1030);
        let anchorCalls = 0;
        let latestCalls = 0;
        const readTargets: number[] = [];

        await page.route(
            new RegExp(`/chat/rooms/${ROOM_ID}/messages/anchor(?:\\?.*)?$`),
            (route) => {
                anchorCalls += 1;
                const url = new URL(route.request().url());
                expect(url.searchParams.get("anchorMessageId")).toBe("1000");
                return fulfillApiJson(
                    route,
                    responseDto({
                        messages: anchorMessages,
                        anchorMessageId: FIRST_UNREAD_MESSAGE_ID,
                        previousCursorId: 995,
                        hasPrevious: true,
                        nextCursorId: 1030,
                        hasNext: true,
                    }),
                );
            },
        );
        await page.route(
            new RegExp(`/chat/rooms/${ROOM_ID}/messages(?:\\?.*)?$`),
            (route) => {
                latestCalls += 1;
                return fulfillApiJson(
                    route,
                    responseDto({
                        messages: [
                            makeMessage({
                                id: 1499,
                                roomId: ROOM_ID,
                                content: "latest 1499",
                            }),
                            makeMessage({
                                id: 1500,
                                roomId: ROOM_ID,
                                content: "latest 1500",
                            }),
                        ],
                        nextCursorId: 1499,
                        hasNext: true,
                    }),
                );
            },
        );
        await page.route(
            new RegExp(`/chat/rooms/${ROOM_ID}/read$`),
            async (route) => {
                const body = route.request().postDataJSON() as {
                    lastReadMessageId: number;
                };
                readTargets.push(body.lastReadMessageId);
                await fulfillApiJson(
                    route,
                    responseDto({
                        chatRoomId: ROOM_ID,
                        lastReadMessageId: body.lastReadMessageId,
                        lastReadAt: new Date().toISOString(),
                        unreadCount: Math.max(0, 1500 - body.lastReadMessageId),
                    }),
                );
            },
        );

        await page.goto(
            `/chat/rooms/${ROOM_ID}?firstUnreadMessageId=${FIRST_UNREAD_MESSAGE_ID}`,
        );

        await expect(page.getByTestId("chat-first-unread-divider")).toBeVisible();
        await expect(page.getByText("첫 번째 안 읽은 메시지")).toBeVisible();
        await expect.poll(() => anchorCalls).toBe(1);
        expect(latestCalls).toBe(0);

        await expect.poll(() => readTargets.length).toBeGreaterThan(0);
        expect(Math.max(...readTargets)).toBeLessThanOrEqual(1030);
        expect(readTargets).not.toContain(1500);
    });

    test("READ-ANCHOR-02 아래 Scroll 시 after Cursor로 다음 Page만 Lazy Load한다", async ({
        page,
    }) => {
        const anchorMessages = makeRangeMessages(995, 1030);
        let afterCursor: string | null = null;

        await page.route(
            new RegExp(`/chat/rooms/${ROOM_ID}/messages/anchor(?:\\?.*)?$`),
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto({
                        messages: anchorMessages,
                        anchorMessageId: FIRST_UNREAD_MESSAGE_ID,
                        previousCursorId: null,
                        hasPrevious: false,
                        nextCursorId: 1030,
                        hasNext: true,
                    }),
                ),
        );
        await page.route(
            new RegExp(`/chat/rooms/${ROOM_ID}/messages/after(?:\\?.*)?$`),
            (route) => {
                const url = new URL(route.request().url());
                afterCursor = url.searchParams.get("cursorId");
                return fulfillApiJson(
                    route,
                    responseDto({
                        messages: makeRangeMessages(1031, 1040),
                        nextCursorId: null,
                        hasNext: false,
                    }),
                );
            },
        );

        await page.goto(
            `/chat/rooms/${ROOM_ID}?firstUnreadMessageId=${FIRST_UNREAD_MESSAGE_ID}`,
        );
        const scroll = page.locator(".custom-scroll");
        await expect(scroll).toBeVisible();

        await scroll.evaluate((element) => {
            element.scrollTop = element.scrollHeight;
            element.dispatchEvent(new Event("scroll", { bubbles: true }));
        });

        await expect.poll(() => afterCursor).toBe("1030");
        await expect(page.getByTestId("chat-message-row-1040")).toHaveCount(1);
    });

    test("READ-LATEST-01 최신 메시지로는 중간 Page를 조회하지 않고 latest Page + latest Read를 수행한다", async ({
        page,
    }) => {
        const anchorMessages = makeRangeMessages(995, 1030);
        let latestCalls = 0;
        let afterCalls = 0;
        const readTargets: number[] = [];

        await page.route(
            new RegExp(`/chat/rooms/${ROOM_ID}/messages/anchor(?:\\?.*)?$`),
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto({
                        messages: anchorMessages,
                        anchorMessageId: FIRST_UNREAD_MESSAGE_ID,
                        previousCursorId: 995,
                        hasPrevious: true,
                        nextCursorId: 1030,
                        hasNext: true,
                    }),
                ),
        );
        await page.route(
            new RegExp(`/chat/rooms/${ROOM_ID}/messages/after(?:\\?.*)?$`),
            (route) => {
                afterCalls += 1;
                return fulfillApiJson(
                    route,
                    responseDto({
                        messages: [],
                        nextCursorId: null,
                        hasNext: false,
                    }),
                );
            },
        );
        await page.route(
            new RegExp(`/chat/rooms/${ROOM_ID}/messages(?:\\?.*)?$`),
            (route) => {
                latestCalls += 1;
                return fulfillApiJson(
                    route,
                    responseDto({
                        messages: [
                            makeMessage({
                                id: 1499,
                                roomId: ROOM_ID,
                                content: "최신 바로 전 메시지",
                            }),
                            makeMessage({
                                id: 1500,
                                roomId: ROOM_ID,
                                content: "최신 메시지",
                                translations: [
                                    makeTranslation({
                                        id: 91500,
                                        translatedContent: "最新メッセージ",
                                    }),
                                ],
                            }),
                        ],
                        nextCursorId: 1499,
                        hasNext: true,
                    }),
                );
            },
        );
        await page.route(
            new RegExp(`/chat/rooms/${ROOM_ID}/read$`),
            async (route) => {
                const body = route.request().postDataJSON() as {
                    lastReadMessageId: number;
                };
                readTargets.push(body.lastReadMessageId);
                await fulfillApiJson(
                    route,
                    responseDto({
                        chatRoomId: ROOM_ID,
                        lastReadMessageId: body.lastReadMessageId,
                        lastReadAt: new Date().toISOString(),
                        unreadCount: 0,
                    }),
                );
            },
        );

        await page.goto(
            `/chat/rooms/${ROOM_ID}?firstUnreadMessageId=${FIRST_UNREAD_MESSAGE_ID}`,
        );
        await expect(page.getByTestId("chat-jump-to-latest")).toBeVisible();

        await page.getByTestId("chat-jump-to-latest").click();

        await expect(
            page
                .getByTestId("chat-message-bubble-1500")
                .getByText("최신 메시지", { exact: true }),
        ).toBeVisible();
        await expect.poll(() => latestCalls).toBe(1);
        expect(afterCalls).toBe(0);
        await expect.poll(() => readTargets).toContain(1500);
        await expect(page.getByTestId("chat-first-unread-divider")).toHaveCount(0);
    });
});
