import { expect, test } from "../fixtures/mock-test";
import type { WebSocketRoute } from "@playwright/test";
import {
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import { makeMessage, makeTranslation } from "../support/mock-data";
import { sendStompJson } from "../support/stomp-mock";

test.describe("Chat translation", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("TR-01 COMPLETED 번역을 표시한다", async ({ page }) => {
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            messages: [
                makeMessage({
                    id: 1,
                    content: "안녕하세요",
                    translations: [
                        makeTranslation({ translatedContent: "こんにちは" }),
                    ],
                }),
            ],
        });
        await page.goto("/chat/rooms/501");
        await expect(page.getByText("こんにちは")).toBeVisible();
    });

    test("TR-02 PENDING 번역 상태를 표시한다", async ({ page }) => {
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            messages: [
                makeMessage({
                    id: 2,
                    content: "번역 대기",
                    translations: [
                        makeTranslation({
                            status: "PENDING",
                            translatedContent: null,
                        }),
                    ],
                }),
            ],
        });
        await page.goto("/chat/rooms/501");
        await expect(page.getByText("번역 중...")).toBeVisible();
    });

    test("TR-03 translation.completed 이벤트가 PENDING을 완료 결과로 갱신한다", async ({ page }) => {
        let socket: WebSocketRoute | null = null;
        await page.routeWebSocket(/.*/, (webSocket) => {
            socket = webSocket;
            webSocket.onMessage((message) => {
                const frame = String(message);
                if (frame.startsWith("CONNECT") || frame.startsWith("STOMP")) {
                    webSocket.send(
                        "CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0",
                    );
                }
            });
        });

        await mockChatRoomBase(page, {
            messages: [
                makeMessage({
                    id: 3,
                    content: "완료 이벤트",
                    translations: [
                        makeTranslation({
                            id: 7003,
                            status: "PENDING",
                            translatedContent: null,
                        }),
                    ],
                }),
            ],
        });

        await page.goto("/chat/rooms/501");
        await expect(page.getByText("번역 중...")).toBeVisible();
        expect(socket).not.toBeNull();

        sendStompJson(socket!, "/topic/chat/rooms/501", {
            eventType: "chat.translation.completed",
            payload: {
                messageId: 3,
                translation: makeTranslation({
                    id: 7003,
                    translatedContent: "翻訳完了",
                    status: "COMPLETED",
                }),
            },
        });
        await expect(page.getByText("翻訳完了")).toBeVisible();
    });

    test("TR-04~05 FAILED 상태를 표시하고 원문을 유지한다", async ({ page }) => {
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            messages: [
                makeMessage({
                    id: 4,
                    content: "원문은 유지되어야 함",
                    translations: [
                        makeTranslation({
                            status: "FAILED",
                            translatedContent: null,
                        }),
                    ],
                }),
            ],
        });
        await page.goto("/chat/rooms/501");
        await expect(page.getByText("번역에 실패했습니다.")).toBeVisible();
        await expect(page.getByText("원문은 유지되어야 함")).toBeVisible();
    });
});
