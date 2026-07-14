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
    responseDto,
} from "../support/mock-data";

test.describe("Message history pagination", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("CHAT-04 과거 메시지를 cursor로 추가 로드한다", async ({ page }) => {
        const room = makeRoom({ id: 501 });
        await page.route(/\/chat\/rooms\/501$/, (route) =>
            fulfillApiJson(route, responseDto(room)),
        );
        await mockChatLanguageSettings(page, {
            roomId: 501,
            languageSettings: makeLanguageSettings({ chatRoomId: 501 }),
        });

        let cursorCalls = 0;
        await page.route(
            /\/chat\/rooms\/501\/messages(?:\?.*)?$/,
            (route) => {
                const url = new URL(route.request().url());
                const cursor = url.searchParams.get("cursorId");
                if (cursor) {
                    cursorCalls += 1;
                    return fulfillApiJson(
                        route,
                        responseDto({
                            messages: [
                                makeMessage({
                                    id: 1,
                                    content: "더 오래된 메시지",
                                }),
                            ],
                            hasNext: false,
                            nextCursorId: null,
                        }),
                    );
                }
                return fulfillApiJson(
                    route,
                    responseDto({
                        messages: [
                            makeMessage({ id: 2, content: "최근 메시지" }),
                        ],
                        hasNext: true,
                        nextCursorId: 2,
                    }),
                );
            },
        );

        await page.goto("/chat/rooms/501");
        const scroll = page.locator(".custom-scroll");
        await expect(scroll).toBeVisible();
        await scroll.evaluate((element) => {
            element.scrollTop = 0;
            element.dispatchEvent(new Event("scroll", { bubbles: true }));
        });
        await expect(page.getByText("더 오래된 메시지")).toBeVisible();
        expect(cursorCalls).toBe(1);
    });

    test("CHAT-05 cursor 응답의 중복 메시지를 ID 기준으로 중복 표시하지 않는다", async ({ page }) => {
        const room = makeRoom({ id: 501 });
        await page.route(/\/chat\/rooms\/501$/, (route) =>
            fulfillApiJson(route, responseDto(room)),
        );
        await mockChatLanguageSettings(page, {
            roomId: 501,
            languageSettings: makeLanguageSettings({ chatRoomId: 501 }),
        });
        await page.route(
            /\/chat\/rooms\/501\/messages(?:\?.*)?$/,
            (route) => {
                const url = new URL(route.request().url());
                if (url.searchParams.has("cursorId")) {
                    return fulfillApiJson(
                        route,
                        responseDto({
                            messages: [
                                makeMessage({
                                    id: 2,
                                    content: "중복 메시지",
                                }),
                                makeMessage({
                                    id: 1,
                                    content: "이전 메시지",
                                }),
                            ],
                            hasNext: false,
                            nextCursorId: null,
                        }),
                    );
                }
                return fulfillApiJson(
                    route,
                    responseDto({
                        messages: [
                            makeMessage({ id: 2, content: "중복 메시지" }),
                        ],
                        hasNext: true,
                        nextCursorId: 2,
                    }),
                );
            },
        );

        await page.goto("/chat/rooms/501");
        const scroll = page.locator(".custom-scroll");
        await expect(scroll).toBeVisible();
        await scroll.evaluate((element) => {
            element.scrollTop = 0;
            element.dispatchEvent(new Event("scroll", { bubbles: true }));
        });
        await expect(page.getByText("이전 메시지")).toBeVisible();
        await expect(page.getByText("중복 메시지")).toHaveCount(1);
    });
});
