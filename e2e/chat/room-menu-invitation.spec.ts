import {
    expect,
    test,
} from "../fixtures/mock-test";

import {
    fulfillApiJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import {
    makeRoom,
    responseDto,
} from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const members = {
    members: [
        {
            id: 1,
            chatRoomId: 501,
            userId: TEST_USERS.A.userId,
            publicId: TEST_USERS.A.publicId,
            displayName: TEST_USERS.A.nickname,
            profileImageUrl: null,
            role: "OWNER",
            active: true,
            joinedAt: "2026-07-20T12:00:00",
            leftAt: null,
        },
        {
            id: 2,
            chatRoomId: 501,
            userId: TEST_USERS.B.userId,
            publicId: TEST_USERS.B.publicId,
            displayName: TEST_USERS.B.nickname,
            profileImageUrl: null,
            role: "MEMBER",
            active: true,
            joinedAt: "2026-07-20T12:01:00",
            leftAt: null,
        },
    ],
};

test.describe("Chat room menu and invitation", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("ROOM-MENU-01 메뉴에서 멤버 목록과 프로필을 연다", async ({
        page,
    }) => {
        await mockChatRoomBase(page, {
            room: makeRoom({
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "그룹 채팅",
                memberCount: 2,
                myRole: "OWNER",
            }),
            messages: [],
        });

        await page.route(
            /.*\/chat\/rooms\/501\/members$/,
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto(members),
                ),
        );

        await page.route(
            new RegExp(
                `/chat/rooms/501/members/${TEST_USERS.B.userId}/profile$`,
            ),
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto({
                        userId: TEST_USERS.B.userId,
                        publicId:
                            TEST_USERS.B.publicId,
                        displayName:
                            TEST_USERS.B.nickname,
                        profileImageUrl: null,
                        profileBackgroundImageUrl:
                            null,
                        bio: "멤버 상태 메시지",
                        friendStatus: "FRIEND",
                    }),
                ),
        );

        await page.goto("/chat/rooms/501");

        await page
            .getByTestId("chat-room-menu-button")
            .click();

        await expect(
            page.getByTestId(
                "chat-room-menu-drawer",
            ),
        ).toBeVisible();

        await expect(
            page.getByText(
                TEST_USERS.B.publicId,
            ),
        ).toBeVisible();

        await page
            .getByTestId(
                `chat-room-member-${TEST_USERS.B.userId}`,
            )
            .click();

        await expect(
            page.getByRole("dialog", {
                name: TEST_USERS.B.nickname,
            }),
        ).toBeVisible();
    });

    test("ROOM-MENU-02 GROUP OWNER가 친구를 초대한다", async ({
        page,
    }) => {
        await mockChatRoomBase(page, {
            room: makeRoom({
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "그룹 채팅",
                memberCount: 2,
                myRole: "OWNER",
            }),
            messages: [],
        });

        await page.route(
            /.*\/chat\/rooms\/501\/members$/,
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto(members),
                ),
        );

        await page.route(
            /.*\/friends$/,
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto([
                        {
                            id: 10,
                            friend: {
                                userId: 30,
                                publicId:
                                    "TCAT-00000030",
                                nickname:
                                    "초대 친구",
                                profileImageUrl:
                                    null,
                                profileBackgroundImageUrl:
                                    null,
                                bio: null,
                            },
                            createdAt:
                                "2026-07-20T10:00:00",
                        },
                    ]),
                ),
        );

        let requestBody: unknown = null;

        await page.route(
            /.*\/chat\/rooms\/501\/members\/invitations$/,
            async (route) => {
                if (
                    route.request().method() !==
                    "POST"
                ) {
                    return route.fallback();
                }

                requestBody =
                    route.request().postDataJSON();

                return fulfillApiJson(
                    route,
                    responseDto({
                        roomId: 501,
                        createdNewGroupRoom:
                            false,
                        invitedMembers: [],
                    }),
                    201,
                );
            },
        );

        await page.goto("/chat/rooms/501");

        await page
            .getByTestId("chat-room-menu-button")
            .click();
        await page
            .getByTestId("chat-room-invite-button")
            .click();

        await page
            .getByText("초대 친구")
            .click();

        await page
            .getByRole("button", {
                name: "초대하기",
            })
            .click();

        await expect
            .poll(() => requestBody)
            .toEqual({
                targetUserIds: [30],
                targetPublicIds: [],
            });
    });

    test("ROOM-MENU-03 GROUP MEMBER에게 초대 버튼을 표시하지 않는다", async ({
        page,
    }) => {
        await mockChatRoomBase(page, {
            room: makeRoom({
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "그룹 채팅",
                memberCount: 2,
                myRole: "MEMBER",
            }),
            messages: [],
        });

        await page.route(
            /.*\/chat\/rooms\/501\/members$/,
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto(members),
                ),
        );

        await page.goto("/chat/rooms/501");

        await page
            .getByTestId("chat-room-menu-button")
            .click();

        await expect(
            page.getByTestId(
                "chat-room-invite-button",
            ),
        ).toHaveCount(0);
    });
});
