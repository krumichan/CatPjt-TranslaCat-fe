import type { Page, Route } from "@playwright/test";

import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    fulfillJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
    requestBody,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import {
    makeOpenChatRoomListItem,
    makeRoom,
    responseDto,
} from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const ROOM_ID = 501;

const now = "2026-08-09T12:00:00+09:00";

type MockAiMember = {
    aiMemberId: number;
    aiAgentId: number;
    chatRoomId: number;
    nickname: string;
    profileImageUrl: string | null;
    profileBackgroundImageUrl: string | null;
    bio: string | null;
    originalLanguageCode: string;
    personaPrompt: string;
    active: boolean;
    joinedAt: string;
    createdAt: string;
    updatedAt: string;
};

type MockRoomAiSetting = {
    chatRoomId: number;
    aiEnabled: boolean;
    currentAiMemberCount: number;
    maxAiMembersPerRoom: number;
    disclosureType: "PUBLIC" | "PRIVATE";
    mentionPermission: "ALL_MEMBERS" | "OWNER_ADMIN_ONLY";
    conversationEnabled: boolean;
    revivalEnabled: boolean;
};

function makeAiMember({
    aiMemberId,
    nickname,
    language = "ja",
}: {
    aiMemberId: number;
    nickname: string;
    language?: string;
}): MockAiMember {
    return {
        aiMemberId,
        aiAgentId: 1000 + aiMemberId,
        chatRoomId: ROOM_ID,
        nickname,
        profileImageUrl: null,
        profileBackgroundImageUrl: null,
        bio: `${nickname} bio`,
        originalLanguageCode: language,
        personaPrompt: `${nickname} persona`,
        active: true,
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
    };
}

function makeRoomAiSetting(): MockRoomAiSetting {
    return {
        chatRoomId: ROOM_ID,
        aiEnabled: true,
        currentAiMemberCount: 1,
        maxAiMembersPerRoom: 2,
        disclosureType: "PUBLIC" as const,
        mentionPermission: "ALL_MEMBERS" as const,
        conversationEnabled: true,
        revivalEnabled: true,
    };
}

const roomMembers = {
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
            joinedAt: now,
            leftAt: null,
        },
    ],
};

async function mockRoomMemberMenu(page: Page): Promise<void> {
    await page.route(/.*\/chat\/rooms\/501\/members$/, (route) =>
        fulfillApiJson(route, responseDto(roomMembers)),
    );
}

async function mockAiRoomApi(
    page: Page,
    {
        canMutate = true,
        disclosureType = "PUBLIC",
    }: {
        canMutate?: boolean;
        disclosureType?: "PUBLIC" | "PRIVATE";
    } = {},
) {
    let members: MockAiMember[] = [
        makeAiMember({ aiMemberId: 11, nickname: "미야" }),
    ];
    let setting: MockRoomAiSetting = {
        ...makeRoomAiSetting(),
        disclosureType,
    };
    const patches: Record<string, unknown>[] = [];

    await page.route(/.*\/chat\/rooms\/501\/ai-members$/, async (route) => {
        const method = route.request().method();
        if (method === "GET") {
            return fulfillApiJson(
                route,
                responseDto({
                    chatRoomId: ROOM_ID,
                    currentCount: members.length,
                    maxCount: setting.maxAiMembersPerRoom,
                    members,
                }),
            );
        }

        if (method === "POST" && canMutate) {
            const body = requestBody(route) as Record<string, unknown>;
            const created = {
                ...makeAiMember({
                    aiMemberId: 12,
                    nickname: String(body.nickname ?? "하루"),
                    language: String(body.originalLanguageCode ?? "ko"),
                }),
                bio: (body.bio as string | null | undefined) ?? null,
                personaPrompt: String(body.personaPrompt ?? ""),
            };
            members = [...members, created];
            setting = {
                ...setting,
                aiEnabled: true,
                currentAiMemberCount: members.length,
            };
            return fulfillApiJson(route, responseDto(created), 201);
        }

        return route.fallback();
    });

    await page.route(/.*\/chat\/rooms\/501\/ai-members\/(\d+)$/, async (route) => {
        const method = route.request().method();
        const match = new URL(route.request().url()).pathname.match(/ai-members\/(\d+)$/);
        const id = Number(match?.[1]);
        const member = members.find((item) => item.aiMemberId === id);
        if (!member) return route.fallback();

        if (method === "PATCH" && canMutate) {
            const body = requestBody(route) as {
                nickname?: string;
                bio?: string | null;
                originalLanguageCode?: string;
                personaPrompt?: string;
            };
            const updated = {
                ...member,
                nickname: body.nickname ?? member.nickname,
                bio: body.bio === undefined ? member.bio : body.bio,
                originalLanguageCode:
                    body.originalLanguageCode ?? member.originalLanguageCode,
                personaPrompt: body.personaPrompt ?? member.personaPrompt,
                updatedAt: now,
            };
            members = members.map((item) =>
                item.aiMemberId === id ? updated : item,
            );
            return fulfillApiJson(route, responseDto(updated));
        }

        if (method === "DELETE" && canMutate) {
            const deleted = { ...member, active: false, updatedAt: now };
            members = members.filter((item) => item.aiMemberId !== id);
            setting = {
                ...setting,
                aiEnabled: members.length > 0,
                currentAiMemberCount: members.length,
            };
            return fulfillApiJson(route, responseDto(deleted));
        }

        if (method === "GET") {
            return fulfillApiJson(route, responseDto(member));
        }

        return route.fallback();
    });

    await page.route(
        /.*\/chat\/rooms\/501\/ai-members\/(\d+)\/profile-image$/,
        async (route) => {
            const match = new URL(route.request().url()).pathname.match(
                /ai-members\/(\d+)\/profile-image$/,
            );
            const id = Number(match?.[1]);
            const member = members.find((item) => item.aiMemberId === id);
            if (!member || !canMutate) return route.fallback();

            if (route.request().method() === "POST") {
                const updated = {
                    ...member,
                    profileImageUrl: `https://example.com/ai-${id}.png`,
                    updatedAt: now,
                };
                members = members.map((item) =>
                    item.aiMemberId === id ? updated : item,
                );
                return fulfillApiJson(route, responseDto(updated));
            }

            if (route.request().method() === "DELETE") {
                const updated = {
                    ...member,
                    profileImageUrl: null,
                    updatedAt: now,
                };
                members = members.map((item) =>
                    item.aiMemberId === id ? updated : item,
                );
                return fulfillApiJson(route, responseDto(updated));
            }

            return route.fallback();
        },
    );

    await page.route(/.*\/chat\/rooms\/501\/ai-settings$/, async (route) => {
        const method = route.request().method();
        if (method === "GET") {
            return fulfillApiJson(route, responseDto(setting));
        }
        if (method === "PATCH" && canMutate) {
            const body = requestBody(route) as Partial<typeof setting>;
            patches.push(body);
            setting = { ...setting, ...body };
            return fulfillApiJson(route, responseDto(setting));
        }
        return route.fallback();
    });

    return {
        getPatches: () => patches,
    };
}

function isOpenRoomListRequest(route: Route): boolean {
    const url = new URL(route.request().url());
    return (
        route.request().method() === "GET" &&
        url.pathname.endsWith("/chat/open-rooms")
    );
}

test.describe("FE #10 AI member management", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("AI-10-01 GROUP OWNER가 AI 정책을 수정하고 AI 멤버를 추가한다", async ({
        page,
    }) => {
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "AI 그룹방",
                memberCount: 1,
                myRole: "OWNER",
            }),
            messages: [],
        });
        await mockRoomMemberMenu(page);
        const aiApi = await mockAiRoomApi(page);

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();
        await page.getByTestId("chat-ai-settings-button").click();

        await expect(page.getByTestId("chat-ai-management-modal")).toBeVisible();
        await expect(page.getByTestId("chat-ai-member-11")).toContainText("미야");

        await page.getByTestId("chat-ai-disclosure-select").selectOption("PRIVATE");
        await expect(page.getByText("AI 비공개방입니다")).toBeVisible();

        await page.getByTestId("chat-ai-mention-permission-select").selectOption("OWNER_ADMIN_ONLY");
        await page.getByTestId("chat-ai-conversation-toggle").uncheck();
        await page.getByTestId("chat-ai-revival-toggle").uncheck();

        await page.getByTestId("chat-ai-add-member").click();
        await page.getByTestId("chat-ai-nickname-input").fill("하루");
        await page.getByTestId("chat-ai-language-select").selectOption("ko");
        await page.getByTestId("chat-ai-bio-input").fill("대화를 자연스럽게 이어 주는 AI");
        await page.getByTestId("chat-ai-persona-input").fill("친근하고 짧은 채팅체를 사용한다.");
        await page.getByTestId("chat-ai-profile-image-input").setInputFiles({
            name: "haru.png",
            mimeType: "image/png",
            buffer: Buffer.from("mock-image"),
        });
        await page.getByTestId("chat-ai-save-member").click();

        const createdCard = page.getByTestId("chat-ai-member-12");
        await expect(createdCard).toContainText("하루");
        await expect(createdCard.locator("img")).toHaveAttribute(
            "src",
            "https://example.com/ai-12.png",
        );
        await expect(page.getByTestId("chat-ai-add-member")).toBeDisabled();

        await page.getByTestId("chat-ai-edit-member-12").click();
        await page.getByTestId("chat-ai-nickname-input").fill("하루 수정");
        await page.getByTestId("chat-ai-save-member").click();
        await expect(page.getByTestId("chat-ai-member-12")).toContainText("하루 수정");

        await page.getByTestId("chat-ai-delete-member-12").click();
        const deleteDialog = page
            .getByRole("dialog")
            .filter({ hasText: "AI 멤버를 삭제할까요?" });
        await expect(deleteDialog).toBeVisible();
        await deleteDialog.getByRole("button", { name: "삭제", exact: true }).click();
        await expect(page.getByTestId("chat-ai-member-12")).toHaveCount(0);
        await expect(page.getByTestId("chat-ai-add-member")).toBeEnabled();

        const patches = aiApi.getPatches();
        expect(patches).toContainEqual({ disclosureType: "PRIVATE" });
        expect(patches).toContainEqual({ mentionPermission: "OWNER_ADMIN_ONLY" });
        expect(patches).toContainEqual({ conversationEnabled: false });
        expect(patches).toContainEqual({ revivalEnabled: false });
    });

    test("AI-10-02 일반 MEMBER에게 AI 멤버·룸 설정 메뉴를 노출하지 않는다", async ({
        page,
    }) => {
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "AI 읽기 전용방",
                memberCount: 1,
                myRole: "MEMBER",
            }),
            messages: [],
        });
        await mockRoomMemberMenu(page);
        await mockAiRoomApi(page, {
            canMutate: false,
            disclosureType: "PRIVATE",
        });

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();
        await expect(page.getByTestId("chat-ai-settings-button")).toHaveCount(0);
    });

    test("AI-10-03 OPEN 탐색 목록에서 PRIVATE AI 방임을 입장 전에 확인한다", async ({
        page,
    }) => {
        const openRoom = {
            ...makeOpenChatRoomListItem({
                id: 910,
                name: "AI 비공개 OPEN 방",
            }),
            ai: {
                aiEnabled: true,
                aiMemberCount: 2,
                disclosureType: "PRIVATE" as const,
            },
        };

        await page.route(/.*\/chat\/open-rooms(?:\?.*)?$/, (route) => {
            if (!isOpenRoomListRequest(route)) return route.fallback();
            return fulfillApiJson(
                route,
                responseDto({
                    openChatRooms: [openRoom],
                    nextCursorId: null,
                    hasNext: false,
                }),
            );
        });

        await page.goto("/chat/open");

        const card = page.getByTestId("open-chat-room-card-910");
        await expect(card).toContainText("AI 비공개방");
        await expect(card).toContainText("2");
    });

    test("AI-10-04 System ADMIN이 AI 운영값을 수정한다", async ({ page }) => {
        await page.route("**/api/auth/session", (route) =>
            fulfillJson(route, {
                user: {
                    name: TEST_USERS.A.nickname,
                    email: TEST_USERS.A.email,
                    image: null,
                    role: "ADMIN",
                    publicId: TEST_USERS.A.publicId,
                    accessToken: "mock-admin-access-token",
                    refreshToken: "mock-admin-refresh-token",
                    accessTokenExpires: Date.now() + 60 * 60 * 1000,
                },
                accessToken: "mock-admin-access-token",
                refreshToken: "mock-admin-refresh-token",
                expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            }),
        );

        let setting = {
            maxAiMembersPerRoom: 2,
            conversationResponseRate: 15,
            conversationCooldownSeconds: 180,
            conversationMinHumanMessagesAfterAi: 2,
            responseDelayEnabled: true,
            responseDelayMinMillis: 1200,
            responseDelayMaxMillis: 3500,
            revivalFirstDelayHours: 24,
            revivalSecondDelayHours: 72,
            revivalThirdDelayHours: 168,
            revivalAllowedStartTime: "10:00:00",
            revivalAllowedEndTime: "22:00:00",
            contextMaxMessages: 30,
            contextMaxCharacters: 12000,
            replyMaxCharacters: 800,
            mentionRateLimitCount: 5,
            mentionRateLimitWindowSeconds: 60,
        };
        let patchBody: Record<string, unknown> | null = null;

        await page.route(/.*\/admin\/chat\/ai-settings$/, async (route) => {
            if (route.request().method() === "GET") {
                return fulfillApiJson(route, responseDto(setting));
            }
            if (route.request().method() === "PATCH") {
                patchBody = requestBody(route) as Record<string, unknown>;
                setting = {
                    ...setting,
                    ...(patchBody as Partial<typeof setting>),
                };
                return fulfillApiJson(route, responseDto(setting));
            }
            return route.fallback();
        });

        await page.goto("/settings/admin/chat-ai");
        await expect(page.getByTestId("admin-chat-ai-settings")).toBeVisible();

        const maxMembers = page.getByLabel("방당 AI 최대 인원");
        await maxMembers.fill("3");
        await page.getByLabel("AI 응답 최소 지연 (ms)").fill("1500");
        await page
            .getByTestId("admin-chat-ai-response-delay-enabled")
            .uncheck();
        await page.getByTestId("admin-chat-ai-save").click();

        await expect(page.getByText("채팅 AI 운영 설정을 저장했습니다.")).toBeVisible();
        expect(patchBody).toMatchObject({
            maxAiMembersPerRoom: 3,
            responseDelayEnabled: false,
            responseDelayMinMillis: 1500,
            responseDelayMaxMillis: 3500,
        });
    });

    test("AI-10-05 Mobile dark mode에서도 AI 관리 Modal이 화면 안에 표시된다", async ({
        page,
    }) => {
        await page.emulateMedia({ colorScheme: "dark" });
        await page.setViewportSize({ width: 390, height: 844 });
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "GROUP",
                sourceType: "FRIEND",
                name: "AI 모바일 테스트방",
                memberCount: 1,
                myRole: "OWNER",
            }),
            messages: [],
        });
        await mockRoomMemberMenu(page);
        await mockAiRoomApi(page);

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();
        await page.getByTestId("chat-ai-settings-button").click();

        const modal = page.getByTestId("chat-ai-management-modal");
        await expect(modal).toBeVisible();
        await expect(page.locator("html")).toHaveClass(/dark/);

        const box = await modal.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(390);
        expect(box!.height).toBeLessThanOrEqual(844);
    });

    test("AI-10-06 DIRECT 방에는 AI 관리 진입점이 노출되지 않는다", async ({
        page,
    }) => {
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "DIRECT",
                sourceType: "FRIEND",
                name: null,
                memberCount: 2,
                myRole: null,
            }),
            messages: [],
        });
        await mockRoomMemberMenu(page);

        await page.goto(`/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();

        await expect(page.getByTestId("chat-ai-settings-button")).toHaveCount(0);
    });

});
