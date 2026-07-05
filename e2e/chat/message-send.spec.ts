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
