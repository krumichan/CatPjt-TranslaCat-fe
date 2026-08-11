import { expect, test } from "@playwright/test";

import { TEST_USERS } from "../support/test-users";
import {
    cleanupRelations,
    closeRealUser,
    openRealUser,
    REAL_E2E_ENABLED,
    RESET_REAL_STATE,
    waitForUrlRoomId,
    type RealUserSession,
} from "./real-support";

test.describe.configure({ mode: "serial" });

test.skip(
    !REAL_E2E_ENABLED,
    "Set E2E_REAL=1 and prepare A/B/C auth states to run real integration tests.",
);

/**
 * 친구 요청 수락
 *
 * receiver 사용자가 친구 페이지의 알림 센터에서
 * requesterPublicId 사용자의 친구 요청을 찾아 수락한다.
 */
async function acceptFriendRequest(
    receiver: RealUserSession,
    requesterPublicId: string,
): Promise<void> {
    await receiver.page.goto("/friends");

    await receiver.page
        .getByRole("button", {
            name: "알림",
            exact: true,
        })
        .click();

    const dialog = receiver.page.getByRole("dialog");
    await dialog.getByRole("button", { name: /초대/ }).click();

    await expect(
        dialog.getByText(requesterPublicId),
    ).toBeVisible({
        timeout: 20_000,
    });

    const requestItem = dialog
        .locator("article")
        .filter({
            hasText: requesterPublicId,
        });

    await expect(requestItem).toBeVisible({
        timeout: 20_000,
    });

    await requestItem
        .getByRole("button", {
            name: "수락",
            exact: true,
        })
        .click();

    /**
     * 수락 API 처리 및 알림 목록 갱신 완료 대기.
     *
     * click 직후 바로 상대방 친구 목록 페이지로 이동하면,
     * 친구 관계 생성 트랜잭션 완료 전에 목록 API가 호출될 가능성이 있으므로
     * 수락 요청 항목이 실제로 제거될 때까지 기다린다.
     */
    await expect(
        dialog.getByText(requesterPublicId),
    ).toBeHidden({
        timeout: 20_000,
    });
}

test(
    "FLOW-01~04 Phase 1.5 실제 3사용자 Social + Chat 전체 흐름",
    async ({ browser }) => {
        test.setTimeout(8 * 60 * 1000);

        const sessions: RealUserSession[] = [];

        let A: RealUserSession | undefined;
        let B: RealUserSession | undefined;
        let C: RealUserSession | undefined;

        try {
            /**
             * ============================================================
             * 테스트 사용자 세션 준비
             * ============================================================
             */

            A = await openRealUser(browser, "A");
            sessions.push(A);

            B = await openRealUser(browser, "B");
            sessions.push(B);

            C = await openRealUser(browser, "C");
            sessions.push(C);

            /**
             * ============================================================
             * 테스트 시작 전 관계 초기화
             * ============================================================
             */

            if (RESET_REAL_STATE) {
                await cleanupRelations(sessions);
            }

            /**
             * ============================================================
             * FLOW-01
             * A → B 친구 요청
             * ============================================================
             */

            await test.step(
                "A가 B를 publicId로 검색하고 친구 요청",
                async () => {
                    await A!.page.goto("/friends/search");

                    await A!.page
                        .locator("#publicId")
                        .fill(TEST_USERS.B.publicId);

                    await A!.page
                        .getByRole("button", {
                            name: "검색",
                            exact: true,
                        })
                        .click();

                    await expect(
                        A!.page.getByText(TEST_USERS.B.publicId),
                    ).toBeVisible({
                        timeout: 20_000,
                    });

                    await A!.page
                        .getByRole("button", {
                            name: "친구 요청 보내기",
                            exact: true,
                        })
                        .click();

                    await expect(
                        A!.page.getByText(
                            "친구 요청을 보냈습니다.",
                            {
                                exact: true,
                            },
                        ),
                    ).toBeVisible({
                        timeout: 20_000,
                    });
                },
            );

            /**
             * ============================================================
             * FLOW-01
             * B → A 친구 요청 수락
             * ============================================================
             */

            await test.step(
                "B가 알림 센터에서 A의 요청을 수락",
                async () => {
                    await acceptFriendRequest(
                        B!,
                        TEST_USERS.A.publicId,
                    );
                },
            );

            /**
             * ============================================================
             * FLOW-01
             * A/B 친구 목록 확인
             * ============================================================
             */

            await test.step(
                "A/B 친구 목록에 서로 표시",
                async () => {
                    await A!.page.goto("/friends");

                    await expect(
                        A!.page.getByText(
                            TEST_USERS.B.publicId,
                        ),
                    ).toBeVisible({
                        timeout: 20_000,
                    });

                    await B!.page.goto("/friends");

                    await expect(
                        B!.page.getByText(
                            TEST_USERS.A.publicId,
                        ),
                    ).toBeVisible({
                        timeout: 20_000,
                    });
                },
            );

            /**
             * ============================================================
             * FLOW-02
             * FRIEND DIRECT
             * ============================================================
             */

            await test.step(
                "A가 B와 FRIEND DIRECT 시작하고 B가 같은 방에서 메시지 수신",
                async () => {
                    const friendBCard = A!.page
                        .locator("article")
                        .filter({
                            hasText: TEST_USERS.B.publicId,
                        });

                    await expect(friendBCard).toBeVisible({
                        timeout: 20_000,
                    });

                    await friendBCard
                        .getByRole("button", {
                            name: "1:1 채팅",
                            exact: true,
                        })
                        .click();

                    const directRoomId =
                        await waitForUrlRoomId(A!.page);

                    await B!.page.goto(
                        `/chat/rooms/${directRoomId}`,
                    );

                    await expect(
                        B!.page.getByPlaceholder(
                            "메시지를 입력하세요",
                        ),
                    ).toBeVisible({
                        timeout: 30_000,
                    });

                    const unique =
                        `E2E-DIRECT-${Date.now()}`;

                    await A!.page
                        .getByPlaceholder(
                            "메시지를 입력하세요",
                        )
                        .fill(unique);

                    await A!.page
                        .getByRole("button", {
                            name: "메시지 전송",
                        })
                        .click();

                    await expect(
                        B!.page.getByText(unique),
                    ).toBeVisible({
                        timeout: 30_000,
                    });
                },
            );

            /**
             * ============================================================
             * FLOW-03 준비
             * A ↔ C 친구 관계 생성
             * ============================================================
             */

            await test.step(
                "A와 C도 친구 관계 생성",
                async () => {
                    await A!.page.goto("/friends/search");

                    await A!.page
                        .locator("#publicId")
                        .fill(TEST_USERS.C.publicId);

                    await A!.page
                        .getByRole("button", {
                            name: "검색",
                            exact: true,
                        })
                        .click();

                    await expect(
                        A!.page.getByText(
                            TEST_USERS.C.publicId,
                        ),
                    ).toBeVisible({
                        timeout: 20_000,
                    });

                    await A!.page
                        .getByRole("button", {
                            name: "친구 요청 보내기",
                            exact: true,
                        })
                        .click();

                    await expect(
                        A!.page.getByText(
                            "친구 요청을 보냈습니다.",
                            {
                                exact: true,
                            },
                        ),
                    ).toBeVisible({
                        timeout: 20_000,
                    });

                    await acceptFriendRequest(
                        C!,
                        TEST_USERS.A.publicId,
                    );

                    await A!.page.goto("/friends");

                    await expect(
                        A!.page.getByText(
                            TEST_USERS.C.publicId,
                        ),
                    ).toBeVisible({
                        timeout: 20_000,
                    });

                    await C!.page.goto("/friends");

                    await expect(
                        C!.page.getByText(
                            TEST_USERS.A.publicId,
                        ),
                    ).toBeVisible({
                        timeout: 20_000,
                    });
                },
            );

            /**
             * ============================================================
             * FLOW-03
             * FRIEND GROUP
             * ============================================================
             */

            await test.step(
                "A가 B/C 그룹을 만들고 멤버가 메시지를 수신",
                async () => {
                    await A!.page.goto("/friends");

                    await expect(
                        A!.page.getByText(
                            TEST_USERS.B.publicId,
                        ),
                    ).toBeVisible({
                        timeout: 20_000,
                    });

                    await expect(
                        A!.page.getByText(
                            TEST_USERS.C.publicId,
                        ),
                    ).toBeVisible({
                        timeout: 20_000,
                    });

                    await A!.page
                        .getByRole("button", {
                            name: "그룹 선택",
                            exact: true,
                        })
                        .click();

                    const friendBCard = A!.page
                        .locator("article")
                        .filter({
                            hasText: TEST_USERS.B.publicId,
                        });

                    const friendCCard = A!.page
                        .locator("article")
                        .filter({
                            hasText: TEST_USERS.C.publicId,
                        });

                    await expect(friendBCard).toBeVisible({
                        timeout: 20_000,
                    });

                    await expect(friendCCard).toBeVisible({
                        timeout: 20_000,
                    });

                    await friendBCard
                        .getByRole("button", {
                            name: /선택$/,
                        })
                        .click();

                    await friendCCard
                        .getByRole("button", {
                            name: /선택$/,
                        })
                        .click();

                    await A!.page
                        .getByRole("button", {
                            name: "그룹 만들기 (2)",
                            exact: true,
                        })
                        .click();

                    const groupName =
                        `E2E-GROUP-${Date.now()}`;

                    await A!.page
                        .getByPlaceholder(
                            "예: 주말 일본어 공부방",
                        )
                        .fill(groupName);

                    await A!.page
                        .getByRole("button", {
                            name: "그룹 채팅 만들기",
                            exact: true,
                        })
                        .click();

                    const groupRoomId =
                        await waitForUrlRoomId(A!.page);

                    await B!.page.goto(
                        `/chat/rooms/${groupRoomId}`,
                    );

                    await C!.page.goto(
                        `/chat/rooms/${groupRoomId}`,
                    );

                    await expect(
                        B!.page.getByPlaceholder(
                            "메시지를 입력하세요",
                        ),
                    ).toBeVisible({
                        timeout: 30_000,
                    });

                    await expect(
                        C!.page.getByPlaceholder(
                            "메시지를 입력하세요",
                        ),
                    ).toBeVisible({
                        timeout: 30_000,
                    });

                    const unique =
                        `E2E-GROUP-MSG-${Date.now()}`;

                    await A!.page
                        .getByPlaceholder(
                            "메시지를 입력하세요",
                        )
                        .fill(unique);

                    await A!.page
                        .getByRole("button", {
                            name: "메시지 전송",
                        })
                        .click();

                    await expect(
                        B!.page.getByText(unique),
                    ).toBeVisible({
                        timeout: 30_000,
                    });

                    await expect(
                        C!.page.getByText(unique),
                    ).toBeVisible({
                        timeout: 30_000,
                    });
                },
            );

            /**
             * ============================================================
             * FLOW-04
             * 친구 차단
             * ============================================================
             */

            await test.step(
                "A가 C를 차단하고 친구 목록에서 제외되는지 확인",
                async () => {
                    await A!.page.goto("/friends");

                    const friendCCard = A!.page
                        .locator("article")
                        .filter({
                            hasText: TEST_USERS.C.publicId,
                        });

                    await expect(friendCCard).toBeVisible({
                        timeout: 20_000,
                    });

                    await friendCCard
                        .getByRole("button", {
                            name: "친구 메뉴",
                            exact: true,
                        })
                        .click();

                    await friendCCard
                        .getByRole("button", {
                            name: "차단",
                            exact: true,
                        })
                        .click();

                    const blockDialog =
                        A!.page.getByRole("dialog");

                    await blockDialog
                        .getByRole("button", {
                            name: "차단",
                            exact: true,
                        })
                        .click();

                    await expect(
                        A!.page
                            .locator("article")
                            .filter({
                                hasText:
                                    TEST_USERS.C.publicId,
                            }),
                    ).toHaveCount(0, {
                        timeout: 20_000,
                    });
                },
            );
        } finally {
            if (RESET_REAL_STATE && sessions.length > 0) {
                try {
                    await cleanupRelations(sessions);
                } catch (error) {
                    console.error(
                        "E2E cleanup failed",
                        error,
                    );
                }
            }

            await Promise.allSettled(
                sessions.map((session) =>
                    closeRealUser(session),
                ),
            );
        }
    },
);
