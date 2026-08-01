import type { Page, WebSocketRoute } from "@playwright/test";

import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    fulfillJson,
    mockCommonPageDependencies,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import {
    makeMessage,
    makeRoom,
    makeRoomListItem,
    responseDto,
} from "../support/mock-data";
import { mockStompBroker, sendStompJson } from "../support/stomp-mock";
import { TEST_USERS } from "../support/test-users";

async function setMockPageActivity(
    page: Page,
    active: boolean,
) {
    await page.evaluate((nextActive) => {
        const targetWindow = window as typeof window & {
            __setChatE2EPageActivity?: (value: boolean) => void;
        };
        targetWindow.__setChatE2EPageActivity?.(nextActive);
    }, active);
}

test.describe("FE #12 chat read status", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("READ-01 unreadCount 0/1/99/100을 Badge 정책에 맞게 표시한다", async ({
        page,
    }) => {
        const rooms = [
            makeRoomListItem({
                id: 501,
                roomType: "DIRECT",
                sourceType: "FRIEND",
                name: null,
                memberCount: 2,
                unreadCount: 1,
            }),
            makeRoomListItem({
                id: 502,
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "Unread 0",
                memberCount: 3,
                unreadCount: 0,
            }),
            makeRoomListItem({
                id: 503,
                roomType: "GROUP",
                sourceType: "MANUAL",
                name: "Unread 99",
                memberCount: 4,
                unreadCount: 99,
            }),
            makeRoomListItem({
                id: 504,
                roomType: "GROUP",
                sourceType: "MANUAL",
                name: "Unread 100",
                memberCount: 4,
                unreadCount: 100,
            }),
        ];

        await page.route("**/chat/rooms", (route) =>
            fulfillJson(route, responseDto({ chatRooms: rooms })),
        );

        await page.goto("/chat");

        await expect(
            page.getByTestId("chat-room-unread-badge-501"),
        ).toHaveText("1");
        await expect(
            page.getByTestId("chat-room-unread-badge-502"),
        ).toHaveCount(0);
        await expect(
            page.getByTestId("chat-room-unread-badge-503"),
        ).toHaveText("99");
        await expect(
            page.getByTestId("chat-room-unread-badge-504"),
        ).toHaveText("99+");
        await expect(
            page.getByTestId("chat-room-unread-badge-504"),
        ).toHaveAttribute("aria-label", "읽지 않은 메시지 100개");
    });

    test("READ-02 일본어 접근성 Label을 표시한다", async ({ page }) => {
        await page.route("**/chat/rooms", (route) =>
            fulfillJson(
                route,
                responseDto({
                    chatRooms: [
                        makeRoomListItem({
                            id: 501,
                            roomType: "GROUP",
                            sourceType: "FRIEND",
                            name: "未読ルーム",
                            memberCount: 3,
                            unreadCount: 3,
                        }),
                    ],
                }),
            ),
        );

        await page.goto("/ja/chat");

        await expect(
            page.getByTestId("chat-room-unread-badge-501"),
        ).toHaveAttribute("aria-label", "未読メッセージ3件");
    });

    test("READ-03 최초 메시지 조회 성공 후 최신 메시지 ID로 읽음 처리한다", async ({
        page,
    }) => {
        await page.addInitScript(() => {
            Object.defineProperty(document, "visibilityState", {
                configurable: true,
                get: () => "visible",
            });
            Object.defineProperty(document, "hasFocus", {
                configurable: true,
                value: () => true,
            });
        });

        await mockStompBroker(page);
        await mockChatRoomBase(page, {
            messages: [
                makeMessage({ id: 10, content: "첫 메시지" }),
                makeMessage({ id: 12, content: "최신 메시지" }),
            ],
        });

        const requestedMessageIds: number[] = [];

        await page.route(/.*\/chat\/rooms\/501\/read$/, async (route) => {
            const body = route.request().postDataJSON() as {
                lastReadMessageId: number;
            };
            requestedMessageIds.push(body.lastReadMessageId);
            await fulfillApiJson(
                route,
                responseDto({
                    chatRoomId: 501,
                    lastReadMessageId: body.lastReadMessageId,
                    lastReadAt: new Date().toISOString(),
                    unreadCount: 0,
                }),
            );
        });

        await page.goto("/chat/rooms/501");

        await expect.poll(() => requestedMessageIds).toContain(12);
    });

    test("READ-04 채팅방 진입 후 서버 기준으로 목록 Badge가 제거된다", async ({
        page,
    }) => {
        await page.addInitScript(() => {
            Object.defineProperty(document, "visibilityState", {
                configurable: true,
                get: () => "visible",
            });
            Object.defineProperty(document, "hasFocus", {
                configurable: true,
                value: () => true,
            });
        });
        await mockStompBroker(page);

        let serverUnreadCount = 3;
        await page.route("**/chat/rooms", (route) =>
            fulfillJson(
                route,
                responseDto({
                    chatRooms: [
                        makeRoomListItem({
                            id: 501,
                            roomType: "DIRECT",
                            sourceType: "FRIEND",
                            name: null,
                            memberCount: 2,
                            unreadCount: serverUnreadCount,
                        }),
                    ],
                }),
            ),
        );
        await mockChatRoomBase(page, {
            messages: [makeMessage({ id: 12, content: "읽음 대상" })],
        });
        await page.route(/.*\/chat\/rooms\/501\/read$/, async (route) => {
            const body = route.request().postDataJSON() as {
                lastReadMessageId: number;
            };
            serverUnreadCount = 0;
            await fulfillApiJson(
                route,
                responseDto({
                    chatRoomId: 501,
                    lastReadMessageId: body.lastReadMessageId,
                    lastReadAt: new Date().toISOString(),
                    unreadCount: serverUnreadCount,
                }),
            );
        });

        await page.goto("/chat");
        await expect(
            page.getByTestId("chat-room-unread-badge-501"),
        ).toHaveText("3");

        await page.getByRole("link", { name: /친구와의 1:1 채팅/ }).click();
        await expect(page.getByText("읽음 대상")).toBeVisible();
        await expect.poll(() => serverUnreadCount).toBe(0);

        await page.goto("/chat");
        await expect(
            page.getByTestId("chat-room-unread-badge-501"),
        ).toHaveCount(0);
    });

    test("READ-05 메시지 조회 실패 시 읽음 API를 호출하지 않는다", async ({
        page,
    }) => {
        await mockStompBroker(page);
        await mockChatRoomBase(page);

        let readRequestCount = 0;

        await page.route(/.*\/chat\/rooms\/501\/read$/, async (route) => {
            readRequestCount += 1;
            await fulfillApiJson(route, { message: "unexpected" }, 500);
        });
        await page.route(
            /.*\/chat\/rooms\/501\/messages(?:\?.*)?$/,
            async (route) => {
                await fulfillApiJson(route, { message: "failed" }, 500);
            },
        );

        await page.goto("/chat/rooms/501");

        await expect(page.getByText("채팅방을 표시할 수 없습니다")).toBeVisible();
        expect(readRequestCount).toBe(0);
    });

    test("READ-06 메시지가 없는 방에서는 읽음 API를 호출하지 않는다", async ({
        page,
    }) => {
        await mockStompBroker(page);
        await mockChatRoomBase(page, { messages: [] });

        let readRequestCount = 0;
        await page.route(/.*\/chat\/rooms\/501\/read$/, async (route) => {
            readRequestCount += 1;
            await fulfillApiJson(route, { message: "unexpected" }, 500);
        });

        await page.goto("/chat/rooms/501");

        await expect(
            page.getByPlaceholder("메시지를 입력하세요"),
        ).toBeEnabled();
        await page.waitForTimeout(250);
        expect(readRequestCount).toBe(0);
    });

    test("READ-07 다른 방의 타 사용자·AI 메시지만 증가하고 본인·SYSTEM은 제외하며 read.updated 서버 값으로 교체한다", async ({
        page,
    }) => {
        let socket: WebSocketRoute | null = null;
        const subscribedDestinations = new Set<string>();

        await mockStompBroker(page, {
            onSocket: (nextSocket) => {
                socket = nextSocket;
            },
            onSubscribe: (destination) => {
                subscribedDestinations.add(destination);
            },
        });

        await page.route("**/chat/rooms", (route) =>
            fulfillJson(
                route,
                responseDto({
                    chatRooms: [
                        makeRoomListItem({
                            id: 501,
                            roomType: "DIRECT",
                            sourceType: "FRIEND",
                            name: null,
                            memberCount: 2,
                            unreadCount: 0,
                        }),
                        makeRoomListItem({
                            id: 502,
                            roomType: "GROUP",
                            sourceType: "FRIEND",
                            name: "실시간 그룹",
                            memberCount: 3,
                            unreadCount: 2,
                        }),
                    ],
                }),
            ),
        );

        await page.goto("/chat");
        await expect(page.getByText("실시간 그룹")).toBeVisible();
        await expect.poll(() => socket !== null).toBe(true);
        await expect
            .poll(() =>
                subscribedDestinations.has(
                    "/topic/chat/rooms/502",
                ),
            )
            .toBe(true);

        sendStompJson(socket!, "/topic/chat/rooms/502", {
            eventType: "chat.message.created",
            chatRoomId: 502,
            message: makeMessage({
                id: 201,
                roomId: 502,
                sender: TEST_USERS.B,
                content: "상대 메시지",
            }),
        });
        await expect(
            page.getByTestId("chat-room-unread-badge-502"),
        ).toHaveText("3");

        sendStompJson(socket!, "/topic/chat/rooms/502", {
            eventType: "chat.message.created",
            chatRoomId: 502,
            message: makeMessage({
                id: 202,
                roomId: 502,
                content: "AI 메시지",
                senderType: "AI",
            }),
        });
        await expect(
            page.getByTestId("chat-room-unread-badge-502"),
        ).toHaveText("4");

        sendStompJson(socket!, "/topic/chat/rooms/502", {
            eventType: "chat.message.created",
            chatRoomId: 502,
            message: makeMessage({
                id: 203,
                roomId: 502,
                sender: TEST_USERS.A,
                content: "본인 메시지",
            }),
        });
        sendStompJson(socket!, "/topic/chat/rooms/502", {
            eventType: "chat.message.created",
            chatRoomId: 502,
            message: makeMessage({
                id: 204,
                roomId: 502,
                content: "멤버가 초대되었습니다.",
                senderType: "SYSTEM",
                messageType: "SYSTEM",
            }),
        });

        await expect(
            page.getByTestId("chat-room-unread-badge-502"),
        ).toHaveText("4");

        sendStompJson(socket!, "/user/queue/chat/read", {
            eventType: "chat.read.updated",
            chatRoomId: 502,
            userId: TEST_USERS.A.userId,
            lastReadMessageId: 204,
            lastReadAt: new Date().toISOString(),
            unreadCount: 1,
            occurredAt: new Date().toISOString(),
        });

        await expect(
            page.getByTestId("chat-room-unread-badge-502"),
        ).toHaveText("1");
    });

    test("READ-08 백그라운드에서는 유지하고 활성화 후 연속 메시지를 최신 ID 한 건으로 병합한다", async ({
        page,
    }) => {
        await page.addInitScript(() => {
            let active = false;
            const targetWindow = window as typeof window & {
                __setChatE2EPageActivity?: (value: boolean) => void;
            };

            Object.defineProperty(document, "visibilityState", {
                configurable: true,
                get: () => (active ? "visible" : "hidden"),
            });
            Object.defineProperty(document, "hasFocus", {
                configurable: true,
                value: () => active,
            });
            targetWindow.__setChatE2EPageActivity = (value: boolean) => {
                active = value;
                document.dispatchEvent(new Event("visibilitychange"));
                window.dispatchEvent(new Event(value ? "focus" : "blur"));
            };
        });

        let socket: WebSocketRoute | null = null;
        await mockStompBroker(page, {
            onSocket: (nextSocket) => {
                socket = nextSocket;
            },
        });
        await mockChatRoomBase(page, {
            messages: [makeMessage({ id: 10, content: "기존 메시지" })],
        });

        const requestedMessageIds: number[] = [];
        await page.route(/.*\/chat\/rooms\/501\/read$/, async (route) => {
            const body = route.request().postDataJSON() as {
                lastReadMessageId: number;
            };
            requestedMessageIds.push(body.lastReadMessageId);
            await new Promise((resolve) => setTimeout(resolve, 80));
            await fulfillApiJson(
                route,
                responseDto({
                    chatRoomId: 501,
                    lastReadMessageId: body.lastReadMessageId,
                    lastReadAt: new Date().toISOString(),
                    unreadCount: 0,
                }),
            );
        });

        await page.goto("/chat/rooms/501");
        await expect.poll(() => socket !== null).toBe(true);
        await page.waitForTimeout(250);
        expect(requestedMessageIds).toEqual([]);

        for (const messageId of [11, 12, 13]) {
            sendStompJson(socket!, "/topic/chat/rooms/501", {
                eventType: "chat.message.created",
                chatRoomId: 501,
                message: makeMessage({
                    id: messageId,
                    content: `연속 메시지 ${messageId}`,
                }),
            });
        }

        await expect(page.getByText("연속 메시지 13")).toBeVisible();
        await page.waitForTimeout(250);
        expect(requestedMessageIds).toEqual([]);

        await setMockPageActivity(page, true);

        await expect.poll(() => requestedMessageIds).toEqual([13]);
    });

    test("READ-09 읽음 API 실패가 메시지 화면 이용을 차단하지 않는다", async ({
        page,
    }) => {
        await page.addInitScript(() => {
            Object.defineProperty(document, "visibilityState", {
                configurable: true,
                get: () => "visible",
            });
            Object.defineProperty(document, "hasFocus", {
                configurable: true,
                value: () => true,
            });
        });

        await mockStompBroker(page);
        await mockChatRoomBase(page, {
            messages: [makeMessage({ id: 10, content: "읽음 실패 메시지" })],
        });
        await page.route(/.*\/chat\/rooms\/501\/read$/, async (route) => {
            await fulfillApiJson(route, { message: "failed" }, 500);
        });

        await page.goto("/chat/rooms/501");

        await expect(page.getByText("읽음 실패 메시지")).toBeVisible();
        await expect(
            page.getByPlaceholder("메시지를 입력하세요"),
        ).toBeEnabled();
    });


    test("READ-10 DIRECT 메시지 숫자 1을 표시하고 읽으면 숨긴다", async ({
        page,
    }) => {
        let socket: WebSocketRoute | null = null;
        await mockStompBroker(page, {
            onSocket: (nextSocket) => {
                socket = nextSocket;
            },
        });
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: 501,
                roomType: "DIRECT",
                sourceType: "FRIEND",
                memberCount: 2,
            }),
            messages: [
                makeMessage({
                    id: 301,
                    sender: TEST_USERS.A,
                    content: "상대가 아직 읽지 않은 메시지",
                    unreadMemberCount: 1,
                }),
                makeMessage({
                    id: 302,
                    content: "멤버가 초대되었습니다.",
                    senderType: "SYSTEM",
                    messageType: "SYSTEM",
                    unreadMemberCount: null,
                }),
                makeMessage({
                    id: 303,
                    sender: TEST_USERS.A,
                    content: "상대가 읽은 메시지",
                    unreadMemberCount: 0,
                }),
            ],
        });

        await page.goto("/chat/rooms/501");

        await expect(
            page.getByTestId("chat-message-unread-count-301"),
        ).toHaveText("1");
        await expect(
            page.getByTestId("chat-message-unread-count-302"),
        ).toHaveCount(0);
        await expect(
            page.getByTestId("chat-message-unread-count-303"),
        ).toHaveCount(0);
        await expect(
            page.getByTestId("chat-message-unread-count-301"),
        ).toHaveAttribute(
            "aria-label",
            "아직 읽지 않은 멤버 1명",
        );
        await expect.poll(() => socket !== null).toBe(true);

        sendStompJson(socket!, "/topic/chat/rooms/501", {
            eventType: "chat.member.read.updated",
            chatRoomId: 501,
            readerUserId: TEST_USERS.B.userId,
            previousLastReadMessageId: null,
            lastReadMessageId: 301,
            readAt: new Date().toISOString(),
            occurredAt: new Date().toISOString(),
        });

        await expect(
            page.getByTestId("chat-message-unread-count-301"),
        ).toHaveCount(0);
    });

    test("READ-11 chat.member.read.updated로 숫자를 감소시키고 발신자·중복·역순 Event를 방어한다", async ({
        page,
    }) => {
        let socket: WebSocketRoute | null = null;
        await mockStompBroker(page, {
            onSocket: (nextSocket) => {
                socket = nextSocket;
            },
        });
        await mockChatRoomBase(page, {
            messages: [
                makeMessage({
                    id: 310,
                    sender: TEST_USERS.A,
                    content: "A 메시지 1",
                    unreadMemberCount: 2,
                }),
                makeMessage({
                    id: 311,
                    sender: TEST_USERS.B,
                    content: "B 메시지",
                    unreadMemberCount: 2,
                }),
                makeMessage({
                    id: 312,
                    sender: TEST_USERS.A,
                    content: "A 메시지 2",
                    unreadMemberCount: 2,
                }),
            ],
        });

        await page.goto("/chat/rooms/501");
        await expect.poll(() => socket !== null).toBe(true);
        await expect(
            page.getByText("WS: CONNECTED", { exact: true }),
        ).toBeVisible();

        const sendMemberReadUpdated = (
            readerUserId: number,
            previousLastReadMessageId: number | null,
            lastReadMessageId: number,
        ) => {
            sendStompJson(socket!, "/topic/chat/rooms/501", {
                eventType: "chat.member.read.updated",
                chatRoomId: 501,
                readerUserId,
                previousLastReadMessageId,
                lastReadMessageId,
                readAt: new Date().toISOString(),
                occurredAt: new Date().toISOString(),
            });
        };

        sendMemberReadUpdated(TEST_USERS.B.userId, null, 310);
        await expect(
            page.getByTestId("chat-message-unread-count-310"),
        ).toHaveText("1");
        await expect(
            page.getByTestId("chat-message-unread-count-311"),
        ).toHaveText("2");

        sendMemberReadUpdated(TEST_USERS.B.userId, 310, 312);
        await expect(
            page.getByTestId("chat-message-unread-count-312"),
        ).toHaveText("1");
        await expect(
            page.getByTestId("chat-message-unread-count-311"),
        ).toHaveText("2");

        // 동일 Event와 역순 Event는 무시한다.
        sendMemberReadUpdated(TEST_USERS.B.userId, 310, 312);
        sendMemberReadUpdated(TEST_USERS.B.userId, null, 311);
        await expect(
            page.getByTestId("chat-message-unread-count-312"),
        ).toHaveText("1");

        sendMemberReadUpdated(TEST_USERS.C.userId, null, 312);
        await expect(
            page.getByTestId("chat-message-unread-count-310"),
        ).toHaveCount(0);
        await expect(
            page.getByTestId("chat-message-unread-count-311"),
        ).toHaveText("1");
        await expect(
            page.getByTestId("chat-message-unread-count-312"),
        ).toHaveCount(0);
    });

    test("READ-12 message.created Payload의 초기 미확인 인원을 즉시 표시한다", async ({
        page,
    }) => {
        let socket: WebSocketRoute | null = null;
        await mockStompBroker(page, {
            onSocket: (nextSocket) => {
                socket = nextSocket;
            },
        });
        await mockChatRoomBase(page, { messages: [] });

        await page.goto("/chat/rooms/501");
        await expect.poll(() => socket !== null).toBe(true);
        await expect(
            page.getByText("WS: CONNECTED", { exact: true }),
        ).toBeVisible();

        sendStompJson(socket!, "/topic/chat/rooms/501", {
            eventType: "chat.message.created",
            chatRoomId: 501,
            message: makeMessage({
                id: 320,
                sender: TEST_USERS.A,
                content: "실시간 읽음 숫자",
                unreadMemberCount: 2,
            }),
        });

        await expect(page.getByText("실시간 읽음 숫자")).toBeVisible();
        await expect(
            page.getByTestId("chat-message-unread-count-320"),
        ).toHaveText("2");
    });

    test("READ-13 일본어 메시지별 미확인 인원 접근성 Label을 표시한다", async ({
        page,
    }) => {
        await mockStompBroker(page);
        await mockChatRoomBase(page, {
            messages: [
                makeMessage({
                    id: 330,
                    sender: TEST_USERS.A,
                    content: "未読人数",
                    unreadMemberCount: 2,
                }),
            ],
        });

        await page.goto("/ja/chat/rooms/501");

        await expect(
            page.getByTestId("chat-message-unread-count-330"),
        ).toHaveAttribute(
            "aria-label",
            "まだ読んでいないメンバー2人",
        );
    });

});
