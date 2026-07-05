import { expect, test } from "../fixtures/mock-test";
import type { WebSocketRoute } from "@playwright/test";
import { mockCommonPageDependencies } from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import { makeMessage } from "../support/mock-data";
import { mockStompBroker, sendStompJson } from "../support/stomp-mock";
import { TEST_USERS } from "../support/test-users";

test.describe("STOMP WebSocket", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("WS-01 STOMP 연결 성공 상태를 표시한다", async ({ page }) => {
        await mockStompBroker(page);
        await mockChatRoomBase(page);
        await page.goto("/chat/rooms/501");
        await expect(page.getByText(/WS:\s*CONNECTED/i)).toBeVisible();
    });

    test("WS-02 chat.message.created 이벤트를 화면에 반영한다", async ({ page }) => {
        let socket: WebSocketRoute | null = null;
        await mockStompBroker(page, {
            onSocket: (nextSocket) => {
                socket = nextSocket;
            },
        });
        await mockChatRoomBase(page);

        await page.goto("/chat/rooms/501");
        await expect(page.getByText(/WS:\s*CONNECTED/i)).toBeVisible();
        expect(socket).not.toBeNull();

        sendStompJson(socket!, "/topic/chat/rooms/501", {
            eventType: "chat.message.created",
            payload: makeMessage({
                id: 99,
                sender: TEST_USERS.B,
                content: "웹소켓 수신 메시지",
            }),
        });

        await expect(page.getByText("웹소켓 수신 메시지")).toBeVisible();
    });

    test("WS-03 연결 상태에서 SEND frame body를 검증한다", async ({ page }) => {
        let destination = "";
        let body = "";

        await mockStompBroker(page, {
            onSend: (nextDestination, nextBody) => {
                destination = nextDestination;
                body = nextBody.replace(/\0+$/g, "");
            },
        });
        await mockChatRoomBase(page);

        await page.goto("/chat/rooms/501");
        await expect(page.getByText(/WS:\s*CONNECTED/i)).toBeVisible();
        await page
            .getByPlaceholder("메시지를 입력하세요")
            .fill("STOMP SEND TEST");
        await page
            .getByRole("button", { name: "메시지 전송" })
            .click();

        await expect.poll(() => destination).toBe(
            "/app/chat/rooms/501/messages",
        );
        expect(JSON.parse(body)).toEqual({ content: "STOMP SEND TEST" });
    });
});
