import { expect, test } from "../fixtures/mock-test";

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

const PROFILE_IMAGE_DATA_URL =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="orange"/></svg>',
    );

const BACKGROUND_IMAGE_DATA_URL =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="purple"/></svg>',
    );

const directPartner = {
    userId: TEST_USERS.B.userId,
    publicId: TEST_USERS.B.publicId,
    displayName: TEST_USERS.B.nickname,
    profileImageUrl: PROFILE_IMAGE_DATA_URL,
    profileBackgroundImageUrl:
        BACKGROUND_IMAGE_DATA_URL,
    bio: "채팅방 상대 프로필 상태 메시지",
};

test.describe("Chat room navigation and partner profile", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("ROOM-PROFILE-01 뒤로가기 버튼으로 채팅 목록에 이동한다", async ({
        page,
    }) => {
        await mockChatRoomBase(page, {
            room: {
                ...makeRoom(),
                directPartner,
            },
        });

        await page.route("**/chat/rooms", (route) =>
            fulfillApiJson(
                route,
                responseDto({ chatRooms: [] }),
            ),
        );

        await page.goto("/chat/rooms/501");

        await page
            .getByTestId("chat-room-back-button")
            .click();

        await expect(page).toHaveURL(/\/chat$/);
        await expect(
            page.getByRole("tab", {
                name: "채팅",
                exact: true,
            }),
        ).toHaveAttribute("aria-selected", "true");
    });

    test("ROOM-PROFILE-02 FRIEND DIRECT 상대 프로필 모달을 표시한다", async ({
        page,
    }) => {
        await mockChatRoomBase(page, {
            room: {
                ...makeRoom(),
                directPartner,
            },
        });

        await page.goto("/chat/rooms/501");

        await page
            .getByTestId(
                "chat-partner-profile-button",
            )
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
                "채팅방 상대 프로필 상태 메시지",
            ),
        ).toBeVisible();

        await expect(
            dialog.locator(
                `img[src="${PROFILE_IMAGE_DATA_URL}"]`,
            ),
        ).toBeVisible();

        await expect(
            dialog.locator(
                `img[src="${BACKGROUND_IMAGE_DATA_URL}"]`,
            ),
        ).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
    });

    test("ROOM-PROFILE-03 GROUP 방에는 단일 상대 프로필 버튼을 표시하지 않는다", async ({
        page,
    }) => {
        await mockChatRoomBase(page, {
            room: makeRoom({
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "그룹 채팅",
                memberCount: 3,
            }),
        });

        await page.goto("/chat/rooms/501");

        await expect(
            page.getByTestId(
                "chat-partner-profile-button",
            ),
        ).toHaveCount(0);
    });
});
