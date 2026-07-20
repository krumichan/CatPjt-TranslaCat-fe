import { expect, test } from "../fixtures/mock-test";

import {
    fulfillApiJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import {
    makeMessage,
    makeRoom,
    responseDto,
} from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const groupMemberProfile = {
    userId: TEST_USERS.B.userId,
    publicId: TEST_USERS.B.publicId,
    displayName: TEST_USERS.B.nickname,
    profileImageUrl: null,
    profileBackgroundImageUrl: null,
    bio: "그룹 멤버 상태 메시지",
    friendStatus: "NONE",
};

test.describe("Group chat member profile", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("GROUP-PROFILE-01 메시지 발신자 프로필을 On-demand 조회한다", async ({
        page,
    }) => {
        const message = makeMessage({
            id: 8101,
            sender: TEST_USERS.B,
            content: "그룹 메시지입니다.",
        });

        await mockChatRoomBase(page, {
            room: makeRoom({
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "그룹 채팅",
                memberCount: 3,
            }),
            messages: [message],
        });

        await page.route(
            new RegExp(
                `/chat/rooms/501/members/${TEST_USERS.B.userId}/profile$`,
            ),
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto(groupMemberProfile),
                ),
        );

        await page.goto("/chat/rooms/501");

        await expect(
            page.getByTestId(
                "chat-partner-profile-button",
            ),
        ).toHaveCount(0);

        await page
            .getByTestId("chat-message-avatar-8101")
            .click();

        const dialog = page.getByRole("dialog", {
            name: TEST_USERS.B.nickname,
        });

        await expect(dialog).toBeVisible();
        await expect(
            dialog.getByText(TEST_USERS.B.publicId),
        ).toBeVisible();
        await expect(
            dialog.getByText(
                "그룹 멤버 상태 메시지",
            ),
        ).toBeVisible();
        await expect(
            dialog.getByRole("button", {
                name: "친구 요청 보내기",
            }),
        ).toBeVisible();
    });

    test("GROUP-PROFILE-02 친구 요청 성공 후 REQUEST_SENT 상태로 갱신한다", async ({
        page,
    }) => {
        const message = makeMessage({
            id: 8102,
            sender: TEST_USERS.B,
            content: "친구 요청 테스트",
        });

        await mockChatRoomBase(page, {
            room: makeRoom({
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "그룹 채팅",
                memberCount: 3,
            }),
            messages: [message],
        });

        await page.route(
            new RegExp(
                `/chat/rooms/501/members/${TEST_USERS.B.userId}/profile$`,
            ),
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto(groupMemberProfile),
                ),
        );

        let requestBody: unknown = null;

        await page.route(
            /.*\/friend-requests$/,
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
                        id: 9901,
                        requesterUserId:
                            TEST_USERS.A.userId,
                        receiverUserId:
                            TEST_USERS.B.userId,
                        status: "PENDING",
                        requestedAt:
                            "2026-07-20T12:00:00",
                        respondedAt: null,
                    }),
                );
            },
        );

        await page.goto("/chat/rooms/501");

        await page
            .getByTestId("chat-message-avatar-8102")
            .click();

        await page
            .getByRole("button", {
                name: "친구 요청 보내기",
            })
            .click();

        await expect
            .poll(() => requestBody)
            .toEqual({
                receiverPublicId:
                    TEST_USERS.B.publicId,
            });

        await expect(
            page.getByText("친구 요청 보냄"),
        ).toBeVisible();

        await expect(
            page.getByRole("button", {
                name: "친구 요청 보내기",
            }),
        ).toHaveCount(0);
    });

    test("GROUP-PROFILE-03 이미 친구이면 친구 요청 버튼을 표시하지 않는다", async ({
        page,
    }) => {
        const message = makeMessage({
            id: 8103,
            sender: TEST_USERS.B,
            content: "이미 친구인 사용자",
        });

        await mockChatRoomBase(page, {
            room: makeRoom({
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "그룹 채팅",
                memberCount: 3,
            }),
            messages: [message],
        });

        await page.route(
            new RegExp(
                `/chat/rooms/501/members/${TEST_USERS.B.userId}/profile$`,
            ),
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto({
                        ...groupMemberProfile,
                        friendStatus: "FRIEND",
                    }),
                ),
        );

        await page.goto("/chat/rooms/501");

        await page
            .getByTestId("chat-message-avatar-8103")
            .click();

        await expect(
            page.getByRole("dialog", {
                name: TEST_USERS.B.nickname,
            }),
        ).toBeVisible();

        await expect(
            page.getByRole("button", {
                name: "친구 요청 보내기",
            }),
        ).toHaveCount(0);
    });
});
