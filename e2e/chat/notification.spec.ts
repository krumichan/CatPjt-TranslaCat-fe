import type { WebSocketRoute } from "@playwright/test";

import type { ChatNotificationActivityListResponse } from "@/types/chatNotification";

import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    fulfillJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
    requestBody,
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

const emptyActivities = {
    items: [],
    nextCursorId: null,
    hasNext: false,
};

test.describe("FE #15 notification center", () => {
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
        await expect(
            dialog.getByTestId("chat-notification-mark-read-100"),
        ).toBeVisible();

        await dialog.getByRole("button", { name: /활동/ }).click();
        await expect(dialog.getByText(/ADMIN/)).toBeVisible();
        await expect(dialog.getByText(/종료된 오픈방/)).toBeVisible();
    });

    test("NOTI-CHAT-02 읽음 처리는 Room 이동 없이 latestMessageId까지 읽고 Item을 제거한다", async ({
        page,
    }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);

        await page.route("**/chat/notifications/summary", (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    ...summary,
                    unreadActivityCount: 0,
                    totalAttentionCount: 4,
                }),
            ),
        );
        await page.route("**/chat/notifications/chats**", (route) =>
            fulfillApiJson(route, responseDto(chats)),
        );
        await page.route("**/chat/notifications/activities**", (route) =>
            fulfillApiJson(route, responseDto(emptyActivities)),
        );

        let readBody: unknown = null;
        await page.route(/.*\/chat\/rooms\/100\/read$/, (route) => {
            readBody = requestBody(route);
            return fulfillApiJson(
                route,
                responseDto({
                    chatRoomId: 100,
                    lastReadMessageId: 1500,
                    lastReadAt: "2026-08-11T14:40:00",
                    unreadCount: 0,
                }),
            );
        });

        await page.goto("/settings");
        await page.getByRole("button", { name: "알림" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByTestId("chat-notification-room-100")).toBeVisible();

        await dialog.getByTestId("chat-notification-mark-read-100").click();

        await expect.poll(() => readBody).toEqual({
            lastReadMessageId: 1500,
        });
        await expect(
            dialog.getByTestId("chat-notification-room-100"),
        ).toHaveCount(0);
        await expect(page).toHaveURL(/\/settings$/);
    });

    test("NOTI-CHAT-03 Chat Item 클릭 시 firstUnreadMessageId를 전달하고 Room으로 이동한다", async ({
        page,
    }) => {
        let requestedAnchorMessageId: string | null = null;
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: 100,
                roomType: "GROUP",
                sourceType: "MANUAL",
                name: "알림 테스트방",
                memberCount: 3,
            }),
        });
        await page.route(
            /.*\/chat\/rooms\/100\/messages\/anchor(?:\?.*)?$/,
            (route) => {
                const url = new URL(route.request().url());
                requestedAnchorMessageId =
                    url.searchParams.get("anchorMessageId");
                return fulfillApiJson(
                    route,
                    responseDto({
                        messages: [
                            makeMessage({
                                id: 1497,
                                roomId: 100,
                                content: "알림 첫 unread",
                            }),
                        ],
                        anchorMessageId: 1497,
                        previousCursorId: null,
                        hasPrevious: false,
                        nextCursorId: null,
                        hasNext: false,
                    }),
                );
            },
        );

        await page.route("**/chat/notifications/summary", (route) =>
            fulfillApiJson(route, responseDto(summary)),
        );
        await page.route("**/chat/notifications/chats**", (route) =>
            fulfillApiJson(route, responseDto(chats)),
        );
        await page.route("**/chat/notifications/activities**", (route) =>
            fulfillApiJson(route, responseDto(emptyActivities)),
        );

        await page.goto("/settings");
        await page.getByRole("button", { name: "알림" }).click();
        const dialog = page.getByRole("dialog");

        await dialog
            .getByRole("button", {
                name: "알림 테스트방 채팅방 열기",
            })
            .click();

        await expect.poll(() => requestedAnchorMessageId).toBe("1497");
        await expect(page).toHaveURL(/\/chat\/rooms\/100$/);
        await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test("NOTI-CHAT-04 message.created/read.updated 수신 시 채팅 Summary와 Room Projection을 즉시 재조회한다", async ({
        page,
    }) => {
        let socket: WebSocketRoute | null = null;
        const subscribedDestinations = new Set<string>();
        let currentSummary = {
            unreadChatMessageCount: 0,
            unreadChatRoomCount: 0,
            unreadActivityCount: 0,
            totalAttentionCount: 0,
        };
        let currentChats = {
            items: [] as typeof chats.items,
            nextCursorMessageId: null,
            hasNext: false,
        };

        await mockCommonPageDependencies(page);
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
                            id: 100,
                            roomType: "GROUP",
                            sourceType: "MANUAL",
                            name: "알림 테스트방",
                            memberCount: 3,
                            unreadCount: 0,
                        }),
                    ],
                }),
            ),
        );
        await page.route("**/chat/notifications/summary", (route) =>
            fulfillApiJson(route, responseDto(currentSummary)),
        );
        await page.route("**/chat/notifications/chats**", (route) =>
            fulfillApiJson(route, responseDto(currentChats)),
        );
        await page.route("**/chat/notifications/activities**", (route) =>
            fulfillApiJson(route, responseDto(emptyActivities)),
        );

        await page.goto("/settings");
        await expect.poll(() => socket !== null).toBe(true);
        await expect
            .poll(() => subscribedDestinations.has("/topic/chat/rooms/100"))
            .toBe(true);
        await expect
            .poll(() => subscribedDestinations.has("/user/queue/chat/read"))
            .toBe(true);

        currentSummary = {
            unreadChatMessageCount: 1,
            unreadChatRoomCount: 1,
            unreadActivityCount: 0,
            totalAttentionCount: 1,
        };
        currentChats = {
            items: [
                {
                    ...chats.items[0],
                    latestMessage: {
                        ...chats.items[0].latestMessage,
                        id: 1501,
                        contentPreview: "실시간 새 메시지",
                    },
                    unreadCount: 1,
                    firstUnreadMessageId: 1501,
                },
            ],
            nextCursorMessageId: null,
            hasNext: false,
        };

        sendStompJson(socket!, "/topic/chat/rooms/100", {
            eventType: "chat.message.created",
            chatRoomId: 100,
            message: {
                id: 1501,
                chatRoomId: 100,
                senderUserId: TEST_USERS.B.userId,
                senderAiMemberId: null,
                senderName: TEST_USERS.B.nickname,
                senderEmail: TEST_USERS.B.email,
                senderProfileImageUrl: null,
                senderType: "USER",
                messageType: "TEXT",
                content: "실시간 새 메시지",
                status: "SENT",
                unreadMemberCount: 1,
                translations: [],
                createdAt: "2026-08-11T15:00:00",
                updatedAt: "2026-08-11T15:00:00",
                sender: null,
            },
        });

        await expect(page.getByRole("button", { name: "알림" })).toContainText("1");
        await page.getByRole("button", { name: "알림" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByText("실시간 새 메시지")).toBeVisible();
        await dialog.getByRole("button", { name: "닫기" }).click();

        currentSummary = {
            unreadChatMessageCount: 0,
            unreadChatRoomCount: 0,
            unreadActivityCount: 0,
            totalAttentionCount: 0,
        };
        currentChats = {
            items: [],
            nextCursorMessageId: null,
            hasNext: false,
        };

        sendStompJson(socket!, "/user/queue/chat/read", {
            eventType: "chat.read.updated",
            chatRoomId: 100,
            userId: TEST_USERS.A.userId,
            lastReadMessageId: 1501,
            lastReadAt: "2026-08-11T15:01:00",
            unreadCount: 0,
            occurredAt: "2026-08-11T15:01:00",
        });

        await expect(page.getByRole("button", { name: "알림" })).not.toContainText("1");
    });

    test("NOTI-ACT-05 chat.notification.created를 즉시 반영하고 중복 Event를 무시한다", async ({
        page,
    }) => {
        let currentSummary = {
            unreadChatMessageCount: 0,
            unreadChatRoomCount: 0,
            unreadActivityCount: 0,
            totalAttentionCount: 0,
        };
        let currentActivities: ChatNotificationActivityListResponse =
            emptyActivities;

        await mockCommonPageDependencies(page);
        const stompBroker = await mockStompBroker(page);

        await page.route("**/chat/rooms", (route) =>
            fulfillJson(
                route,
                responseDto({
                    chatRooms: [
                        makeRoomListItem({
                            id: 100,
                            roomType: "GROUP",
                            sourceType: "MANUAL",
                            name: "실시간 활동방",
                            memberCount: 3,
                            unreadCount: 0,
                        }),
                    ],
                }),
            ),
        );
        await page.route("**/chat/notifications/summary", (route) =>
            fulfillApiJson(route, responseDto(currentSummary)),
        );
        await page.route("**/chat/notifications/chats**", (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    items: [],
                    nextCursorMessageId: null,
                    hasNext: false,
                }),
            ),
        );
        await page.route("**/chat/notifications/activities**", (route) =>
            fulfillApiJson(route, responseDto(currentActivities)),
        );

        await page.goto("/settings");
        await expect
            .poll(() =>
                stompBroker.hasSubscriber("/user/queue/chat/notifications"),
            )
            .toBe(true);

        const realtimeActivity = {
            id: 302,
            notificationType: "OPEN_CHAT_ROLE_CHANGED" as const,
            roomId: 100,
            payload: {
                roomName: "실시간 활동방",
                newRole: "ADMIN",
            },
            isRead: false,
            readAt: null,
            createdAt: "2026-08-11T16:00:00",
        };

        currentSummary = {
            unreadChatMessageCount: 0,
            unreadChatRoomCount: 0,
            unreadActivityCount: 1,
            totalAttentionCount: 1,
        };
        currentActivities = {
            items: [realtimeActivity],
            nextCursorId: null,
            hasNext: false,
        };

        const event = {
            eventType: "chat.notification.created",
            notification: realtimeActivity,
            occurredAt: "2026-08-11T16:00:01",
        };

        stompBroker.sendJsonToSubscribers(
            "/user/queue/chat/notifications",
            event,
        );

        await expect(page.getByRole("button", { name: "알림" })).toContainText(
            "1",
        );
        await page.getByRole("button", { name: "알림" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: /활동/ }).click();
        await expect(
            dialog.getByTestId("chat-activity-notification-302"),
        ).toContainText("실시간 활동방");

        stompBroker.sendJsonToSubscribers(
            "/user/queue/chat/notifications",
            event,
        );
        await expect(
            dialog.getByTestId("chat-activity-notification-302"),
        ).toHaveCount(1);
        await expect(page.getByRole("button", { name: "알림" })).toContainText(
            "1",
        );
    });

    test("NOTI-ACT-06 강퇴/종료 Activity는 이동 없이 읽고 모두 읽음은 Chat unread를 유지한다", async ({
        page,
    }) => {
        let currentSummary = { ...summary };
        let currentActivities = {
            ...activities,
            items: activities.items.map((item) => ({ ...item })),
        };
        let singleReadId: number | null = null;
        let readAllCalls = 0;

        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
        await page.route("**/chat/notifications/summary", (route) =>
            fulfillApiJson(route, responseDto(currentSummary)),
        );
        await page.route("**/chat/notifications/chats**", (route) =>
            fulfillApiJson(route, responseDto(chats)),
        );
        await page.route("**/chat/notifications/activities**", (route) =>
            fulfillApiJson(route, responseDto(currentActivities)),
        );
        await page.route(
            /.*\/chat\/notifications\/activities\/(\d+)\/read$/,
            (route) => {
                const match = route.request().url().match(/activities\/(\d+)\/read$/);
                singleReadId = match ? Number(match[1]) : null;
                const target = currentActivities.items.find(
                    (item) => item.id === singleReadId,
                );
                if (!target) {
                    return route.abort();
                }

                const updated = {
                    ...target,
                    isRead: true,
                    readAt: "2026-08-11T16:10:00",
                };
                currentActivities = {
                    ...currentActivities,
                    items: currentActivities.items.map((item) =>
                        item.id === updated.id ? updated : item,
                    ),
                };
                currentSummary = {
                    ...currentSummary,
                    unreadActivityCount: Math.max(
                        0,
                        currentSummary.unreadActivityCount - 1,
                    ),
                    totalAttentionCount: Math.max(
                        0,
                        currentSummary.totalAttentionCount - 1,
                    ),
                };
                return fulfillApiJson(route, responseDto(updated));
            },
        );
        await page.route(
            "**/chat/notifications/activities/read-all",
            (route) => {
                readAllCalls += 1;
                currentActivities = {
                    ...currentActivities,
                    items: currentActivities.items.map((item) => ({
                        ...item,
                        isRead: true,
                        readAt:
                            item.readAt ?? "2026-08-11T16:11:00",
                    })),
                };
                currentSummary = {
                    ...currentSummary,
                    unreadActivityCount: 0,
                    totalAttentionCount:
                        currentSummary.unreadChatMessageCount,
                };
                return fulfillApiJson(
                    route,
                    responseDto({ updatedCount: 1 }),
                );
            },
        );

        await page.goto("/settings");
        await page.getByRole("button", { name: "알림" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: /활동/ }).click();

        await dialog
            .getByTestId("chat-activity-notification-300")
            .click();
        await expect.poll(() => singleReadId).toBe(300);
        await expect(page).toHaveURL(/\/settings$/);
        await expect(
            page.getByRole("button", { name: "알림", exact: true }),
        ).toContainText("5");

        await dialog.getByTestId("chat-activity-mark-all-read").click();
        await expect.poll(() => readAllCalls).toBe(1);
        await expect(
            page.getByRole("button", { name: "알림", exact: true }),
        ).toContainText("4");
        await expect(
            dialog.getByTestId("chat-activity-mark-all-read"),
        ).toBeDisabled();
    });

    test("NOTI-ACT-07 초대/Role 변경 Activity는 읽음 처리 후 접근 가능한 Room으로 이동한다", async ({
        page,
    }) => {
        const invitationActivity = {
            id: 303,
            notificationType: "CHAT_INVITATION" as const,
            roomId: 100,
            payload: {
                roomName: "초대된 채팅방",
            },
            isRead: false,
            readAt: null,
            createdAt: "2026-08-11T16:20:00",
        };
        let readCalls = 0;

        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: 100,
                roomType: "GROUP",
                sourceType: "MANUAL",
                name: "초대된 채팅방",
                memberCount: 3,
            }),
        });
        await page.route("**/chat/notifications/summary", (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    unreadChatMessageCount: 0,
                    unreadChatRoomCount: 0,
                    unreadActivityCount: 1,
                    totalAttentionCount: 1,
                }),
            ),
        );
        await page.route("**/chat/notifications/chats**", (route) =>
            fulfillApiJson(route, responseDto({ items: [], nextCursorMessageId: null, hasNext: false })),
        );
        await page.route("**/chat/notifications/activities**", (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    items: [invitationActivity],
                    nextCursorId: null,
                    hasNext: false,
                }),
            ),
        );
        await page.route(
            "**/chat/notifications/activities/303/read",
            (route) => {
                readCalls += 1;
                return fulfillApiJson(
                    route,
                    responseDto({
                        ...invitationActivity,
                        isRead: true,
                        readAt: "2026-08-11T16:21:00",
                    }),
                );
            },
        );

        await page.goto("/settings");
        await page.getByRole("button", { name: "알림" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: /활동/ }).click();

        await dialog
            .getByTestId("chat-activity-notification-303")
            .click();

        await expect.poll(() => readCalls).toBe(1);
        await expect(page).toHaveURL(/\/chat\/rooms\/100$/);
        await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test("NOTI-ACT-08 참여 Room이 0개여도 Activity Queue를 구독하고 첫 초대를 즉시 반영한다", async ({
        page,
    }) => {
        let invitationArrived = false;
        let currentSummary = {
            unreadChatMessageCount: 0,
            unreadChatRoomCount: 0,
            unreadActivityCount: 0,
            totalAttentionCount: 0,
        };
        let currentActivities: ChatNotificationActivityListResponse =
            emptyActivities;

        await mockCommonPageDependencies(page);
        const stompBroker = await mockStompBroker(page);

        await page.route("**/chat/rooms", (route) =>
            fulfillJson(
                route,
                responseDto({
                    chatRooms: invitationArrived
                        ? [
                              makeRoomListItem({
                                  id: 700,
                                  roomType: "GROUP",
                                  sourceType: "MANUAL",
                                  name: "첫 초대방",
                                  memberCount: 2,
                                  unreadCount: 0,
                              }),
                          ]
                        : [],
                }),
            ),
        );
        await page.route("**/chat/notifications/summary", (route) =>
            fulfillApiJson(route, responseDto(currentSummary)),
        );
        await page.route("**/chat/notifications/chats**", (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    items: [],
                    nextCursorMessageId: null,
                    hasNext: false,
                }),
            ),
        );
        await page.route("**/chat/notifications/activities**", (route) =>
            fulfillApiJson(route, responseDto(currentActivities)),
        );

        await page.goto("/settings");

        await expect
            .poll(() =>
                stompBroker.hasSubscriber(
                    "/user/queue/chat/notifications",
                ),
            )
            .toBe(true);
        expect(
            stompBroker.getSubscriberCount("/user/queue/chat/read"),
        ).toBe(0);

        const firstInvitation = {
            id: 400,
            notificationType: "CHAT_INVITATION" as const,
            roomId: 700,
            payload: {
                roomName: "첫 초대방",
            },
            isRead: false,
            readAt: null,
            createdAt: "2026-08-11T17:00:00",
        };

        invitationArrived = true;
        currentSummary = {
            unreadChatMessageCount: 0,
            unreadChatRoomCount: 0,
            unreadActivityCount: 1,
            totalAttentionCount: 1,
        };
        currentActivities = {
            items: [firstInvitation],
            nextCursorId: null,
            hasNext: false,
        };

        stompBroker.sendJsonToSubscribers(
            "/user/queue/chat/notifications",
            {
                eventType: "chat.notification.created",
                notification: firstInvitation,
                occurredAt: "2026-08-11T17:00:01",
            },
        );

        const bell = page
            .getByTestId("app-header")
            .getByRole("button", { name: "알림", exact: true });
        await expect(bell).toContainText("1");

        await bell.click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: /활동/ }).click();
        await expect(
            dialog.getByTestId("chat-activity-notification-400"),
        ).toContainText("첫 초대방");

        // Activity 수신 후 Room Directory를 재조회해 새 Room Topic까지 이어서 구독한다.
        await expect
            .poll(() =>
                stompBroker.hasSubscriber("/topic/chat/rooms/700"),
            )
            .toBe(true);
    });

});
