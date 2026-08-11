import { expect, test } from "../fixtures/mock-test";
import {
    fulfillJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import { makeMessage, responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

test.describe("Message send REST fallback", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("WS-04 빈 메시지는 전송하지 않는다", async ({ page }) => {
        let posts = 0;
        await mockChatRoomBase(page);
        await page.route(/\/chat\/rooms\/501\/messages$/, async (route) => {
            if (route.request().method() === "POST") {
                posts += 1;
                return fulfillJson(
                    route,
                    responseDto(
                        makeMessage({
                            id: 10,
                            sender: TEST_USERS.A,
                            content: "x",
                        }),
                    ),
                );
            }

            return route.fallback();
        });

        await page.goto("/chat/rooms/501");
        const send = page.getByRole("button", { name: "메시지 전송" });
        await expect(send).toBeDisabled();
        expect(posts).toBe(0);
    });

    test("WS-06 WebSocket 미연결 시 REST fallback으로 전송하고 화면에 추가한다", async ({ page }) => {
        await mockChatRoomBase(page);
        await page.route(/\/chat\/rooms\/501\/messages$/, async (route) => {
            if (route.request().method() !== "POST") {
                return route.fallback();
            }
            return fulfillJson(
                route,
                responseDto(
                    makeMessage({
                        id: 11,
                        sender: TEST_USERS.A,
                        content: "REST fallback message",
                    }),
                ),
            );
        });

        await page.goto("/chat/rooms/501");
        const input = page.getByPlaceholder("메시지를 입력하세요");
        await input.fill("REST fallback message");

        const requestPromise = page.waitForRequest((request) => {
            const pathname = new URL(request.url()).pathname;
            return (
                request.method() === "POST" &&
                pathname.endsWith("/chat/rooms/501/messages")
            );
        });

        await page
            .getByRole("button", { name: "메시지 전송" })
            .click();

        const request = await requestPromise;
        const body = request.postDataJSON();

        expect(body).toEqual({ content: "REST fallback message" });
        await expect(
            page.getByText("REST fallback message", { exact: true }),
        ).toBeVisible();
        await expect(input).toHaveValue("");
    });

    test("WS-07 createdAt 시각이 역전되어도 messageId 순서로 최신 메시지를 아래에 유지한다", async ({ page }) => {
        const existingMessage = {
            ...makeMessage({
                id: 10,
                sender: TEST_USERS.B,
                content: "기존 메시지",
            }),
            // 과거 Local/JST 데이터처럼 더 늦은 wall-clock 값이 남아 있는 상황을 재현한다.
            createdAt: "2026-08-11T21:32:00",
            updatedAt: "2026-08-11T21:32:00",
        };

        await mockChatRoomBase(page, { messages: [existingMessage] });
        await page.route(/\/chat\/rooms\/501\/messages$/, async (route) => {
            if (route.request().method() !== "POST") {
                return route.fallback();
            }

            return fulfillJson(
                route,
                responseDto({
                    ...makeMessage({
                        id: 11,
                        sender: TEST_USERS.A,
                        content: "방금 보낸 메시지",
                    }),
                    // OCI/UTC에서 생성된 값처럼 wall-clock만 보면 기존 메시지보다 작다.
                    createdAt: "2026-08-11T11:01:00",
                    updatedAt: "2026-08-11T11:01:00",
                }),
            );
        });

        await page.goto("/chat/rooms/501");
        await page
            .getByPlaceholder("메시지를 입력하세요")
            .fill("방금 보낸 메시지");
        await page
            .getByRole("button", { name: "메시지 전송" })
            .click();

        const messageBubbles = page.locator(
            '[data-testid^="chat-message-bubble-"]',
        );
        await expect(messageBubbles).toHaveCount(2);
        await expect(messageBubbles.nth(0)).toHaveAttribute(
            "data-testid",
            "chat-message-bubble-10",
        );
        await expect(messageBubbles.nth(1)).toHaveAttribute(
            "data-testid",
            "chat-message-bubble-11",
        );
    });

    test("전송 실패 시 오류 메시지를 표시한다", async ({ page }) => {
        await mockChatRoomBase(page);
        await page.route(/\/chat\/rooms\/501\/messages$/, (route) => {
            if (route.request().method() === "POST") {
                return fulfillJson(route, { message: "failed" }, 500);
            }
            return route.fallback();
        });

        await page.goto("/chat/rooms/501");
        await page
            .getByPlaceholder("메시지를 입력하세요")
            .fill("fail message");
        await page
            .getByRole("button", { name: "메시지 전송" })
            .click();
        await expect(
            page.getByText("메시지 전송에 실패했습니다."),
        ).toBeVisible();
    });
});
