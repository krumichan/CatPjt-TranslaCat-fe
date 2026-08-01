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
    makeOpenChatMessage,
    makeOpenChatProfile,
    makeRoom,
    responseDto,
} from "../support/mock-data";
import { mockStompBroker, sendStompJson } from "../support/stomp-mock";
import { TEST_USERS } from "../support/test-users";

const ROOM_ID = 501;

const myProfile = makeOpenChatProfile({
    openChatMemberId: 11,
    memberCode: "OC-ME001",
    nickname: "고양이방장",
    role: "OWNER",
    joinedAt: "2026-07-20T12:00:00.000Z",
});

const otherProfile = makeOpenChatProfile({
    openChatMemberId: 22,
    memberCode: "OC-OTHER2",
    nickname: "같은고양이",
    role: "MEMBER",
    joinedAt: "2026-07-20T12:05:00.000Z",
});

const duplicateProfile = makeOpenChatProfile({
    openChatMemberId: 23,
    memberCode: "OC-OTHER3",
    nickname: "같은고양이",
    role: "ADMIN",
    joinedAt: "2026-07-20T12:06:00.000Z",
});

function openRoom(active = true) {
    return makeRoom({
        id: ROOM_ID,
        roomType: "OPEN",
        sourceType: "OPEN",
        name: "OPEN 고양이방",
        description: "방별 프로필 E2E",
        memberCount: 3,
        myRole: "OWNER",
        active,
        ownerId: null,
    });
}

function isApiRequest(route: Route, method: string): boolean {
    return (
        route.request().resourceType() !== "document" &&
        route.request().method() === method
    );
}

async function mockOpenChatProfileApis(
    page: Page,
    {
        initialMyProfile = myProfile,
        members = [myProfile, otherProfile, duplicateProfile],
    }: {
        initialMyProfile?: ReturnType<typeof makeOpenChatProfile>;
        members?: ReturnType<typeof makeOpenChatProfile>[];
    } = {},
) {
    let currentMyProfile = { ...initialMyProfile };
    let patchBody: unknown = null;
    let uploadCount = 0;
    let deleteCount = 0;

    await page.route(
        new RegExp(`/chat/open-rooms/${ROOM_ID}/me/profile$`),
        async (route) => {
            const method = route.request().method();

            if (method === "GET") {
                return fulfillApiJson(route, responseDto(currentMyProfile));
            }

            if (method === "PATCH") {
                patchBody = route.request().postDataJSON();
                const body = patchBody as { nickname?: string };
                currentMyProfile = {
                    ...currentMyProfile,
                    nickname: body.nickname ?? currentMyProfile.nickname,
                };
                return fulfillApiJson(route, responseDto(currentMyProfile));
            }

            return route.fallback();
        },
    );

    await page.route(
        new RegExp(`/chat/open-rooms/${ROOM_ID}/me/profile-image$`),
        async (route) => {
            if (isApiRequest(route, "POST")) {
                uploadCount += 1;
                currentMyProfile = {
                    ...currentMyProfile,
                    profileImageUrl: "https://cdn.example.com/open/me.png",
                };
                return fulfillApiJson(route, responseDto(currentMyProfile));
            }

            if (isApiRequest(route, "DELETE")) {
                deleteCount += 1;
                currentMyProfile = {
                    ...currentMyProfile,
                    profileImageUrl: null,
                };
                return fulfillApiJson(route, responseDto(currentMyProfile));
            }

            return route.fallback();
        },
    );

    await page.route(
        new RegExp(`/chat/open-rooms/${ROOM_ID}/members$`),
        (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    members: members.map((member) =>
                        member.openChatMemberId ===
                        currentMyProfile.openChatMemberId
                            ? currentMyProfile
                            : member,
                    ),
                }),
            ),
    );

    await page.route(
        new RegExp(`/chat/open-rooms/${ROOM_ID}/members/(\\d+)$`),
        (route) => {
            const match = new URL(route.request().url()).pathname.match(
                /\/members\/(\d+)$/,
            );
            const memberId = Number(match?.[1]);
            const profile =
                memberId === currentMyProfile.openChatMemberId
                    ? currentMyProfile
                    : members.find(
                          (member) =>
                              member.openChatMemberId === memberId,
                      );

            return fulfillApiJson(route, responseDto(profile));
        },
    );

    return {
        getCurrentMyProfile: () => currentMyProfile,
        getPatchBody: () => patchBody,
        getUploadCount: () => uploadCount,
        getDeleteCount: () => deleteCount,
    };
}

test.describe("OPEN chat room-scoped profile", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("OPEN-PROFILE-01 내 방별 프로필의 닉네임과 이미지를 수정·삭제한다", async ({
        page,
    }) => {
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: openRoom(),
            messages: [],
        });
        const api = await mockOpenChatProfileApis(page);

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();
        await page.getByTestId("open-chat-edit-my-profile-button").click();

        const modal = page.getByTestId("open-chat-profile-edit-modal");
        await expect(modal).toBeVisible();
        const nicknameInput = modal.getByLabel("방별 닉네임");
        await expect(nicknameInput).toHaveValue(myProfile.nickname);
        await expect(
            modal.getByLabel(
                `수정할 수 없는 멤버 코드 ${myProfile.memberCode}`,
            ),
        ).toHaveAttribute("readonly", "");
        await expect(modal.getByText(TEST_USERS.A.publicId)).toHaveCount(0);
        await expect(
            page.getByTestId("open-chat-profile-avatar-preview").locator("img"),
        ).toHaveCount(0);

        await nicknameInput.fill("");
        await page.getByTestId("open-chat-profile-submit").click();
        await expect(modal.getByRole("alert")).toContainText(
            "방별 닉네임을 입력해주세요.",
        );

        await nicknameInput.fill("새로운고양이");
        await modal.getByLabel("OPEN 프로필 이미지 파일 선택").setInputFiles({
            name: "open-profile.png",
            mimeType: "image/png",
            buffer: Buffer.from(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
                "base64",
            ),
        });
        await page.getByTestId("open-chat-profile-submit").click();

        await expect(modal).toBeHidden();
        expect(api.getPatchBody()).toEqual({ nickname: "새로운고양이" });
        expect(api.getUploadCount()).toBe(1);
        expect(api.getCurrentMyProfile().memberCode).toBe(myProfile.memberCode);

        await page.getByTestId("chat-room-menu-button").click();
        await expect(page.getByText("새로운고양이")).toBeVisible();
        await page.getByTestId("open-chat-edit-my-profile-button").click();
        await page.getByRole("button", { name: "이미지 삭제" }).click();
        await page.getByTestId("open-chat-profile-submit").click();

        await expect(modal).toBeHidden();
        expect(api.getDeleteCount()).toBe(1);
        expect(api.getCurrentMyProfile().profileImageUrl).toBeNull();
    });

    test("OPEN-PROFILE-02 메시지의 OPEN 발신자와 안전한 전용 프로필 모달을 표시한다", async ({
        page,
    }) => {
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: openRoom(),
            messages: [
                {
                    ...makeOpenChatMessage({
                        id: 9101,
                        sender: otherProfile,
                        content: "OPEN 메시지",
                    }),
                    // Privacy regression guard: OPEN UI must ignore legacy fields.
                    senderUserId: TEST_USERS.B.userId,
                    senderName: TEST_USERS.B.nickname,
                    senderEmail: TEST_USERS.B.email,
                    senderProfileImageUrl:
                        "https://cdn.example.com/general-profile.png",
                },
            ],
        });
        await mockOpenChatProfileApis(page);

        await page.goto(`/chat/rooms/${ROOM_ID}`);

        await expect(page.getByText(otherProfile.nickname)).toBeVisible();
        await expect(page.getByText(TEST_USERS.B.nickname)).toHaveCount(0);
        await expect(
            page.locator('img[src*="general-profile.png"]'),
        ).toHaveCount(0);
        await page.getByTestId("chat-message-avatar-9101").click();

        const dialog = page.getByTestId("open-chat-member-profile-modal");
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText(otherProfile.nickname)).toBeVisible();
        await expect(dialog.getByText(otherProfile.memberCode)).toBeVisible();
        await expect(dialog.getByText(TEST_USERS.B.publicId)).toHaveCount(0);
        await expect(
            dialog.getByRole("button", { name: "친구 요청 보내기" }),
        ).toHaveCount(0);
    });

    test("OPEN-PROFILE-03 같은 닉네임의 멤버를 memberCode로 구분한다", async ({
        page,
    }) => {
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: openRoom(),
            messages: [],
        });
        await mockOpenChatProfileApis(page);

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();

        await expect(page.getByText("같은고양이")).toHaveCount(2);
        await expect(page.getByText(otherProfile.memberCode)).toBeVisible();
        await expect(page.getByText(duplicateProfile.memberCode)).toBeVisible();
        await expect(page.getByText(TEST_USERS.B.publicId)).toHaveCount(0);
    });

    test("OPEN-PROFILE-04 최신 프로필 Event를 메시지·모달·멤버 목록에 반영하고 역순 Event를 무시한다", async ({
        page,
    }) => {
        let socket: WebSocketRoute | null = null;
        await mockStompBroker(page, {
            onSocket: (nextSocket) => {
                socket = nextSocket;
            },
        });
        await mockChatRoomBase(page, {
            room: openRoom(),
            messages: [
                makeOpenChatMessage({
                    id: 9102,
                    sender: otherProfile,
                    content: "실시간 프로필",
                }),
            ],
        });
        await mockOpenChatProfileApis(page);

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await expect(page.getByText("WS: CONNECTED")).toBeVisible();
        await expect.poll(() => socket !== null).toBe(true);

        await page.getByTestId("chat-room-menu-button").click();
        await page
            .getByTestId(
                `open-chat-room-member-${otherProfile.openChatMemberId}`,
            )
            .click();
        await expect(
            page.getByTestId("open-chat-member-profile-modal"),
        ).toBeVisible();

        const firstEvent = {
            eventType: "chat.open-profile.updated",
            roomId: ROOM_ID,
            openChatMemberId: otherProfile.openChatMemberId,
            memberCode: otherProfile.memberCode,
            nickname: "실시간고양이",
            profileImageUrl: null,
            role: "ADMIN",
            occurredAt: "2026-07-20T13:00:00.000Z",
        };
        sendStompJson(
            socket as WebSocketRoute,
            `/topic/chat/rooms/${ROOM_ID}`,
            firstEvent,
        );

        await expect(
            page.getByTestId("chat-message-avatar-9102"),
        ).toHaveAttribute("aria-label", /실시간고양이/);
        await expect(
            page
                .getByTestId("open-chat-member-profile-modal")
                .getByText("실시간고양이", { exact: true }),
        ).toBeVisible();

        await page.getByRole("button", { name: "OPEN 프로필 닫기" }).click();
        await page.getByTestId("chat-room-menu-button").click();
        await expect(
            page
                .getByTestId(
                    `open-chat-room-member-${otherProfile.openChatMemberId}`,
                )
                .getByText("실시간고양이", { exact: true }),
        ).toBeVisible();

        sendStompJson(
            socket as WebSocketRoute,
            `/topic/chat/rooms/${ROOM_ID}`,
            {
                ...firstEvent,
                nickname: "오래된고양이",
                occurredAt: "2026-07-20T12:59:59.000Z",
            },
        );

        await expect(page.getByText("오래된고양이")).toHaveCount(0);
        await expect(
            page
                .getByTestId(
                    `open-chat-room-member-${otherProfile.openChatMemberId}`,
                )
                .getByText("실시간고양이", { exact: true }),
        ).toBeVisible();
    });


    test("OPEN-PROFILE-06 BANNED 사용자는 방 메뉴에서 수정 Form에 접근할 수 없다", async ({
        page,
    }) => {
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: openRoom(),
            messages: [],
        });
        await mockOpenChatProfileApis(page);
        await page.route(
            new RegExp(`/chat/open-rooms/${ROOM_ID}/me/profile$`),
            (route) => {
                if (route.request().method() !== "GET") {
                    return route.fallback();
                }
                return fulfillApiJson(
                    route,
                    errorDto("OPEN_CHAT_MEMBER_ACCESS_DENIED"),
                    400,
                );
            },
        );

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();

        const editButton = page.getByTestId(
            "open-chat-edit-my-profile-button",
        );
        await expect(editButton).toBeDisabled();
        await expect(
            page.getByTestId("open-chat-profile-edit-modal"),
        ).toHaveCount(0);
    });

    test("OPEN-PROFILE-05 종료된 방에서는 모바일 일본어 UI의 프로필 수정 버튼을 비활성화한다", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await mockIdleWebSocket(page);
        await mockChatRoomBase(page, {
            room: openRoom(false),
            messages: [],
        });
        await mockOpenChatProfileApis(page, {
            initialMyProfile: {
                ...myProfile,
                active: false,
            },
        });

        await page.goto(`/ja/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();

        const editButton = page.getByTestId(
            "open-chat-edit-my-profile-button",
        );
        await expect(editButton).toBeVisible();
        await expect(editButton).toBeDisabled();
        await expect(editButton).toContainText("自分のOPENプロフィールを変更");
    });
});
