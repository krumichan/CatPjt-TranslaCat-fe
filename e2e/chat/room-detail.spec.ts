import { expect, test } from "../fixtures/mock-test";

import {
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import { makeMessage } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const PROFILE_IMAGE_DATA_URL =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">' +
            '<rect width="40" height="40" fill="#f97316"/>' +
        "</svg>",
    );

test.describe("Chat room detail", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("CHAT-01 방 상세와 초기 메시지를 표시한다", async ({ page }) => {
        await mockChatRoomBase(page, {
            room: undefined,
            messages: [
                makeMessage({
                    id: 1,
                    content: "초기 메시지",
                    translations: [
                        {
                            id: 7001,
                            languageCode: "ja",
                            translatedContent: "こんにちは",
                            status: "COMPLETED",
                            failureReason: null,
                            completedAt:
                                "2026-07-05T12:05:00.000Z",
                        },
                    ],
                }),
            ],
        });

        await page.goto("/chat/rooms/501");

        await expect(
            page.getByText("친구와의 1:1 채팅"),
        ).toBeVisible();
        await expect(page.getByText("초기 메시지")).toBeVisible();
        await expect(page.getByText("こんにちは")).toBeVisible();
    });

    test("CHAT-02 메시지가 없으면 Empty 상태를 표시한다", async ({ page }) => {
        await mockChatRoomBase(page, { messages: [] });
        await page.goto("/chat/rooms/501");

        await expect(
            page.getByText("아직 메시지가 없습니다"),
        ).toBeVisible();

        const layout = await page.evaluate(() => {
            const appHeader = document.querySelector<HTMLElement>(
                '[data-testid="app-header"]',
            );
            const roomHeader = document.querySelector<HTMLElement>(
                '[data-testid="chat-room-header"]',
            );
            const messageViewport = document.querySelector<HTMLElement>(
                '[data-testid="chat-message-viewport"]',
            );
            const emptyState = document.querySelector<HTMLElement>(
                '[data-testid="chat-message-empty-state"]',
            );

            if (
                !appHeader ||
                !roomHeader ||
                !messageViewport ||
                !emptyState
            ) {
                return null;
            }

            const appHeaderRect = appHeader.getBoundingClientRect();
            const roomHeaderRect = roomHeader.getBoundingClientRect();
            const viewportRect =
                messageViewport.getBoundingClientRect();
            const emptyRect = emptyState.getBoundingClientRect();

            return {
                headerGap:
                    roomHeaderRect.top - appHeaderRect.bottom,
                emptyCenterGap:
                    emptyRect.top +
                    emptyRect.height / 2 -
                    (viewportRect.top + viewportRect.height / 2),
            };
        });

        expect(layout).not.toBeNull();
        expect(Math.abs(layout!.headerGap)).toBeLessThanOrEqual(1);
        expect(Math.abs(layout!.emptyCenterGap)).toBeLessThanOrEqual(1);
    });

    for (const viewport of [
        { name: "desktop", width: 1280, height: 800 },
        { name: "mobile", width: 390, height: 700 },
    ]) {
        test(`CHAT-03 ${viewport.name}에서 대화를 올려도 상단과 입력창이 유지된다`, async ({ page }) => {
            // 준비: 화면보다 긴 대화를 실제 채팅방 경로로 연다.
            await page.setViewportSize({
                width: viewport.width,
                height: viewport.height,
            });
            await mockChatRoomBase(page, {
                messages: Array.from({ length: 30 }, (_, index) =>
                    makeMessage({
                        id: index + 1,
                        content: `대화 내용 ${index + 1}`,
                    }),
                ),
            });
            await page.goto("/chat/rooms/501");

            const roomHeader = page.getByTestId("chat-room-header");
            const messageScroller = page
                .getByTestId("chat-message-viewport")
                .locator(".custom-scroll");
            const input = page.getByTestId("chat-room-shell").locator("textarea");
            await expect(roomHeader).toBeVisible();
            await expect(page.getByTestId("chat-message-row-30")).toBeAttached();
            await expect(input).toBeVisible();

            // 실행: 메시지 목록만 위로 스크롤한다.
            await messageScroller.evaluate((element) => {
                element.scrollTop = element.scrollHeight;
            });
            const before = await page.evaluate(() => {
                const header = document.querySelector<HTMLElement>(
                    '[data-testid="chat-room-header"]',
                )!;
                const footer = document.querySelector<HTMLElement>(
                    '[data-testid="chat-room-shell"] footer',
                )!;
                const scroller = document.querySelector<HTMLElement>(
                    '[data-testid="chat-message-viewport"] .custom-scroll',
                )!;

                return {
                    headerTop: header.getBoundingClientRect().top,
                    footerBottom: footer.getBoundingClientRect().bottom,
                    scrollRange: scroller.scrollHeight - scroller.clientHeight,
                    scrollTop: scroller.scrollTop,
                };
            });
            await messageScroller.evaluate((element) => {
                element.scrollTop = 0;
            });

            // 검증: 대화만 이동하고 방 상단과 전송 영역은 화면에 남는다.
            await expect.poll(() =>
                messageScroller.evaluate((element) => element.scrollTop),
            ).toBe(0);
            const after = await page.evaluate(() => {
                const header = document.querySelector<HTMLElement>(
                    '[data-testid="chat-room-header"]',
                )!;
                const footer = document.querySelector<HTMLElement>(
                    '[data-testid="chat-room-shell"] footer',
                )!;
                const main = document.querySelector<HTMLElement>("main")!;

                return {
                    headerTop: header.getBoundingClientRect().top,
                    footerBottom: footer.getBoundingClientRect().bottom,
                    mainScrollTop: main.scrollTop,
                    viewportHeight: window.innerHeight,
                };
            });

            expect(before.scrollRange).toBeGreaterThan(0);
            expect(before.scrollTop).toBeGreaterThan(0);
            expect(Math.abs(after.headerTop - before.headerTop)).toBeLessThanOrEqual(1);
            expect(Math.abs(after.footerBottom - before.footerBottom)).toBeLessThanOrEqual(1);
            expect(Math.abs(after.footerBottom - after.viewportHeight)).toBeLessThanOrEqual(1);
            expect(after.mainScrollTop).toBe(0);
            await expect(input).toBeInViewport();
            await input.fill("입력 가능");
            await expect(input).toHaveValue("입력 가능");
        });
    }

    test("CHAT-08 내 메시지와 상대 메시지 및 상대 프로필 이미지를 렌더링한다", async ({
        page,
    }) => {
        const mine = makeMessage({
            id: 1,
            sender: TEST_USERS.A,
            content: "내 메시지",
        });

        const theirs = makeMessage({
            id: 2,
            sender: TEST_USERS.B,
            content: "상대 메시지",
            senderProfileImageUrl: PROFILE_IMAGE_DATA_URL,
        });

        await mockChatRoomBase(page, {
            messages: [mine, theirs],
        });

        await page.goto("/chat/rooms/501");

        await expect(page.getByText("내 메시지")).toBeVisible();
        await expect(page.getByText("상대 메시지")).toBeVisible();

        const avatar = page.getByTestId(
            "chat-message-avatar-2",
        );
        await expect(avatar).toBeVisible();
        await expect(avatar.locator("img")).toHaveAttribute(
            "src",
            PROFILE_IMAGE_DATA_URL,
        );

        await expect(
            page.getByTestId("chat-message-avatar-1"),
        ).toHaveCount(0);
    });
});
