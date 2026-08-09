import type { Page, WebSocketRoute } from "@playwright/test";

import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import {
    makeMessage,
    makeOpenChatProfile,
    makeRoom,
    makeTranslation,
    responseDto,
} from "../support/mock-data";
import { mockStompBroker, sendStompJson } from "../support/stomp-mock";

const ROOM_ID = 501;
const AI_MEMBER_ID = 11;
const NOW = "2026-08-09T12:00:00+09:00";
const ONE_PIXEL_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
);

async function mockAiImageAssets(page: Page) {
    await page.route(
        /https:\/\/cdn\.example\.com\/mika-(?:profile|background)\.png$/,
        (route) =>
            route.fulfill({
                status: 200,
                contentType: "image/png",
                body: ONE_PIXEL_PNG,
            }),
    );
}

function makeAiMember() {
    return {
        aiMemberId: AI_MEMBER_ID,
        aiAgentId: 1011,
        chatRoomId: ROOM_ID,
        nickname: "Mika",
        profileImageUrl: "https://cdn.example.com/mika-profile.png",
        profileBackgroundImageUrl: "https://cdn.example.com/mika-background.png",
        bio: "京都のカフェと旅行の話が好きです。",
        originalLanguageCode: "ja",
        personaPrompt: "Friendly persona",
        active: true,
        joinedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
    };
}

function makeAiMessage({
    id,
    content = "今日は京都の話でもしてみる？",
    translations = [],
    unreadMemberCount = 0,
}: {
    id: number;
    content?: string;
    translations?: ReturnType<typeof makeTranslation>[];
    unreadMemberCount?: number;
}) {
    return makeMessage({
        id,
        roomId: ROOM_ID,
        content,
        senderType: "AI",
        senderAiMemberId: AI_MEMBER_ID,
        senderName: "Mika",
        senderProfileImageUrl: "https://cdn.example.com/mika-profile.png",
        translations,
        unreadMemberCount,
    });
}

async function mockAiDisplayApi(
    page: Page,
    disclosureType: "PUBLIC" | "PRIVATE",
) {
    const aiMember = makeAiMember();

    await page.route(/.*\/chat\/rooms\/501\/ai-settings$/, (route) =>
        fulfillApiJson(
            route,
            responseDto({
                chatRoomId: ROOM_ID,
                aiEnabled: true,
                currentAiMemberCount: 1,
                maxAiMembersPerRoom: 2,
                disclosureType,
                mentionPermission: "ALL_MEMBERS",
                conversationEnabled: true,
                revivalEnabled: true,
            }),
        ),
    );

    await page.route(/.*\/chat\/rooms\/501\/ai-members\/11\/profile$/, (route) =>
        fulfillApiJson(route, responseDto(aiMember)),
    );
}

async function mockOpenMyProfile(page: Page) {
    const myProfile = makeOpenChatProfile({
        openChatMemberId: 91,
        memberCode: "OPEN-ME-91",
        nickname: "내 OPEN 프로필",
        role: "MEMBER",
    });

    await page.route(/.*\/chat\/open-rooms\/501\/me\/profile$/, (route) =>
        fulfillApiJson(route, responseDto(myProfile)),
    );
}

test.describe("FE #11 AI message UI", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockAiImageAssets(page);
    });

    test("AI-11-01 GROUP PUBLIC은 AI Badge·프로필·번역·미확인 인원을 표시한다", async ({
        page,
    }) => {
        await mockIdleWebSocket(page);
        await mockAiDisplayApi(page, "PUBLIC");
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "AI 공개 그룹",
                memberCount: 3,
                myRole: "MEMBER",
            }),
            messages: [
                makeAiMessage({
                    id: 1101,
                    translations: [
                        makeTranslation({
                            id: 7111,
                            languageCode: "ko",
                            translatedContent: "오늘은 교토 이야기를 해볼까?",
                        }),
                    ],
                    unreadMemberCount: 2,
                }),
            ],
        });

        await page.goto(`/chat/rooms/${ROOM_ID}`);

        await expect(page.getByTestId("chat-ai-message-1101")).toBeVisible();
        await expect(page.getByTestId("chat-ai-badge-1101")).toHaveText("AI");
        await expect(page.getByText("Mika", { exact: true })).toBeVisible();
        await expect(page.getByText("오늘은 교토 이야기를 해볼까?")).toBeVisible();
        await expect(page.getByTestId("chat-message-unread-count-1101")).toHaveText(
            "2",
        );
        await expect(
            page.locator('img[src*="mika-profile.png"]'),
        ).toBeVisible();

        await page.getByTestId("chat-message-avatar-1101").click();
        await expect(page.getByTestId("chat-ai-profile-modal")).toBeVisible();
        await expect(page.getByTestId("chat-ai-profile-badge")).toHaveText("AI");
        await expect(page.getByText("京都のカフェと旅行の話が好きです。")).toBeVisible();
        await expect(page.getByTestId("chat-ai-profile-language")).toContainText("ja");
        await expect(
            page.locator('img[src*="mika-background.png"]'),
        ).toBeVisible();
    });

    test("AI-11-02 GROUP PRIVATE은 개별 AI Badge 없이 일반 멤버와 같은 Bubble을 사용한다", async ({
        page,
    }) => {
        await mockIdleWebSocket(page);
        await mockAiDisplayApi(page, "PRIVATE");
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "AI 비공개 그룹",
                memberCount: 3,
                myRole: "MEMBER",
            }),
            messages: [
                makeMessage({
                    id: 1201,
                    content: "사람 메시지",
                }),
                makeAiMessage({
                    id: 1202,
                    content: "자연스럽게 참여한 메시지",
                }),
            ],
        });

        await page.goto(`/chat/rooms/${ROOM_ID}`);

        await expect(page.getByText("자연스럽게 참여한 메시지")).toBeVisible();
        await expect(page.getByTestId("chat-ai-badge-1202")).toHaveCount(0);

        const userBubbleClass = await page
            .getByTestId("chat-message-bubble-1201")
            .getAttribute("class");
        const aiBubbleClass = await page
            .getByTestId("chat-message-bubble-1202")
            .getAttribute("class");
        expect(aiBubbleClass).toBe(userBubbleClass);

        await page.getByTestId("chat-message-avatar-1202").click();
        await expect(page.getByTestId("chat-ai-profile-modal")).toBeVisible();
        await expect(page.getByTestId("chat-ai-profile-badge")).toHaveCount(0);
        await expect(page.getByTestId("chat-ai-profile-language")).toHaveCount(0);
        await expect(page.getByText("京都のカフェと旅行の話が好きです。")).toBeVisible();
    });

    test("AI-11-03 WebSocket AI 메시지를 수신하고 동일 ID Event는 중복 append하지 않는다", async ({
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
        await mockAiDisplayApi(page, "PUBLIC");
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "실시간 AI 그룹",
                memberCount: 3,
                myRole: "MEMBER",
            }),
        });

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await expect(page.getByText(/WS:\s*CONNECTED/i)).toBeVisible();
        await expect.poll(() => socket !== null).toBe(true);
        await expect.poll(() => roomTopicSubscribed).toBe(true);

        const payload = makeAiMessage({
            id: 1301,
            content: "실시간 AI 메시지",
        });

        sendStompJson(socket!, `/topic/chat/rooms/${ROOM_ID}`, {
            eventType: "chat.message.created",
            payload,
        });
        sendStompJson(socket!, `/topic/chat/rooms/${ROOM_ID}`, {
            eventType: "chat.message.created",
            payload,
        });

        await expect(page.getByText("실시간 AI 메시지")).toHaveCount(1);
        await expect(page.getByTestId("chat-ai-badge-1301")).toBeVisible();
    });

    test("AI-11-04 OPEN AI 메시지는 OPEN sender snapshot 없이 AI 이름·이미지를 사용한다", async ({
        page,
    }) => {
        await mockIdleWebSocket(page);
        await mockAiDisplayApi(page, "PRIVATE");
        await mockOpenMyProfile(page);
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "OPEN",
                sourceType: "OPEN",
                name: "OPEN AI 방",
                memberCount: 8,
                myRole: "MEMBER",
            }),
            messages: [
                makeAiMessage({
                    id: 1401,
                    content: "OPEN에서도 AI sender를 표시해요",
                }),
            ],
        });

        await page.goto(`/chat/rooms/${ROOM_ID}`);

        await expect(page.getByText("Mika", { exact: true })).toBeVisible();
        await expect(page.getByText("알 수 없는 사용자")).toHaveCount(0);
        await expect(page.getByTestId("chat-ai-badge-1401")).toHaveCount(0);
        await expect(
            page.locator('img[src*="mika-profile.png"]'),
        ).toBeVisible();
    });

    test("AI-11-05 Mobile dark mode에서도 AI 메시지와 Profile Modal이 viewport 안에 표시된다", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.emulateMedia({ colorScheme: "dark" });
        await mockIdleWebSocket(page);
        await mockAiDisplayApi(page, "PUBLIC");
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "모바일 AI 방",
                memberCount: 3,
                myRole: "MEMBER",
            }),
            messages: [
                makeAiMessage({ id: 1501, content: "모바일 AI 메시지" }),
            ],
        });

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await expect(page.getByTestId("chat-ai-message-1501")).toBeVisible();
        await page.getByTestId("chat-message-avatar-1501").click();

        const modal = page.getByTestId("chat-ai-profile-modal");
        await expect(modal).toBeVisible();
        const box = await modal.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(390);
        expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    });
});
