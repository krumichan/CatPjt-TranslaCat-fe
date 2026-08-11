import type { Page, Route, WebSocketRoute } from "@playwright/test";

import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import {
    errorDto,
    makeOpenChatProfile,
    makeRoom,
    responseDto,
} from "../support/mock-data";
import { mockStompBroker, sendStompJson } from "../support/stomp-mock";
import { TEST_USERS } from "../support/test-users";

const ROOM_ID = 845;

const owner = makeOpenChatProfile({
    openChatMemberId: 11,
    memberCode: "OC-OWNER1",
    nickname: "운영고양이",
    role: "OWNER",
    joinedAt: "2026-08-01T01:00:00.000Z",
});
const admin = makeOpenChatProfile({
    openChatMemberId: 22,
    memberCode: "OC-ADMIN2",
    nickname: "관리고양이",
    role: "ADMIN",
    joinedAt: "2026-08-01T01:05:00.000Z",
});
const member = makeOpenChatProfile({
    openChatMemberId: 33,
    memberCode: "OC-MEMBER3",
    nickname: "일반고양이",
    role: "MEMBER",
    joinedAt: "2026-08-01T01:10:00.000Z",
});

function roomFor(role: "OWNER" | "ADMIN" | "MEMBER") {
    return makeRoom({
        id: ROOM_ID,
        roomType: "OPEN",
        sourceType: "OPEN",
        name: "운영 테스트방",
        description: "FE #45",
        memberCount: 3,
        myRole: role,
        ownerId: null,
    });
}

function detailFor({
    role = "OWNER",
    banned = false,
}: {
    role?: "OWNER" | "ADMIN" | "MEMBER";
    banned?: boolean;
} = {}) {
    return {
        id: ROOM_ID,
        roomType: "OPEN" as const,
        sourceType: "OPEN" as const,
        name: "운영 테스트방",
        description: "FE #45",
        visibility: "PUBLIC" as const,
        status: "ACTIVE" as const,
        memberCount: banned ? 2 : 3,
        maxMemberCount: 50,
        joined: !banned,
        joinable: false,
        joinBlockedReason: banned ? ("BANNED" as const) : ("ALREADY_JOINED" as const),
        myRole: banned ? null : role,
        ownerProfile: banned ? null : owner,
        myOpenProfile: banned ? null : role === "OWNER" ? owner : role === "ADMIN" ? admin : member,
        lastActivityAt: "2026-08-01T02:00:00.000Z",
        createdAt: "2026-08-01T01:00:00.000Z",
        updatedAt: "2026-08-01T02:00:00.000Z",
    };
}

function isMethod(route: Route, method: string) {
    return route.request().method() === method;
}

async function mockOpenModerationApis(
    page: Page,
    {
        myRole = "OWNER",
        memberList = [owner, admin, member],
        bans = [],
        bannedDetail = false,
    }: {
        myRole?: "OWNER" | "ADMIN" | "MEMBER";
        memberList?: ReturnType<typeof makeOpenChatProfile>[];
        bans?: Array<{
            banId: number;
            targetOpenChatMemberId: number;
            memberCode: string;
            nickname: string;
            profileImageUrl: string | null;
            lastJoinedAt: string;
            bannedAt: string;
            bannedBy: {
                openChatMemberId: number;
                nickname: string;
                role: "OWNER" | "ADMIN" | "MEMBER";
            };
            reason: string;
            releasable: boolean;
        }>;
        bannedDetail?: boolean;
    } = {},
) {
    const currentUserProfile =
        myRole === "OWNER" ? owner : myRole === "ADMIN" ? admin : member;
    let members = memberList.map((profile) => ({ ...profile }));
    let activeBans = bans.map((item) => ({ ...item }));
    let memberRequestCount = 0;
    let banRequestCount = 0;

    await page.route(
        new RegExp(`/chat/open-rooms/${ROOM_ID}/me/profile$`),
        (route) => fulfillApiJson(route, responseDto(currentUserProfile)),
    );

    await page.route(
        new RegExp(`/chat/open-rooms/${ROOM_ID}/members$`),
        (route) => {
            memberRequestCount += 1;
            return fulfillApiJson(route, responseDto({ members }));
        },
    );

    await page.route(
        new RegExp(`/chat/open-rooms/${ROOM_ID}/members/(\\d+)$`),
        (route) => {
            const id = Number(
                new URL(route.request().url()).pathname.match(/members\/(\d+)$/)?.[1],
            );
            return fulfillApiJson(
                route,
                responseDto(members.find((profile) => profile.openChatMemberId === id)),
            );
        },
    );

    await page.route(
        new RegExp(`/chat/open-rooms/${ROOM_ID}/admins/(\\d+)$`),
        (route) => {
            const id = Number(
                new URL(route.request().url()).pathname.match(/admins\/(\d+)$/)?.[1],
            );
            const role = isMethod(route, "POST") ? "ADMIN" : "MEMBER";
            members = members.map((profile) =>
                profile.openChatMemberId === id ? { ...profile, role } : profile,
            );
            return fulfillApiJson(
                route,
                responseDto(members.find((profile) => profile.openChatMemberId === id)),
            );
        },
    );

    await page.route(
        new RegExp(`/chat/open-rooms/${ROOM_ID}/bans$`),
        (route) => {
            if (!isMethod(route, "POST")) {
                return route.fallback();
            }
            const body = route.request().postDataJSON() as {
                targetOpenChatMemberId: number;
                reason: string;
            };
            const target = members.find(
                (profile) => profile.openChatMemberId === body.targetOpenChatMemberId,
            );
            if (!target) {
                return fulfillApiJson(
                    route,
                    errorDto("OPEN_CHAT_BAN_TARGET_INVALID"),
                    409,
                );
            }
            const banId = 900 + activeBans.length;
            activeBans = [
                {
                    banId,
                    targetOpenChatMemberId: target.openChatMemberId,
                    memberCode: target.memberCode,
                    nickname: target.nickname,
                    profileImageUrl: target.profileImageUrl,
                    lastJoinedAt: target.joinedAt,
                    bannedAt: "2026-08-01T03:00:00.000Z",
                    bannedBy: {
                        openChatMemberId: currentUserProfile.openChatMemberId,
                        nickname: currentUserProfile.nickname,
                        role: myRole,
                    },
                    reason: body.reason,
                    releasable: true,
                },
                ...activeBans,
            ];
            members = members.filter(
                (profile) => profile.openChatMemberId !== target.openChatMemberId,
            );
            return fulfillApiJson(
                route,
                responseDto({
                    roomId: ROOM_ID,
                    banId,
                    targetOpenChatMemberId: target.openChatMemberId,
                    active: true,
                    bannedAt: "2026-08-01T03:00:00.000Z",
                    releasedAt: null,
                }),
            );
        },
    );

    await page.route(
        new RegExp(`/chat/open-rooms/${ROOM_ID}/bans\\?.*$`),
        (route) => {
            banRequestCount += 1;
            const url = new URL(route.request().url());
            const keyword = url.searchParams.get("keyword")?.toLowerCase() ?? "";
            const cursor = Number(url.searchParams.get("cursor") ?? 0);
            const size = Number(url.searchParams.get("size") ?? 20);
            const filtered = activeBans.filter(
                (item) =>
                    !keyword ||
                    item.nickname.toLowerCase().includes(keyword) ||
                    item.memberCode.toLowerCase().includes(keyword),
            );
            const start = cursor
                ? filtered.findIndex((item) => item.banId < cursor)
                : 0;
            const safeStart = start < 0 ? filtered.length : start;
            const pageItems = filtered.slice(safeStart, safeStart + size);
            const hasNext = safeStart + size < filtered.length;
            return fulfillApiJson(
                route,
                responseDto({
                    items: pageItems,
                    nextCursorId:
                        hasNext && pageItems.length
                            ? pageItems[pageItems.length - 1].banId
                            : null,
                    hasNext,
                }),
            );
        },
    );

    await page.route(
        new RegExp(`/chat/open-rooms/${ROOM_ID}/bans/(\\d+)/release$`),
        (route) => {
            const banId = Number(
                new URL(route.request().url()).pathname.match(/bans\/(\d+)\/release$/)?.[1],
            );
            const target = activeBans.find((item) => item.banId === banId);
            activeBans = activeBans.filter((item) => item.banId !== banId);
            return fulfillApiJson(
                route,
                responseDto({
                    roomId: ROOM_ID,
                    banId,
                    targetOpenChatMemberId: target?.targetOpenChatMemberId ?? 0,
                    active: false,
                    bannedAt: target?.bannedAt ?? "2026-08-01T03:00:00.000Z",
                    releasedAt: "2026-08-01T04:00:00.000Z",
                }),
            );
        },
    );

    await page.route(
        new RegExp(`/chat/open-rooms/${ROOM_ID}$`),
        (route) =>
            fulfillApiJson(
                route,
                responseDto(detailFor({ role: myRole, banned: bannedDetail })),
            ),
    );

    return {
        getMembers: () => members,
        getBans: () => activeBans,
        getMemberRequestCount: () => memberRequestCount,
        getBanRequestCount: () => banRequestCount,
    };
}

function makeBan(
    index: number,
    releasable = true,
) {
    return {
        banId: 1000 - index,
        targetOpenChatMemberId: 100 + index,
        memberCode: `OC-SAME${index}`,
        nickname: "같은고양이",
        profileImageUrl: null,
        lastJoinedAt: `2026-07-${String(20 + (index % 8)).padStart(2, "0")}T01:00:00.000Z`,
        bannedAt: `2026-08-01T0${index % 9}:00:00.000Z`,
        bannedBy: {
            openChatMemberId: owner.openChatMemberId,
            nickname: owner.nickname,
            role: "OWNER" as const,
        },
        reason: `운영 정책 위반 ${index}`,
        releasable,
    };
}

test.describe("OPEN chat moderation and blacklist", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("OPEN-MOD-01 OWNER가 역할 Badge, ADMIN 지정·해제, 사유 필수 강제 퇴장을 처리한다", async ({
        page,
    }) => {
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: roomFor("OWNER"),
            messages: [],
        });
        const api = await mockOpenModerationApis(page);

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();

        await expect(page.getByTestId("open-chat-role-badge-OWNER")).toBeVisible();
        await expect(page.getByTestId("open-chat-role-badge-ADMIN")).toBeVisible();
        await expect(page.getByTestId("open-chat-role-badge-MEMBER")).toBeVisible();
        await expect(page.getByTestId("open-chat-blacklist-button")).toBeVisible();

        await page.getByTestId(`open-chat-action-menu-${member.openChatMemberId}`).click();
        await page.getByTestId(`open-chat-action-ASSIGN_ADMIN-${member.openChatMemberId}`).click();
        const dialog = page.getByTestId("open-chat-moderation-dialog");
        await expect(dialog).toContainText(member.nickname);
        await expect(dialog).toContainText(member.memberCode);
        await expect(dialog).toContainText("관리자");
        await page.getByTestId("open-chat-moderation-confirm").click();
        await expect(
            page
                .getByTestId(`open-chat-room-member-${member.openChatMemberId}`)
                .getByTestId("open-chat-role-badge-ADMIN"),
        ).toBeVisible();

        await page.getByTestId(`open-chat-action-menu-${member.openChatMemberId}`).click();
        await page.getByTestId(`open-chat-action-REVOKE_ADMIN-${member.openChatMemberId}`).click();
        await page.getByTestId("open-chat-moderation-confirm").click();
        await expect(
            page
                .getByTestId(`open-chat-room-member-${member.openChatMemberId}`)
                .getByTestId("open-chat-role-badge-MEMBER"),
        ).toBeVisible();

        await page.getByTestId(`open-chat-action-menu-${member.openChatMemberId}`).click();
        await page.getByTestId(`open-chat-action-BAN-${member.openChatMemberId}`).click();
        await page.getByTestId("open-chat-moderation-confirm").click();
        await expect(dialog.getByRole("alert")).toContainText("사유");
        await page.getByTestId("open-chat-ban-reason").fill("반복적인 도배");
        await page.getByTestId("open-chat-moderation-confirm").click();

        await expect(
            page.getByTestId(`open-chat-room-member-${member.openChatMemberId}`),
        ).toHaveCount(0);
        expect(api.getMembers().some((profile) => profile.openChatMemberId === member.openChatMemberId)).toBe(false);
        expect(api.getBans()).toHaveLength(1);
    });

    test("OPEN-MOD-02 ADMIN은 MEMBER만 강제 퇴장할 수 있고 MEMBER에게 운영 Action을 숨긴다", async ({
        page,
    }) => {
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, { room: roomFor("ADMIN"), messages: [] });
        await mockOpenModerationApis(page, { myRole: "ADMIN" });

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();
        await expect(page.getByTestId("open-chat-blacklist-button")).toBeVisible();
        await expect(page.getByTestId(`open-chat-action-menu-${owner.openChatMemberId}`)).toHaveCount(0);
        await expect(page.getByTestId(`open-chat-action-menu-${admin.openChatMemberId}`)).toHaveCount(0);
        await page.getByTestId(`open-chat-action-menu-${member.openChatMemberId}`).click();
        await expect(page.getByTestId(`open-chat-action-BAN-${member.openChatMemberId}`)).toBeVisible();
        await expect(page.getByTestId(`open-chat-action-ASSIGN_ADMIN-${member.openChatMemberId}`)).toHaveCount(0);

        await mockChatRoomBase(page, { room: roomFor("MEMBER"), messages: [] });
        await mockOpenModerationApis(page, { myRole: "MEMBER" });
        await page.reload();
        await page.getByTestId("chat-room-menu-button").click();
        await expect(page.getByTestId("open-chat-blacklist-button")).toHaveCount(0);
        await expect(page.locator('[data-testid^="open-chat-action-menu-"]')).toHaveCount(0);
    });

    test("OPEN-MOD-03 chat.member.role.updated를 즉시 반영하고 오래된 Event는 무시한다", async ({
        page,
    }) => {
        const stompBroker = await mockStompBroker(page);
        const roomTopic = `/topic/chat/rooms/${ROOM_ID}`;
        await mockChatRoomBase(page, { room: roomFor("OWNER"), messages: [] });
        await mockOpenModerationApis(page);

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await expect(page.getByText("WS: CONNECTED")).toBeVisible();
        await page.getByTestId("chat-room-menu-button").click();
        await expect.poll(() => stompBroker.hasSubscriber(roomTopic)).toBe(true);

        stompBroker.sendJsonToSubscribers(
            roomTopic,
            {
                eventType: "chat.member.role.updated",
                roomId: ROOM_ID,
                targetOpenChatMemberId: member.openChatMemberId,
                role: "ADMIN",
                occurredAt: "2026-08-01T03:00:02.000Z",
            },
        );

        await expect(
            page
                .getByTestId(`open-chat-room-member-${member.openChatMemberId}`)
                .getByTestId("open-chat-role-badge-ADMIN"),
        ).toBeVisible();

        stompBroker.sendJsonToSubscribers(
            roomTopic,
            {
                eventType: "chat.member.role.updated",
                roomId: ROOM_ID,
                targetOpenChatMemberId: member.openChatMemberId,
                role: "MEMBER",
                occurredAt: "2026-08-01T03:00:01.000Z",
            },
        );

        await expect(
            page
                .getByTestId(`open-chat-room-member-${member.openChatMemberId}`)
                .getByTestId("open-chat-role-badge-ADMIN"),
        ).toBeVisible();
    });

    test("OPEN-MOD-04 chat.member.banned 대상 사용자는 구독을 정리하고 상세로 이동한다", async ({
        page,
    }) => {
        let socket: WebSocketRoute | null = null;
        const subscriptions = new Set<string>();
        await mockStompBroker(page, {
            onSocket: (nextSocket) => {
                socket = nextSocket;
            },
            onSubscribe: (destination) => {
                subscriptions.add(destination);
            },
        });
        await mockChatRoomBase(page, { room: roomFor("OWNER"), messages: [] });
        await mockOpenModerationApis(page, { bannedDetail: true });

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await expect(page.getByText("WS: CONNECTED")).toBeVisible();
        await expect.poll(() => socket !== null).toBe(true);
        await expect
            .poll(() =>
                subscriptions.has(
                    `/user/queue/chat/open-rooms/${ROOM_ID}`,
                ),
            )
            .toBe(true);

        sendStompJson(
            socket as WebSocketRoute,
            `/user/queue/chat/open-rooms/${ROOM_ID}`,
            {
                eventType: "chat.member.banned",
                roomId: ROOM_ID,
                targetOpenChatMemberId: owner.openChatMemberId,
                reason: "운영 정책 위반",
                bannedAt: "2026-08-01T03:00:00.000Z",
                occurredAt: "2026-08-01T03:00:01.000Z",
            },
        );

        await expect(page).toHaveURL(
            new RegExp(`/chat/open/${ROOM_ID}\\?notice=banned$`),
        );
        await expect(page.getByTestId("open-chat-banned-notice")).toBeVisible();
        await expect(page.getByTestId("open-chat-blocked-BANNED")).toBeVisible();
    });

    test("OPEN-MOD-05 Event를 놓쳐도 OPEN_CHAT_BANNED API 응답으로 동일 복구한다", async ({
        page,
    }) => {
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, { room: roomFor("OWNER"), messages: [] });
        await mockOpenModerationApis(page, { bannedDetail: true });
        await page.route(
            new RegExp(`/chat/rooms/${ROOM_ID}/messages$`),
            (route) => {
                if (route.request().method() === "POST") {
                    return fulfillApiJson(
                        route,
                        errorDto("OPEN_CHAT_BANNED"),
                        403,
                    );
                }
                return route.fallback();
            },
        );

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.locator('[data-testid="chat-room-shell"] textarea').fill(
            "차단 상태 확인",
        );
        await page.locator('[data-testid="chat-room-shell"] textarea').press(
            "Enter",
        );

        await expect(page).toHaveURL(
            new RegExp(`/chat/open/${ROOM_ID}\\?notice=banned$`),
        );
        await expect(page.getByTestId("open-chat-banned-notice")).toBeVisible();
    });

    test("OPEN-MOD-06 Snapshot 10명을 memberCode로 구분하고 검색·Paging·차단 해제를 수행한다", async ({
        page,
    }) => {
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: roomFor("OWNER"),
            messages: [],
        });
        const bans = Array.from({ length: 25 }, (_, index) => makeBan(index));
        const api = await mockOpenModerationApis(page, { bans });

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();
        await page.getByTestId("open-chat-blacklist-button").click();
        await expect(page.getByTestId("open-chat-blacklist-modal")).toBeVisible();
        await expect(page.getByText("블랙리스트", { exact: true })).toBeVisible();
        await expect(page.getByText("같은고양이")).toHaveCount(20);
        for (let index = 0; index < 10; index += 1) {
            await expect(page.getByText(`OC-SAME${index}`, { exact: true })).toBeVisible();
        }
        await expect(page.getByText(TEST_USERS.A.publicId)).toHaveCount(0);

        await page.getByTestId("open-chat-blacklist-load-more").click();
        await expect(page.getByText("같은고양이")).toHaveCount(25);

        await page.getByTestId("open-chat-blacklist-search").fill("OC-SAME7");
        await page.getByTestId("open-chat-blacklist-search-submit").click();
        await expect(page.getByText("OC-SAME7", { exact: true })).toBeVisible();
        await expect(page.getByText("같은고양이")).toHaveCount(1);

        await page.getByTestId(`open-chat-ban-release-${makeBan(7).banId}`).click();
        const releaseDialog = page
            .getByTestId("open-chat-ban-release-overlay")
            .getByRole("dialog");
        await expect(releaseDialog).toContainText("자동");
        await page.getByTestId("open-chat-ban-release-confirm").click();
        await expect(page.getByText("OC-SAME7", { exact: true })).toHaveCount(0);
        expect(api.getBans().some((item) => item.memberCode === "OC-SAME7")).toBe(false);
        expect(api.getBanRequestCount()).toBeGreaterThan(1);

        await page.getByTestId("open-chat-blacklist-close").click();
        await expect(page.getByTestId("open-chat-blacklist-modal")).toHaveCount(0);
        await expect(page.getByTestId("chat-room-shell")).toBeVisible();
    });

    test("OPEN-MOD-07 해제 충돌 시 현재 블랙리스트를 다시 조회한다", async ({
        page,
    }) => {
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: roomFor("OWNER"),
            messages: [],
        });
        const conflictedBan = makeBan(7);
        const api = await mockOpenModerationApis(page, { bans: [conflictedBan] });
        let releaseAttemptCount = 0;

        await page.route(
            new RegExp(`/chat/open-rooms/${ROOM_ID}/bans/${conflictedBan.banId}/release$`),
            (route) => {
                releaseAttemptCount += 1;
                if (releaseAttemptCount === 1) {
                    return fulfillApiJson(
                        route,
                        errorDto("OPEN_CHAT_BAN_NOT_FOUND"),
                        409,
                    );
                }
                return route.fallback();
            },
        );

        await page.goto(`/chat/open/${ROOM_ID}/blacklist`);
        await expect(page).toHaveURL(
            new RegExp(`/chat/rooms/${ROOM_ID}\\?openBlacklist=1$`),
        );
        await expect(page.getByTestId("open-chat-blacklist-modal")).toBeVisible();
        const initialRequestCount = api.getBanRequestCount();
        await page
            .getByTestId(`open-chat-ban-release-${conflictedBan.banId}`)
            .click();
        await page.getByTestId("open-chat-ban-release-confirm").click();

        await expect(page.getByRole("alert")).toBeVisible();
        await expect.poll(() => api.getBanRequestCount()).toBeGreaterThan(
            initialRequestCount,
        );
        await expect(
            page.getByTestId(`open-chat-ban-card-${conflictedBan.banId}`),
        ).toBeVisible();
    });

    test("OPEN-MOD-08 ADMIN releasable=false와 일본어 모바일 UI를 서버 값 그대로 표시한다", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: roomFor("ADMIN"),
            messages: [],
        });
        await mockOpenModerationApis(page, {
            myRole: "ADMIN",
            bans: [makeBan(1, false), makeBan(2, true)],
        });

        await page.goto(`/ja/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();
        await page.getByTestId("open-chat-blacklist-button").click();
        await expect(page.getByTestId("open-chat-blacklist-modal")).toBeVisible();
        await expect(page.getByText("ブラックリスト", { exact: true })).toBeVisible();
        await expect(
            page.getByTestId(`open-chat-ban-release-${makeBan(1).banId}`),
        ).toBeDisabled();
        await page.getByTestId(`open-chat-ban-release-${makeBan(2).banId}`).click();
        await expect(
            page
                .getByTestId("open-chat-ban-release-overlay")
                .getByRole("dialog"),
        ).toContainText("自動的には再入室しません");
    });

    test("OPEN-MOD-09 GROUP 방에는 OPEN 운영 UI와 OPEN API 호출이 추가되지 않는다", async ({
        page,
    }) => {
        let openChatRequestCount = 0;
        const subscriptions = new Set<string>();
        page.on("request", (request) => {
            if (new URL(request.url()).pathname.includes("/chat/open-rooms/")) {
                openChatRequestCount += 1;
            }
        });
        await mockStompBroker(page, {
            onSubscribe: (destination) => {
                subscriptions.add(destination);
            },
        });
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "기존 그룹방",
                memberCount: 2,
                myRole: "OWNER",
            }),
            messages: [],
        });
        await page.route(
            new RegExp(`/chat/rooms/${ROOM_ID}/members$`),
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto({
                        members: [
                            {
                                id: 1,
                                chatRoomId: ROOM_ID,
                                userId: TEST_USERS.A.userId,
                                publicId: TEST_USERS.A.publicId,
                                displayName: TEST_USERS.A.nickname,
                                profileImageUrl: null,
                                role: "OWNER",
                                active: true,
                                joinedAt: "2026-08-01T01:00:00.000Z",
                                leftAt: null,
                            },
                        ],
                    }),
                ),
        );

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await expect(page.getByText("WS: CONNECTED")).toBeVisible();
        await page.getByTestId("chat-room-menu-button").click();

        await expect(page.getByTestId("open-chat-blacklist-button")).toHaveCount(0);
        await expect(
            page.locator('[data-testid^="open-chat-action-menu-"]'),
        ).toHaveCount(0);
        expect(openChatRequestCount).toBe(0);
        expect(
            subscriptions.has(`/user/queue/chat/open-rooms/${ROOM_ID}`),
        ).toBe(false);
    });
});
