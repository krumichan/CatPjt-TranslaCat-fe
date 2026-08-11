import type { Page, WebSocketRoute } from "@playwright/test";

import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    mockCommonPageDependencies,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import { makeRoom, responseDto } from "../support/mock-data";
import { mockStompBroker, sendStompJson } from "../support/stomp-mock";

const ROOM_ID = 501;
const NOW = "2026-08-10T12:00:00+09:00";

async function setupSocket(page: Page) {
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

    return {
        getSocket: () => socket,
        isRoomTopicSubscribed: () => roomTopicSubscribed,
    };
}

test.describe("Chat Presence", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("PRESENCE-DIRECT-01 DIRECT Snapshot과 Event로 상대 ONLINE Indicator를 갱신한다", async ({
        page,
    }) => {
        const ws = await setupSocket(page);
        const room = {
            ...makeRoom({
                id: ROOM_ID,
                roomType: "DIRECT",
                sourceType: "FRIEND",
            }),
            directPartner: {
                userId: 22,
                publicId: "TC-PARTNER",
                displayName: "상대 사용자",
                profileImageUrl: null,
                profileBackgroundImageUrl: null,
                bio: null,
                online: true,
            },
        };

        await mockChatRoomBase(page, { room });

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await expect(page.getByText(/WS:\s*CONNECTED/i)).toBeVisible();

        const indicator = page.getByTestId(
            "chat-direct-partner-presence",
        );
        await expect(indicator).toBeVisible();
        await expect(indicator).toHaveAttribute("data-presence-state", "online");

        await expect.poll(() => ws.getSocket() !== null).toBe(true);
        await expect.poll(ws.isRoomTopicSubscribed).toBe(true);

        sendStompJson(ws.getSocket()!, `/topic/chat/rooms/${ROOM_ID}`, {
            eventType: "chat.presence.changed",
            roomId: ROOM_ID,
            roomType: "DIRECT",
            memberRef: "TC-PARTNER",
            online: false,
            occurredAt: NOW,
        });

        await expect(indicator).toBeVisible();
        await expect(indicator).toHaveAttribute("data-presence-state", "offline");
    });

    test("PRESENCE-UNKNOWN-01 DIRECT Snapshot이 null이면 UNKNOWN Indicator를 표시한다", async ({
        page,
    }) => {
        const room = {
            ...makeRoom({
                id: ROOM_ID,
                roomType: "DIRECT",
                sourceType: "FRIEND",
            }),
            directPartner: {
                userId: 22,
                publicId: "TC-PARTNER",
                displayName: "상대 사용자",
                profileImageUrl: null,
                profileBackgroundImageUrl: null,
                bio: null,
                online: null,
            },
        };

        await setupSocket(page);
        await mockChatRoomBase(page, { room });

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await expect(page.getByText(/WS:\s*CONNECTED/i)).toBeVisible();

        const indicator = page.getByTestId("chat-direct-partner-presence");
        await expect(indicator).toBeVisible();
        await expect(indicator).toHaveAttribute("data-presence-state", "unknown");
        await expect(indicator).toHaveText("?");
    });

    test("PRESENCE-GROUP-01 GROUP Member Snapshot과 Event를 memberRef로 갱신한다", async ({
        page,
    }) => {
        const ws = await setupSocket(page);

        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "GROUP",
                sourceType: "MANUAL",
                name: "Presence GROUP",
                memberCount: 2,
                myRole: "MEMBER",
            }),
        });
        await page.route(/.*\/chat\/rooms\/501\/members$/, (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    members: [
                        {
                            id: 77,
                            chatRoomId: ROOM_ID,
                            userId: 22,
                            publicId: "TC-GROUP",
                            displayName: "그룹 멤버",
                            profileImageUrl: null,
                            role: "MEMBER",
                            active: true,
                            joinedAt: NOW,
                            leftAt: null,
                            online: true,
                        },
                    ],
                    aiMembers: [],
                    aiDisclosureType: null,
                }),
            ),
        );

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await expect(page.getByText(/WS:\s*CONNECTED/i)).toBeVisible();
        await page.getByTestId("chat-room-menu-button").click();

        const indicator = page.getByTestId(
            "chat-group-member-presence-77",
        );
        await expect(indicator).toBeVisible();
        await expect(indicator).toHaveAttribute("data-presence-state", "online");

        await expect.poll(() => ws.getSocket() !== null).toBe(true);
        await expect.poll(ws.isRoomTopicSubscribed).toBe(true);

        sendStompJson(ws.getSocket()!, `/topic/chat/rooms/${ROOM_ID}`, {
            eventType: "chat.presence.changed",
            roomId: ROOM_ID,
            roomType: "GROUP",
            memberRef: "77",
            online: false,
            occurredAt: NOW,
        });

        await expect(indicator).toBeVisible();
        await expect(indicator).toHaveAttribute("data-presence-state", "offline");
    });
});
