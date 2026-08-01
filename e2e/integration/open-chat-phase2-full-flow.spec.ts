import {
    expect,
    test,
    type APIResponse,
    type Page,
} from "@playwright/test";

import {
    closeRealUser,
    openRealUser,
    REAL_E2E_ENABLED,
    waitForUrlRoomId,
    type RealUserSession,
} from "./real-support";

test.describe.configure({ mode: "serial" });

test.skip(
    !REAL_E2E_ENABLED,
    "Set E2E_REAL=1 and prepare A/B/C auth states to run real integration tests.",
);

type ResponseDto<T> = { body: T };

type OpenChatMemberProfile = {
    openChatMemberId: number;
    memberCode: string;
    nickname: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    active: boolean;
};

async function unwrap<T>(response: APIResponse): Promise<T> {
    if (!response.ok()) {
        throw new Error(
            `API failed: ${response.url()} status=${response.status()} body=${await response.text()}`,
        );
    }

    const json = (await response.json()) as ResponseDto<T>;
    return json.body;
}

async function getMyOpenProfile(
    session: RealUserSession,
    roomId: number,
): Promise<OpenChatMemberProfile> {
    return unwrap<OpenChatMemberProfile>(
        await session.api.get(`chat/open-rooms/${roomId}/me/profile`),
    );
}

async function closeRoomQuietly(
    owner: RealUserSession | undefined,
    roomId: number | null,
): Promise<void> {
    if (!owner || roomId == null) return;

    try {
        const response = await owner.api.post(
            `chat/open-rooms/${roomId}/close`,
        );
        if (!response.ok() && response.status() !== 409) {
            console.error(
                `OPEN room cleanup failed. status=${response.status()} body=${await response.text()}`,
            );
        }
    } catch (error) {
        console.error("OPEN room cleanup failed", error);
    }
}

async function ensureRoomMenuOpen(page: Page): Promise<void> {
    const drawer = page.getByTestId("chat-room-menu-drawer");
    if (!(await drawer.isVisible().catch(() => false))) {
        await page.getByTestId("chat-room-menu-button").click();
    }
    await expect(drawer).toBeVisible({ timeout: 20_000 });
}

async function joinOpenRoom(
    session: RealUserSession,
    roomId: number,
    nickname: string,
): Promise<void> {
    await session.page.goto(`/chat/open/${roomId}`);
    await expect(
        session.page.getByTestId("open-chat-join-button"),
    ).toBeVisible({ timeout: 30_000 });

    await session.page.getByTestId("open-chat-join-button").click();
    await expect(
        session.page.getByTestId("open-chat-join-dialog"),
    ).toBeVisible();
    await session.page.getByLabel("방별 닉네임").fill(nickname);
    await session.page.getByTestId("open-chat-profile-submit").click();

    await expect(session.page).toHaveURL(
        new RegExp(`/chat/rooms/${roomId}$`),
        { timeout: 30_000 },
    );
    await expect(
        session.page.getByPlaceholder("메시지를 입력하세요"),
    ).toBeVisible({ timeout: 30_000 });
}

async function waitForConnected(session: RealUserSession): Promise<void> {
    const status = session.page.getByTestId("chat-websocket-status");

    await expect(
        status,
        [
            `[${session.key}] WebSocket 연결 실패.`,
            `url=${session.page.url()}`,
            `ws=${process.env.NEXT_PUBLIC_WS_URL ?? "미설정"}`,
        ].join(" "),
    ).toHaveText("WS: CONNECTED", { timeout: 30_000 });
}

async function sendMessageAndExpect(
    sender: RealUserSession,
    receivers: RealUserSession[],
    content: string,
): Promise<void> {
    const input = sender.page.getByPlaceholder("메시지를 입력하세요");
    await input.fill(content);
    await sender.page
        .getByRole("button", { name: "메시지 전송" })
        .click();

    await expect(sender.page.getByText(content)).toBeVisible({
        timeout: 30_000,
    });

    for (const receiver of receivers) {
        await expect(receiver.page.getByText(content)).toBeVisible({
            timeout: 30_000,
        });
    }
}

test(
    "OPEN-INT-01 Docs #12 OPEN 생성·검색·참여·메시지·운영·퇴실 결합 흐름",
    async ({ browser }) => {
        test.setTimeout(12 * 60 * 1000);

        const sessions: RealUserSession[] = [];
        let A: RealUserSession | undefined;
        let B: RealUserSession | undefined;
        let C: RealUserSession | undefined;
        let roomId: number | null = null;

        const suffix = Date.now().toString().slice(-8);
        const roomName = `E2E-OPEN-${suffix}`;
        const ownerNickname = `OWNER-${suffix}`;
        const adminNickname = `ADMIN-${suffix}`;
        const memberNickname = `MEMBER-${suffix}`;

        try {
            A = await openRealUser(browser, "A");
            sessions.push(A);
            B = await openRealUser(browser, "B");
            sessions.push(B);
            C = await openRealUser(browser, "C");
            sessions.push(C);

            await test.step("A가 PUBLIC OPEN 방을 생성", async () => {
                await A!.page.goto("/chat/open/new");
                await A!.page.getByLabel("방 이름").fill(roomName);
                await A!.page
                    .getByLabel("방 설명")
                    .fill("Docs #12 OPEN 실제 결합 QA 자동 생성 방");
                await A!.page.getByLabel("최대 인원").fill("5");
                await A!.page
                    .getByLabel("방별 닉네임")
                    .fill(ownerNickname);
                await A!.page
                    .getByTestId("open-chat-profile-submit")
                    .click();

                roomId = await waitForUrlRoomId(A!.page);
                await expect(
                    A!.page.getByPlaceholder("메시지를 입력하세요"),
                ).toBeVisible({ timeout: 30_000 });
            });

            await test.step(
                "B가 목록에서 방을 검색하고 상세를 거쳐 참여",
                async () => {
                    await B!.page.goto("/chat/open");
                    await B!.page.locator("#open-chat-search").fill(roomName);

                    const roomCard = B!.page.getByTestId(
                        `open-chat-room-card-${roomId}`,
                    );
                    await expect(roomCard).toBeVisible({ timeout: 30_000 });
                    await expect(roomCard).toContainText(roomName);
                    await roomCard
                        .locator(`a[href$="/chat/open/${roomId}"]`)
                        .click();

                    await expect(B!.page.getByText(roomName)).toBeVisible();
                    await joinOpenRoom(B!, roomId!, adminNickname);
                },
            );

            await test.step(
                "C가 공유 링크 상세를 통해 참여",
                async () => {
                    await joinOpenRoom(C!, roomId!, memberNickname);
                },
            );

            await Promise.all([
                waitForConnected(A!),
                waitForConnected(B!),
                waitForConnected(C!),
            ]);

            const ownerProfile = await getMyOpenProfile(A!, roomId!);
            const adminProfile = await getMyOpenProfile(B!, roomId!);
            const memberProfileBeforeBan = await getMyOpenProfile(C!, roomId!);

            expect(ownerProfile.role).toBe("OWNER");
            expect(adminProfile.role).toBe("MEMBER");
            expect(memberProfileBeforeBan.role).toBe("MEMBER");

            await test.step(
                "A/B/C가 실제 WebSocket으로 메시지를 송수신",
                async () => {
                    await sendMessageAndExpect(
                        A!,
                        [B!, C!],
                        `OPEN-A-${suffix}`,
                    );
                    await sendMessageAndExpect(
                        B!,
                        [A!, C!],
                        `OPEN-B-${suffix}`,
                    );
                },
            );

            await test.step(
                "OWNER가 B를 ADMIN으로 지정하고 B의 운영 권한이 반영",
                async () => {
                    await ensureRoomMenuOpen(A!.page);
                    await A!.page
                        .getByTestId(
                            `open-chat-action-menu-${adminProfile.openChatMemberId}`,
                        )
                        .click();
                    await A!.page
                        .getByTestId(
                            `open-chat-action-ASSIGN_ADMIN-${adminProfile.openChatMemberId}`,
                        )
                        .click();
                    await A!.page
                        .getByTestId("open-chat-moderation-confirm")
                        .click();

                    await expect(
                        A!.page
                            .getByTestId(
                                `open-chat-room-member-${adminProfile.openChatMemberId}`,
                            )
                            .getByTestId("open-chat-role-badge-ADMIN"),
                    ).toBeVisible({ timeout: 30_000 });

                    await ensureRoomMenuOpen(B!.page);
                    await expect(
                        B!.page.getByTestId("open-chat-blacklist-button"),
                    ).toBeVisible({ timeout: 30_000 });
                },
            );

            await test.step(
                "ADMIN이 C를 강제 퇴장시키고 C가 즉시 차단 상태로 복구",
                async () => {
                    await B!.page
                        .getByTestId(
                            `open-chat-action-menu-${memberProfileBeforeBan.openChatMemberId}`,
                        )
                        .click();
                    await B!.page
                        .getByTestId(
                            `open-chat-action-BAN-${memberProfileBeforeBan.openChatMemberId}`,
                        )
                        .click();
                    await B!.page
                        .getByTestId("open-chat-ban-reason")
                        .fill("Docs #12 실제 결합 QA 차단");
                    await B!.page
                        .getByTestId("open-chat-moderation-confirm")
                        .click();

                    await expect(C!.page).toHaveURL(
                        new RegExp(
                            `/chat/open/${roomId}\\?notice=banned$`,
                        ),
                        { timeout: 30_000 },
                    );
                    await expect(
                        C!.page.getByTestId("open-chat-banned-notice"),
                    ).toBeVisible();
                    await expect(
                        C!.page.getByTestId("open-chat-blocked-BANNED"),
                    ).toBeVisible();
                },
            );

            await test.step(
                "OWNER가 방 단위 블랙리스트에서 C를 검색하고 차단 해제",
                async () => {
                    await ensureRoomMenuOpen(A!.page);
                    await A!.page
                        .getByTestId("open-chat-blacklist-button")
                        .click();
                    await expect(
                        A!.page.getByTestId("open-chat-blacklist-modal"),
                    ).toBeVisible();

                    await A!.page
                        .getByTestId("open-chat-blacklist-search")
                        .fill(memberProfileBeforeBan.memberCode);
                    await A!.page
                        .getByTestId("open-chat-blacklist-search-submit")
                        .click();

                    const banCard = A!.page
                        .locator('[data-testid^="open-chat-ban-card-"]')
                        .filter({
                            hasText: memberProfileBeforeBan.memberCode,
                        });
                    await expect(banCard).toBeVisible({ timeout: 30_000 });
                    await banCard
                        .locator('[data-testid^="open-chat-ban-release-"]')
                        .click();
                    await A!.page
                        .getByTestId("open-chat-ban-release-confirm")
                        .click();
                    await expect(banCard).toHaveCount(0, { timeout: 30_000 });
                },
            );

            await test.step(
                "C가 기존 memberCode를 유지해 재참여",
                async () => {
                    await C!.page.goto(`/chat/open/${roomId}`);
                    await C!.page
                        .getByTestId("open-chat-join-button")
                        .click();
                    await expect(
                        C!.page.getByRole("textbox", {
                            name: new RegExp(
                                memberProfileBeforeBan.memberCode,
                            ),
                        }),
                    ).toHaveValue(memberProfileBeforeBan.memberCode);
                    await C!.page
                        .getByTestId("open-chat-profile-submit")
                        .click();
                    await expect(C!.page).toHaveURL(
                        new RegExp(`/chat/rooms/${roomId}$`),
                        { timeout: 30_000 },
                    );

                    const rejoinedProfile = await getMyOpenProfile(C!, roomId!);
                    expect(rejoinedProfile.memberCode).toBe(
                        memberProfileBeforeBan.memberCode,
                    );
                    expect(rejoinedProfile.active).toBe(true);
                },
            );

            await test.step(
                "C가 퇴실한 뒤 메시지 조회·전송 권한이 제한",
                async () => {
                    await ensureRoomMenuOpen(C!.page);
                    await C!.page
                        .getByTestId("open-chat-lifecycle-button")
                        .click();
                    await expect(
                        C!.page.getByTestId(
                            "open-chat-lifecycle-dialog-LEAVE",
                        ),
                    ).toBeVisible();
                    await C!.page
                        .getByTestId("open-chat-lifecycle-confirm")
                        .click();
                    await expect(C!.page).toHaveURL(/\/chat\/open$/, {
                        timeout: 30_000,
                    });

                    const readResponse = await C!.api.get(
                        `chat/rooms/${roomId}/messages`,
                    );
                    const sendResponse = await C!.api.post(
                        `chat/rooms/${roomId}/messages`,
                        {
                            data: { content: `LEAVE-DENIED-${suffix}` },
                        },
                    );

                    expect(readResponse.ok()).toBe(false);
                    expect(sendResponse.ok()).toBe(false);
                    expect(readResponse.status()).not.toBe(401);
                    expect(sendResponse.status()).not.toBe(401);

                    await C!.page.goto("/chat");
                    await expect(
                        C!.page.getByText(roomName, { exact: true }),
                    ).toHaveCount(0, { timeout: 30_000 });
                },
            );
        } finally {
            await closeRoomQuietly(A, roomId);
            await Promise.allSettled(
                sessions.map((session) => closeRealUser(session)),
            );
        }
    },
);
