import type { Page, Route } from "@playwright/test";

import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import {
    makeOpenChatProfile,
    makeOpenChatRoomDetail,
    makeOpenChatRoomListItem,
    makeRoom,
    responseDto,
} from "../support/mock-data";

const ROOM_ID = 901;

function isOpenRoomListRequest(route: Route) {
    const url = new URL(route.request().url());
    return (
        route.request().method() === "GET" &&
        url.pathname.endsWith("/chat/open-rooms")
    );
}

async function mockOpenChatDestination(
    page: Page,
    {
        roomId = ROOM_ID,
        myRole = "MEMBER",
        members,
    }: {
        roomId?: number;
        myRole?: "OWNER" | "ADMIN" | "MEMBER";
        members?: ReturnType<typeof makeOpenChatProfile>[];
    } = {},
) {
    const myProfile = makeOpenChatProfile({
        openChatMemberId: roomId * 10 + 2,
        memberCode: `OC-${roomId}-ME`,
        nickname: "참여고양이",
        role: myRole,
    });
    const openMembers =
        members ??
        [
            makeOpenChatProfile({
                openChatMemberId: roomId * 10 + 1,
                memberCode: `OC-${roomId}-OWNER`,
                nickname: "방장고양이",
                role: "OWNER",
            }),
            myProfile,
        ];

    await mockIdleWebSocket(page);
    await mockChatRoomBase(page, {
        room: makeRoom({
            id: roomId,
            roomType: "OPEN",
            sourceType: "OPEN",
            name: "OPEN 테스트방",
            description: "OPEN 상세 테스트",
            memberCount: openMembers.length,
            myRole,
            ownerId: null,
        }),
        messages: [],
    });
    await page.route(
        new RegExp(`/chat/open-rooms/${roomId}/me/profile$`),
        (route) => fulfillApiJson(route, responseDto(myProfile)),
    );
    await page.route(
        new RegExp(`/chat/open-rooms/${roomId}/members$`),
        (route) =>
            fulfillApiJson(
                route,
                responseDto({ members: openMembers }),
            ),
    );
}

async function mockEmptyExplore(page: Page) {
    await page.route(/.*\/chat\/open-rooms(?:\?.*)?$/, (route) => {
        if (!isOpenRoomListRequest(route)) {
            return route.fallback();
        }
        return fulfillApiJson(
            route,
            responseDto({
                openChatRooms: [],
                nextCursorId: null,
                hasNext: false,
            }),
        );
    });
}

test.describe("FE #9 OPEN chat browse and detail", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("OPEN-09-01 Chat Hub 진입점과 PUBLIC 검색·Cursor·중복 제거를 제공한다", async ({
        page,
    }) => {
        await page.route(/.*\/chat\/rooms$/, (route) =>
            fulfillApiJson(route, responseDto({ chatRooms: [] })),
        );

        const roomA = makeOpenChatRoomListItem({
            id: 101,
            name: "일본어 고양이 모임",
        });
        const roomB = makeOpenChatRoomListItem({
            id: 102,
            name: "한국어 고양이 모임",
        });
        const unlisted = makeOpenChatRoomListItem({
            id: 999,
            name: "목록에 나오면 안 되는 방",
            visibility: "UNLISTED",
        });

        await page.route(/.*\/chat\/open-rooms(?:\?.*)?$/, (route) => {
            if (!isOpenRoomListRequest(route)) {
                return route.fallback();
            }
            const url = new URL(route.request().url());
            const keyword = url.searchParams.get("keyword");
            const cursorId = url.searchParams.get("cursorId");

            if (keyword === "한국어") {
                return fulfillApiJson(
                    route,
                    responseDto({
                        openChatRooms: [roomB],
                        nextCursorId: null,
                        hasNext: false,
                    }),
                );
            }
            if (cursorId === "101") {
                return fulfillApiJson(
                    route,
                    responseDto({
                        openChatRooms: [roomA, roomB, unlisted],
                        nextCursorId: null,
                        hasNext: false,
                    }),
                );
            }
            return fulfillApiJson(
                route,
                responseDto({
                    openChatRooms: [roomA],
                    nextCursorId: 101,
                    hasNext: true,
                }),
            );
        });

        await page.goto("/chat");
        await page.getByTestId("open-chat-explore-link").click();
        await expect(page).toHaveURL(/\/chat\/open$/);
        await expect(page.getByText("일본어 고양이 모임")).toBeVisible();

        await page.getByTestId("open-chat-load-more").click();
        await expect(page.getByText("한국어 고양이 모임")).toBeVisible();
        await expect(
            page.getByTestId("open-chat-room-card-101"),
        ).toHaveCount(1);
        await expect(page.getByText("목록에 나오면 안 되는 방")).toHaveCount(0);

        await page.getByLabel("OPEN 채팅 검색").fill("한국어");
        await expect(page).toHaveURL(/\/chat\/open\?q=/);
        await expect(page.getByText("한국어 고양이 모임")).toBeVisible();
        await expect(page.getByText("일본어 고양이 모임")).toHaveCount(0);
    });

    test("OPEN-09-02 UNLISTED 직접 상세에서 최초 프로필을 설정해 참여한다", async ({
        page,
    }) => {
        await mockOpenChatDestination(page);

        const detail = makeOpenChatRoomDetail({
            id: ROOM_ID,
            name: "링크 전용 고양이방",
            visibility: "UNLISTED",
        });
        const joined = makeOpenChatRoomDetail({
            id: ROOM_ID,
            name: detail.name,
            visibility: "UNLISTED",
            joined: true,
            joinable: false,
            joinBlockedReason: "ALREADY_JOINED",
            myRole: "MEMBER",
            myOpenProfile: makeOpenChatProfile({
                openChatMemberId: ROOM_ID * 10 + 2,
                memberCode: "OC-JOINED",
                nickname: "참여고양이",
            }),
        });
        let joinBody: unknown = null;

        await page.route(
            new RegExp(`/chat/open-rooms/${ROOM_ID}$`),
            (route) => fulfillApiJson(route, responseDto(detail)),
        );
        await page.route(
            new RegExp(`/chat/open-rooms/${ROOM_ID}/join$`),
            (route) => {
                joinBody = route.request().postDataJSON();
                return fulfillApiJson(route, responseDto(joined));
            },
        );

        await page.goto(`/chat/open/${ROOM_ID}`);
        await expect(page.getByText("링크 공개", { exact: true })).toBeVisible();
        await expect(page.getByText("방장고양이")).toHaveCount(0);
        await page.getByTestId("open-chat-join-button").click();
        await page.getByLabel("방별 닉네임").fill("참여고양이");
        await page.getByTestId("open-chat-profile-submit").click();

        await expect(page).toHaveURL(new RegExp(`/chat/rooms/${ROOM_ID}$`));
        expect(joinBody).toEqual({
            profile: {
                nickname: "참여고양이",
                profileImageObjectKey: null,
            },
        });
    });

    test("OPEN-09-03 기존 memberCode와 프로필을 유지해 재참여한다", async ({
        page,
    }) => {
        await mockOpenChatDestination(page);
        const oldProfile = makeOpenChatProfile({
            openChatMemberId: ROOM_ID * 10 + 2,
            memberCode: "OC-KEEP-ME",
            nickname: "예전고양이",
            active: false,
        });
        const detail = makeOpenChatRoomDetail({
            id: ROOM_ID,
            myOpenProfile: oldProfile,
        });
        let joinCount = 0;

        await page.route(
            new RegExp(`/chat/open-rooms/${ROOM_ID}$`),
            (route) => fulfillApiJson(route, responseDto(detail)),
        );
        await page.route(
            new RegExp(`/chat/open-rooms/${ROOM_ID}/join$`),
            (route) => {
                joinCount += 1;
                return fulfillApiJson(
                    route,
                    responseDto(
                        makeOpenChatRoomDetail({
                            id: ROOM_ID,
                            joined: true,
                            joinable: false,
                            joinBlockedReason: "ALREADY_JOINED",
                            myRole: "MEMBER",
                            myOpenProfile: {
                                ...oldProfile,
                                active: true,
                            },
                        }),
                    ),
                );
            },
        );

        await page.goto(`/chat/open/${ROOM_ID}`);
        await page.getByTestId("open-chat-join-button").click();
        await expect(
            page.getByRole("textbox", { name: /OC-KEEP-ME/ }),
        ).toHaveValue("OC-KEEP-ME");
        await expect(page.getByLabel("방별 닉네임")).toHaveValue("예전고양이");
        await page.getByTestId("open-chat-profile-submit").click();
        await expect(page).toHaveURL(new RegExp(`/chat/rooms/${ROOM_ID}$`));
        expect(joinCount).toBe(1);
    });

    test("OPEN-09-04 FULL·CLOSED·BANNED 상태를 구분하고 BANNED에서는 메시지·멤버 API를 호출하지 않는다", async ({
        page,
    }) => {
        let protectedApiCount = 0;
        await page.route(/.*\/chat\/rooms\/\d+\/(?:messages|members).*/, (route) => {
            protectedApiCount += 1;
            return route.fallback();
        });
        await page.route(
            new RegExp(`/chat/open-rooms/${ROOM_ID}$`),
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto(
                        makeOpenChatRoomDetail({
                            id: ROOM_ID,
                            joinable: false,
                            joinBlockedReason: "BANNED",
                        }),
                    ),
                ),
        );

        await page.goto(`/chat/open/${ROOM_ID}`);
        await expect(page.getByTestId("open-chat-blocked-BANNED")).toBeVisible();
        await expect(page.getByText("재참여 제한", { exact: true })).toBeVisible();
        expect(protectedApiCount).toBe(0);
    });

    test("OPEN-09-05 MEMBER는 안내 확인 후 자발적으로 퇴실한다", async ({
        page,
    }) => {
        await mockOpenChatDestination(page, { myRole: "MEMBER" });
        await mockEmptyExplore(page);
        let leaveCount = 0;
        await page.route(
            new RegExp(`/chat/open-rooms/${ROOM_ID}/leave$`),
            (route) => {
                leaveCount += 1;
                return fulfillApiJson(
                    route,
                    responseDto({ roomId: ROOM_ID, active: false, role: "MEMBER", profile: null }),
                );
            },
        );

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();
        await page.getByTestId("open-chat-lifecycle-button").click();
        await expect(page.getByTestId("open-chat-lifecycle-dialog-LEAVE")).toBeVisible();
        await page.getByTestId("open-chat-lifecycle-confirm").click();
        await expect(page).toHaveURL(/\/chat\/open$/);
        expect(leaveCount).toBe(1);
    });

    test("OPEN-09-06 OWNER는 대상에게 위임한 뒤 퇴실한다", async ({
        page,
    }) => {
        const owner = makeOpenChatProfile({
            openChatMemberId: ROOM_ID * 10 + 1,
            memberCode: "OC-OWNER",
            nickname: "현재방장",
            role: "OWNER",
        });
        const target = makeOpenChatProfile({
            openChatMemberId: ROOM_ID * 10 + 2,
            memberCode: "OC-TARGET",
            nickname: "새방장",
            role: "MEMBER",
        });
        await mockOpenChatDestination(page, {
            myRole: "OWNER",
            members: [owner, target],
        });
        await mockEmptyExplore(page);
        let transferredTarget: number | null = null;
        let leaveCount = 0;

        await page.route(
            new RegExp(`/chat/open-rooms/${ROOM_ID}/owner-transfer$`),
            (route) => {
                const body = route.request().postDataJSON() as {
                    targetOpenChatMemberId: number;
                };
                transferredTarget = body.targetOpenChatMemberId;
                return fulfillApiJson(
                    route,
                    responseDto(makeOpenChatRoomDetail({ id: ROOM_ID, joined: true, myRole: "MEMBER" })),
                );
            },
        );
        await page.route(
            new RegExp(`/chat/open-rooms/${ROOM_ID}/leave$`),
            (route) => {
                leaveCount += 1;
                return fulfillApiJson(route, responseDto({ roomId: ROOM_ID, active: false, role: "MEMBER", profile: target }));
            },
        );

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();
        await page.getByTestId("open-chat-lifecycle-button").click();
        await page.getByText("새방장", { exact: true }).click();
        await page.getByTestId("open-chat-lifecycle-confirm").click();
        await expect(page).toHaveURL(/\/chat\/open$/);
        expect(transferredTarget).toBe(target.openChatMemberId);
        expect(leaveCount).toBe(1);
    });

    test("OPEN-09-07 유일한 OWNER는 복구 불가 안내 후 방을 종료한다", async ({
        page,
    }) => {
        const owner = makeOpenChatProfile({
            openChatMemberId: ROOM_ID * 10 + 1,
            memberCode: "OC-ONLY",
            nickname: "혼자방장",
            role: "OWNER",
        });
        await mockOpenChatDestination(page, {
            myRole: "OWNER",
            members: [owner],
        });
        await mockEmptyExplore(page);
        let closeCount = 0;
        await page.route(
            new RegExp(`/chat/open-rooms/${ROOM_ID}/close$`),
            (route) => {
                closeCount += 1;
                return fulfillApiJson(
                    route,
                    responseDto(makeOpenChatRoomDetail({ id: ROOM_ID, status: "CLOSED", joinable: false, joinBlockedReason: "ROOM_CLOSED" })),
                );
            },
        );

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();
        await page.getByTestId("open-chat-lifecycle-button").click();
        await expect(page.getByText("종료한 방은 복구할 수 없고", { exact: false })).toBeVisible();
        await page.getByTestId("open-chat-lifecycle-confirm").click();
        await expect(page).toHaveURL(/\/chat\/open$/);
        expect(closeCount).toBe(1);
    });

    test("OPEN-09-08 일본어 모바일에서도 링크限定公開 상세와 Touch UI를 표시한다", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.route(
            new RegExp(`/chat/open-rooms/${ROOM_ID}$`),
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto(
                        makeOpenChatRoomDetail({
                            id: ROOM_ID,
                            name: "猫のリンクルーム",
                            visibility: "UNLISTED",
                        }),
                    ),
                ),
        );

        await page.goto(`/ja/chat/open/${ROOM_ID}`);
        await expect(page.getByText("リンク限定公開", { exact: true })).toBeVisible();
        await expect(page.getByTestId("open-chat-join-button")).toBeVisible();
        const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        expect(overflow).toBe(false);
    });
});
