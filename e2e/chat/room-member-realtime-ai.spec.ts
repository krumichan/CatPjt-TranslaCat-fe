import type { Page, WebSocketRoute } from "@playwright/test";

import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    mockCommonPageDependencies,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import {
    makeOpenChatProfile,
    makeRoom,
    responseDto,
} from "../support/mock-data";
import { mockStompBroker, sendStompJson } from "../support/stomp-mock";

const ROOM_ID = 501;
const NOW = "2026-08-09T12:00:00+09:00";

function aiDisplayMember() {
    return {
        aiMemberId: 11,
        nickname: "Mika",
        profileImageUrl: null,
        role: "MEMBER" as const,
        active: true,
        joinedAt: NOW,
    };
}

async function mockOpenMyProfile(page: Page) {
    await page.route(/.*\/chat\/open-rooms\/501\/me\/profile$/, (route) =>
        fulfillApiJson(
            route,
            responseDto(
                makeOpenChatProfile({
                    openChatMemberId: 91,
                    memberCode: "OC-OWNER",
                    nickname: "OWNER",
                    role: "OWNER",
                }),
            ),
        ),
    );
}

test.describe("Room member realtime + AI display", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockOpenMyProfile(page);
    });

    test("ROOM-MEMBER-RT-01 OPEN 멤버 변경 Event 후 목록과 총 인원을 재조회한다", async ({
        page,
    }) => {
        let socket: WebSocketRoute | null = null;
        let roomTopicSubscribed = false;
        let includeJoinedMember = false;

        await mockStompBroker(page, {
            onSocket: (nextSocket) => {
                socket = nextSocket;
            },
            onSubscribe: (destination) => {
                if (destination === `/topic/chat/rooms/${ROOM_ID}`) {
                    roomTopicSubscribed = true;
                }
            },
        });
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "OPEN",
                sourceType: "OPEN",
                name: "실시간 멤버 방",
                memberCount: 1,
                myRole: "OWNER",
            }),
        });
        await page.route(/.*\/chat\/open-rooms\/501\/members$/, (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    members: [
                        makeOpenChatProfile({
                            openChatMemberId: 91,
                            memberCode: "OC-OWNER",
                            nickname: "OWNER",
                            role: "OWNER",
                        }),
                        ...(includeJoinedMember
                            ? [
                                  makeOpenChatProfile({
                                      openChatMemberId: 92,
                                      memberCode: "OC-MEMBER",
                                      nickname: "새 멤버",
                                      role: "MEMBER",
                                  }),
                              ]
                            : []),
                    ],
                    aiMembers: [aiDisplayMember()],
                    aiDisclosureType: "PUBLIC",
                }),
            ),
        );

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await expect(page.getByText(/WS:\s*CONNECTED/i)).toBeVisible();
        await page.getByTestId("chat-room-menu-button").click();

        await expect(page.getByText("OWNER", { exact: true })).toBeVisible();
        await expect(page.getByText("Mika", { exact: true })).toBeVisible();
        await expect(page.getByTestId("chat-room-ai-member-badge-11")).toBeVisible();
        await expect(page.getByText("2명", { exact: true })).toBeVisible();

        includeJoinedMember = true;
        await expect.poll(() => socket !== null).toBe(true);
        await expect.poll(() => roomTopicSubscribed).toBe(true);
        sendStompJson(socket!, `/topic/chat/rooms/${ROOM_ID}`, {
            eventType: "chat.members.changed",
            roomId: ROOM_ID,
            occurredAt: NOW,
        });

        await expect(page.getByText("새 멤버", { exact: true })).toBeVisible();
        await expect(page.getByText("3명", { exact: true })).toBeVisible();
    });

    test("ROOM-MEMBER-RT-02 PRIVATE 일반 MEMBER는 AI 관리 메뉴와 개별 AI Badge를 보지 않는다", async ({
        page,
    }) => {
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "OPEN",
                sourceType: "OPEN",
                name: "PRIVATE AI 방",
                memberCount: 2,
                myRole: "MEMBER",
            }),
        });
        await page.route(/.*\/chat\/open-rooms\/501\/members$/, (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    members: [
                        makeOpenChatProfile({
                            openChatMemberId: 91,
                            memberCode: "OC-HUMAN-1",
                            nickname: "사람 멤버",
                            role: "MEMBER",
                        }),
                    ],
                    aiMembers: [aiDisplayMember()],
                    aiDisclosureType: "PRIVATE",
                }),
            ),
        );

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();

        await expect(page.getByTestId("chat-ai-settings-button")).toHaveCount(0);
        await expect(page.getByTestId("chat-ai-policy-notice")).toBeVisible();
        await expect(page.getByText("사람 멤버", { exact: true })).toBeVisible();
        await expect(page.getByText("Mika", { exact: true })).toBeVisible();
        await expect(page.getByTestId("chat-room-ai-member-badge-11")).toHaveCount(0);
        await expect(page.getByText("OC-HUMAN-1", { exact: true })).toHaveCount(0);
    });
    test("PRESENCE-OPEN-01 OPEN Snapshot과 최신 Presence Event를 반영하고 오래된 Event는 무시한다", async ({
        page,
    }) => {
        let socket: WebSocketRoute | null = null;
        let roomTopicSubscribed = false;

        await mockStompBroker(page, {
            onSocket: (nextSocket) => {
                socket = nextSocket;
            },
            onSubscribe: (destination) => {
                if (destination === `/topic/chat/rooms/${ROOM_ID}`) {
                    roomTopicSubscribed = true;
                }
            },
        });
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "OPEN",
                sourceType: "OPEN",
                name: "Presence OPEN 방",
                memberCount: 1,
                myRole: "OWNER",
            }),
        });
        await page.route(/.*\/chat\/open-rooms\/501\/members$/, (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    members: [
                        makeOpenChatProfile({
                            openChatMemberId: 91,
                            memberCode: "OC-OWNER",
                            nickname: "OWNER",
                            role: "OWNER",
                            online: true,
                        }),
                    ],
                    aiMembers: [],
                    aiDisclosureType: "PUBLIC",
                }),
            ),
        );

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await expect(page.getByText(/WS:\s*CONNECTED/i)).toBeVisible();
        await page.getByTestId("chat-room-menu-button").click();

        const indicator = page.getByTestId(
            "chat-open-member-presence-91",
        );
        await expect(indicator).toBeVisible();

        await expect.poll(() => socket !== null).toBe(true);
        await expect.poll(() => roomTopicSubscribed).toBe(true);

        sendStompJson(socket!, `/topic/chat/rooms/${ROOM_ID}`, {
            eventType: "chat.presence.changed",
            roomId: ROOM_ID,
            roomType: "OPEN",
            memberRef: "91",
            online: false,
            occurredAt: "2026-08-09T12:00:03+09:00",
        });
        await expect(indicator).toHaveCount(0);

        sendStompJson(socket!, `/topic/chat/rooms/${ROOM_ID}`, {
            eventType: "chat.presence.changed",
            roomId: ROOM_ID,
            roomType: "OPEN",
            memberRef: "91",
            online: true,
            occurredAt: "2026-08-09T12:00:01+09:00",
        });
        await expect(indicator).toHaveCount(0);
    });

    test("PRESENCE-PRIVATE-01 PRIVATE AI Room에서는 Human Presence를 숨긴다", async ({
        page,
    }) => {
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "OPEN",
                sourceType: "OPEN",
                name: "PRIVATE Presence 방",
                memberCount: 2,
                myRole: "MEMBER",
            }),
        });
        await page.route(/.*\/chat\/open-rooms\/501\/members$/, (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    members: [
                        makeOpenChatProfile({
                            openChatMemberId: 91,
                            memberCode: "OC-HUMAN-1",
                            nickname: "사람 멤버",
                            role: "MEMBER",
                            online: true,
                        }),
                    ],
                    aiMembers: [aiDisplayMember()],
                    aiDisclosureType: "PRIVATE",
                }),
            ),
        );

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();

        await expect(page.getByText("사람 멤버", { exact: true })).toBeVisible();
        await expect(
            page.getByTestId("chat-open-member-presence-91"),
        ).toHaveCount(0);
    });

});
