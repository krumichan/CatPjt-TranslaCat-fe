import type { Page, Route } from "@playwright/test";

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
import { TEST_USERS } from "../support/test-users";

const CREATED_ROOM_ID = 801;
const ONE_PIXEL_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
);

function openChatCreateResponse({
    name = "일본어 고양이방",
    description = "함께 대화하는 OPEN 채팅방",
    visibility = "PUBLIC",
    maxMemberCount = 50,
    nickname = "방장고양이",
}: {
    name?: string;
    description?: string;
    visibility?: "PUBLIC" | "UNLISTED";
    maxMemberCount?: number;
    nickname?: string;
} = {}) {
    const ownerProfile = makeOpenChatProfile({
        openChatMemberId: 811,
        memberCode: "OC-OWNER",
        nickname,
        role: "OWNER",
    });

    return {
        id: CREATED_ROOM_ID,
        roomType: "OPEN",
        sourceType: "OPEN",
        name,
        description,
        visibility,
        status: "ACTIVE",
        memberCount: 1,
        maxMemberCount,
        joined: true,
        joinable: false,
        joinBlockedReason: "ALREADY_JOINED",
        myRole: "OWNER",
        ownerProfile,
        myOpenProfile: ownerProfile,
        lastActivityAt: "2026-08-01T00:00:00.000Z",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
    };
}

async function mockCreatedRoomDestination(page: Page) {
    await mockIdleWebSocket(page);
    await mockChatRoomBase(page, {
        room: makeRoom({
            id: CREATED_ROOM_ID,
            roomType: "OPEN",
            sourceType: "OPEN",
            name: "일본어 고양이방",
            description: "함께 대화하는 OPEN 채팅방",
            memberCount: 1,
            myRole: "OWNER",
            ownerId: null,
        }),
        messages: [],
    });

    const profile = makeOpenChatProfile({
        openChatMemberId: 811,
        memberCode: "OC-OWNER",
        nickname: "방장고양이",
        role: "OWNER",
    });

    await page.route(
        new RegExp(
            `/chat/open-rooms/${CREATED_ROOM_ID}/me/profile$`,
        ),
        (route) => fulfillApiJson(route, responseDto(profile)),
    );
    await page.route(
        new RegExp(`/chat/open-rooms/${CREATED_ROOM_ID}/members$`),
        (route) =>
            fulfillApiJson(
                route,
                responseDto({ members: [profile] }),
            ),
    );
}

function isCreateRequest(route: Route): boolean {
    const url = new URL(route.request().url());
    return (
        route.request().resourceType() !== "document" &&
        route.request().method() === "POST" &&
        url.pathname.endsWith("/chat/open-rooms")
    );
}

async function fillRequiredFields(
    page: Page,
    {
        name = "일본어 고양이방",
        description = "함께 대화하는 OPEN 채팅방",
        nickname = "방장고양이",
    }: {
        name?: string;
        description?: string;
        nickname?: string;
    } = {},
) {
    await page.getByLabel("방 이름").fill(name);
    await page.getByLabel("방 설명").fill(description);
    await page.getByLabel("방별 닉네임").fill(nickname);
}

test.describe("OPEN chat create", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
    });

    test("OPEN-CREATE-00 채팅 허브에서 독립 생성 Page로 이동한다", async ({
        page,
    }) => {
        await page.route(/.*\/chat\/rooms$/, (route) =>
            fulfillApiJson(route, responseDto({ chatRooms: [] })),
        );

        await page.goto("/chat");
        await page.getByTestId("open-chat-create-link").click();

        await expect(page).toHaveURL(/\/chat\/open\/new$/);
        await expect(
            page.getByRole("heading", {
                name: "새 OPEN 채팅 만들기",
            }),
        ).toBeVisible();
    });

    test("OPEN-CREATE-01 PUBLIC 방을 기본 Avatar로 생성하고 OWNER 상태로 이동한다", async ({
        page,
    }) => {
        await mockCreatedRoomDestination(page);

        let createCount = 0;
        let createBody: Record<string, unknown> | null = null;
        let generalProfileRequests = 0;
        let uploadCount = 0;

        await page.route("**/users/me/profile", async (route) => {
            generalProfileRequests += 1;
            await route.fallback();
        });
        await page.route(/.*\/chat\/open-rooms$/, async (route) => {
            if (!isCreateRequest(route)) {
                return route.fallback();
            }

            createCount += 1;
            createBody = route.request().postDataJSON() as Record<
                string,
                unknown
            >;
            return fulfillApiJson(
                route,
                responseDto(openChatCreateResponse()),
                201,
            );
        });
        await page.route(
            new RegExp(
                `/chat/open-rooms/${CREATED_ROOM_ID}/me/profile-image$`,
            ),
            async (route) => {
                if (route.request().method() === "POST") {
                    uploadCount += 1;
                }
                return route.fallback();
            },
        );

        await page.goto("/chat/open/new");
        await expect(page.getByLabel("방별 닉네임")).toHaveValue("");
        await expect(
            page
                .getByTestId("open-chat-owner-profile-section")
                .getByText(TEST_USERS.A.publicId),
        ).toHaveCount(0);
        await expect(
            page
                .getByTestId("open-chat-profile-avatar-preview")
                .locator("img"),
        ).toHaveCount(0);
        await expect(
            page.locator(
                'input[name="open-chat-visibility"][value="PUBLIC"]',
            ),
        ).toBeChecked();
        await expect(page.getByLabel("최대 인원")).toHaveValue("50");

        await fillRequiredFields(page);
        await page.getByTestId("open-chat-profile-submit").click();

        await expect(page).toHaveURL(
            new RegExp(`/chat/rooms/${CREATED_ROOM_ID}$`),
        );
        expect(createCount).toBe(1);
        expect(uploadCount).toBe(0);
        expect(generalProfileRequests).toBe(0);
        expect(createBody).toEqual({
            name: "일본어 고양이방",
            description: "함께 대화하는 OPEN 채팅방",
            visibility: "PUBLIC",
            maxMemberCount: 50,
            ownerProfile: {
                nickname: "방장고양이",
                profileImageObjectKey: null,
            },
        });
        expect(createBody).not.toHaveProperty("isPublic");
        expect(createBody).not.toHaveProperty("searchable");
    });

    test("OPEN-CREATE-02 UNLISTED 방 생성 후 선택 이미지를 전용 Multipart API로 업로드한다", async ({
        page,
    }) => {
        await mockCreatedRoomDestination(page);

        let createBody: Record<string, unknown> | null = null;
        let uploadCount = 0;
        let uploadContentType = "";

        await page.route(/.*\/chat\/open-rooms$/, async (route) => {
            if (!isCreateRequest(route)) {
                return route.fallback();
            }

            createBody = route.request().postDataJSON() as Record<
                string,
                unknown
            >;
            return fulfillApiJson(
                route,
                responseDto(
                    openChatCreateResponse({ visibility: "UNLISTED" }),
                ),
                201,
            );
        });
        await page.route(
            new RegExp(
                `/chat/open-rooms/${CREATED_ROOM_ID}/me/profile-image$`,
            ),
            async (route) => {
                if (route.request().method() !== "POST") {
                    return route.fallback();
                }

                uploadCount += 1;
                uploadContentType =
                    route.request().headers()["content-type"] ?? "";
                return fulfillApiJson(
                    route,
                    responseDto(
                        makeOpenChatProfile({
                            openChatMemberId: 811,
                            memberCode: "OC-OWNER",
                            nickname: "방장고양이",
                            profileImageUrl:
                                "https://cdn.example.com/open/owner.png",
                            role: "OWNER",
                        }),
                    ),
                );
            },
        );

        await page.goto("/chat/open/new");
        await fillRequiredFields(page);
        await page.getByText("링크 공개", { exact: true }).click();
        await expect(
            page.locator(
                'input[name="open-chat-visibility"][value="UNLISTED"]',
            ),
        ).toBeChecked();
        await page
            .getByLabel("OPEN 프로필 이미지 파일 선택")
            .setInputFiles({
                name: "owner.png",
                mimeType: "image/png",
                buffer: ONE_PIXEL_PNG,
            });
        await page.getByTestId("open-chat-profile-submit").click();

        await expect(page).toHaveURL(
            new RegExp(`/chat/rooms/${CREATED_ROOM_ID}$`),
        );
        expect(uploadCount).toBe(1);
        expect(uploadContentType).toContain("multipart/form-data");
        expect(createBody).toMatchObject({
            visibility: "UNLISTED",
            ownerProfile: {
                nickname: "방장고양이",
                profileImageObjectKey: null,
            },
        });
        expect(JSON.stringify(createBody)).not.toContain("https://");
    });

    test("OPEN-CREATE-03 필수값·최대 인원·OWNER 닉네임 Validation을 적용한다", async ({
        page,
    }) => {
        let createCount = 0;
        await page.route(/.*\/chat\/open-rooms$/, async (route) => {
            if (isCreateRequest(route)) {
                createCount += 1;
            }
            return route.fallback();
        });

        await page.goto("/chat/open/new");
        await page.getByTestId("open-chat-profile-submit").click();

        await expect(page.getByText("방 이름을 입력해주세요.")).toBeVisible();
        await expect(page.getByText("방 설명을 입력해주세요.")).toBeVisible();
        await expect(page.getByLabel("방 이름")).toBeFocused();

        await page.getByLabel("방 이름").fill("검증방");
        await page.getByLabel("방 설명").fill("검증 설명");
        await page.getByLabel("방별 닉네임").fill("검증고양이");
        await page.getByLabel("최대 인원").fill("1");
        await page.getByTestId("open-chat-profile-submit").click();
        await expect(
            page.getByText("최대 인원은 2명 이상 100명 이하의 정수로 입력해주세요."),
        ).toBeVisible();

        await page.getByLabel("최대 인원").fill("101");
        await page.getByTestId("open-chat-profile-submit").click();
        await expect(
            page.getByText("최대 인원은 2명 이상 100명 이하의 정수로 입력해주세요."),
        ).toBeVisible();

        await page.getByLabel("최대 인원").fill("20");
        await page.getByLabel("방별 닉네임").fill("");
        await page.getByTestId("open-chat-profile-submit").click();
        await expect(
            page.getByText("방별 닉네임을 입력해주세요.", {
                exact: true,
            }),
        ).toBeVisible();

        expect(createCount).toBe(0);
    });

    test("OPEN-CREATE-04 생성 API 실패 시 입력값과 선택 이미지를 유지하고 재시도한다", async ({
        page,
    }) => {
        await mockCreatedRoomDestination(page);

        let createCount = 0;
        await page.route(/.*\/chat\/open-rooms$/, async (route) => {
            if (!isCreateRequest(route)) {
                return route.fallback();
            }

            createCount += 1;
            if (createCount === 1) {
                return fulfillApiJson(
                    route,
                    errorDto("OPEN_CHAT_CREATE_FAILED"),
                    500,
                );
            }

            return fulfillApiJson(
                route,
                responseDto(openChatCreateResponse()),
                201,
            );
        });
        await page.route(
            new RegExp(
                `/chat/open-rooms/${CREATED_ROOM_ID}/me/profile-image$`,
            ),
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto(
                        makeOpenChatProfile({
                            openChatMemberId: 811,
                            memberCode: "OC-OWNER",
                            nickname: "재시도고양이",
                            role: "OWNER",
                        }),
                    ),
                ),
        );

        await page.goto("/chat/open/new");
        await fillRequiredFields(page, { nickname: "재시도고양이" });
        await page
            .getByLabel("OPEN 프로필 이미지 파일 선택")
            .setInputFiles({
                name: "retry.png",
                mimeType: "image/png",
                buffer: ONE_PIXEL_PNG,
            });
        await page.getByTestId("open-chat-profile-submit").click();

        await expect(
            page.getByTestId("open-chat-create-submit-error"),
        ).toContainText("OPEN 채팅방 생성에 실패했습니다.");
        await expect(page.getByLabel("방 이름")).toHaveValue(
            "일본어 고양이방",
        );
        await expect(page.getByLabel("방별 닉네임")).toHaveValue(
            "재시도고양이",
        );
        await expect(page.getByText("retry.png")).toBeVisible();

        await page.getByTestId("open-chat-profile-submit").click();
        await expect(page).toHaveURL(
            new RegExp(`/chat/rooms/${CREATED_ROOM_ID}$`),
        );
        expect(createCount).toBe(2);
    });

    test("OPEN-CREATE-05 이미지 업로드 실패 재시도는 방을 중복 생성하지 않는다", async ({
        page,
    }) => {
        await mockCreatedRoomDestination(page);

        let createCount = 0;
        let uploadCount = 0;
        await page.route(/.*\/chat\/open-rooms$/, async (route) => {
            if (!isCreateRequest(route)) {
                return route.fallback();
            }

            createCount += 1;
            return fulfillApiJson(
                route,
                responseDto(openChatCreateResponse()),
                201,
            );
        });
        await page.route(
            new RegExp(
                `/chat/open-rooms/${CREATED_ROOM_ID}/me/profile-image$`,
            ),
            async (route) => {
                if (route.request().method() !== "POST") {
                    return route.fallback();
                }

                uploadCount += 1;
                if (uploadCount === 1) {
                    return fulfillApiJson(
                        route,
                        errorDto("PROFILE_IMAGE_STORE_FAILED"),
                        500,
                    );
                }

                return fulfillApiJson(
                    route,
                    responseDto(
                        makeOpenChatProfile({
                            openChatMemberId: 811,
                            memberCode: "OC-OWNER",
                            nickname: "방장고양이",
                            profileImageUrl:
                                "https://cdn.example.com/open/retry.png",
                            role: "OWNER",
                        }),
                    ),
                );
            },
        );

        await page.goto("/chat/open/new");
        await fillRequiredFields(page);
        await page
            .getByLabel("OPEN 프로필 이미지 파일 선택")
            .setInputFiles({
                name: "partial.png",
                mimeType: "image/png",
                buffer: ONE_PIXEL_PNG,
            });
        await page.getByTestId("open-chat-profile-submit").click();

        await expect(
            page.getByTestId("open-chat-create-partial-success"),
        ).toBeVisible();
        await expect(
            page.getByTestId("open-chat-create-submit-error"),
        ).toContainText("방은 생성되었지만");
        await expect(page.getByLabel("방 이름")).toBeDisabled();
        await expect(page.getByText("partial.png")).toBeVisible();
        await expect(
            page.getByTestId("open-chat-profile-submit"),
        ).toContainText("남은 프로필 설정 다시 시도");
        expect(createCount).toBe(1);
        expect(uploadCount).toBe(1);

        await page.getByTestId("open-chat-profile-submit").click();
        await expect(page).toHaveURL(
            new RegExp(`/chat/rooms/${CREATED_ROOM_ID}$`),
        );
        expect(createCount).toBe(1);
        expect(uploadCount).toBe(2);
    });

    test("OPEN-CREATE-06 빠른 중복 Submit에도 생성 API는 한 번만 호출한다", async ({
        page,
    }) => {
        await mockCreatedRoomDestination(page);

        let createCount = 0;
        await page.route(/.*\/chat\/open-rooms$/, async (route) => {
            if (!isCreateRequest(route)) {
                return route.fallback();
            }

            createCount += 1;
            await new Promise((resolve) => setTimeout(resolve, 250));
            return fulfillApiJson(
                route,
                responseDto(openChatCreateResponse()),
                201,
            );
        });

        await page.goto("/chat/open/new");
        await fillRequiredFields(page);
        await page
            .getByTestId("open-chat-profile-submit")
            .evaluate((element) => {
                const button = element as HTMLButtonElement;
                button.click();
                button.click();
            });

        await expect(page).toHaveURL(
            new RegExp(`/chat/rooms/${CREATED_ROOM_ID}$`),
        );
        expect(createCount).toBe(1);
    });

    test("OPEN-CREATE-07 일본어 모바일 UI에서 링크限定公開 설명과 반응형을 제공한다", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("/ja/chat/open/new");

        await expect(
            page.getByRole("heading", {
                name: "新しいOPENチャットを作成",
            }),
        ).toBeVisible();
        await expect(
            page.getByText(
                "一覧と検索には表示されず、リンクを知るユーザーのみアクセスできます。",
            ),
        ).toBeVisible();
        await page
            .getByText("リンク限定公開", { exact: true })
            .click();
        await expect(
            page.locator(
                'input[name="open-chat-visibility"][value="UNLISTED"]',
            ),
        ).toBeChecked();

        const hasHorizontalOverflow = await page.evaluate(
            () =>
                document.documentElement.scrollWidth >
                document.documentElement.clientWidth,
        );
        expect(hasHorizontalOverflow).toBe(false);
    });
});
