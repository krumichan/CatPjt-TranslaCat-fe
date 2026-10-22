import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    mockAuthenticatedSession,
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

const ROOM_ID = 901;
const createdAt = "2026-10-22T00:00:00.000Z";

function makeInvitation(id: number, roomId = ROOM_ID) {
    return {
        id,
        notificationType: "CHAT_INVITATION",
        roomId,
        payload: {
            schemaVersion: 1,
            invitationKind: "OPEN_LINK",
            roomType: "OPEN",
            roomName: "초대받은 OPEN 방",
            inviterOpenNickname: "방고양이",
            inviterMemberCode: "OC-INVITER",
            redirectUrl: "https://example.invalid/should-not-open",
        },
        isRead: false,
        readAt: null,
        createdAt,
    };
}

test.describe("OPEN chat ID invitations", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("OPEN-ID-01 활성 멤버가 ID별 requestId를 보존하고 결과불명 요청을 수동 재시도한다", async ({ page }) => {
        // 준비: MEMBER도 송신할 수 있으며 첫 요청은 결과불명 네트워크 실패로 만든다.
        const member = makeOpenChatProfile({
            openChatMemberId: 9012,
            memberCode: "OC-MEMBER",
            nickname: "참여 멤버",
            role: "MEMBER",
        });
        await mockChatRoomBase(page, {
            room: makeRoom({
                id: ROOM_ID,
                roomType: "OPEN",
                sourceType: "OPEN",
                name: "송신 테스트방",
                myRole: "MEMBER",
                ownerId: null,
            }),
            messages: [],
        });
        await page.route(new RegExp(`/chat/open-rooms/${ROOM_ID}/me/profile$`), (route) =>
            fulfillApiJson(route, responseDto(member)),
        );
        await page.route(new RegExp(`/chat/open-rooms/${ROOM_ID}/members$`), (route) =>
            fulfillApiJson(route, responseDto({ members: [member] })),
        );
        const sent: Array<{ targetPublicId: string; requestId: string }> = [];
        await page.route(new RegExp(`/chat/open-rooms/${ROOM_ID}/invitations$`), (route) => {
            const body = route.request().postDataJSON() as { targetPublicId: string; requestId: string };
            sent.push(body);
            return sent.length === 1
                ? route.abort("failed")
                : fulfillApiJson(route, responseDto({
                    invitationId: 81,
                    roomId: sent.length === 2 ? ROOM_ID + 1 : ROOM_ID,
                    createdAt,
                    duplicate: sent.length === 4,
                }));
        });

        // 실행: A 결과불명 뒤 B의 잘못된 응답을 거절하고, B 성공 후 A를 다시 시도한다.
        await page.goto(`/ko/chat/rooms/${ROOM_ID}`);
        await page.getByTestId("chat-room-menu-button").click();
        await page.getByTestId("open-chat-invite-by-id-button").click();
        const dialog = page.getByTestId("open-chat-id-invitation-dialog");
        await page.getByTestId("open-chat-invite-public-id").fill(" legacy.Case_42 ");
        await page.getByTestId("open-chat-id-invitation-submit").click();
        await expect(dialog.getByRole("alert")).toContainText("초대 전송에 실패했습니다");
        expect(sent).toHaveLength(1);

        // 결과불명 상태에서 방 컴포넌트를 떠났다가 같은 로그인 세션으로 다시 연다.
        await dialog.getByRole("button", { name: "초대 창 닫기" }).click();
        await page.getByRole("link", { name: "채팅방 목록으로 돌아가기" }).click();
        await expect(page).toHaveURL(/\/ko\/chat$/);
        await page.goBack();
        await expect(page).toHaveURL(new RegExp(`/ko/chat/rooms/${ROOM_ID}$`));
        await page.getByTestId("chat-room-menu-button").click();
        await page.getByTestId("open-chat-invite-by-id-button").click();

        await page.getByTestId("open-chat-invite-public-id").fill("cat-5678");
        await page.getByTestId("open-chat-id-invitation-submit").click();
        await expect(dialog.getByRole("alert")).toContainText("초대 전송에 실패했습니다");
        await expect(page.getByTestId("open-chat-invite-public-id")).toHaveValue("cat-5678");
        await page.getByTestId("open-chat-id-invitation-submit").click();
        await expect(dialog.getByRole("status")).toContainText("초대를 보냈습니다");
        await page.getByTestId("open-chat-invite-public-id").fill("legacy.Case_42");
        await page.getByTestId("open-chat-id-invitation-submit").click();

        // 검증: 잘못된 성공 응답도 시도를 지우지 않고 A/B 각각 UUID를 유지한다.
        await expect(dialog.getByRole("status")).toContainText("이미 전송된 초대입니다");
        expect(sent).toHaveLength(4);
        expect(sent[0].targetPublicId).toBe("legacy.Case_42");
        expect(sent[1].targetPublicId).toBe("cat-5678");
        expect(sent[1].requestId).not.toBe(sent[0].requestId);
        expect(sent[2].requestId).toBe(sent[1].requestId);
        expect(sent[3].requestId).toBe(sent[0].requestId);
        expect(sent[0].requestId).toMatch(/^[0-9a-f-]{36}$/i);
    });

    test("OPEN-ID-02 수신함은 페이지 조회·읽음·검증된 OPEN 미리보기를 제공한다", async ({ page }) => {
        // 준비: 두 페이지의 합성 초대와 서버 읽음 상태를 돌려준다.
        const invitation = makeInvitation(81);
        const older = makeInvitation(80, 902);
        let readCount = 0;
        await page.route(/\/chat\/open-invitations\/summary$/, (route) =>
            fulfillApiJson(route, responseDto({
                unreadCount: readCount === 0 ? 2 : 1,
                latestInvitation: invitation,
            })),
        );
        await page.route(/\/chat\/open-invitations(?:\?.*)?$/, (route) => {
            const cursor = new URL(route.request().url()).searchParams.get("cursorId");
            return fulfillApiJson(route, responseDto(cursor === "81"
                ? { items: [older], nextCursorId: null, hasNext: false }
                : { items: [invitation], nextCursorId: 81, hasNext: true }));
        });
        await page.route(/\/chat\/open-invitations\/81\/read$/, (route) => {
            readCount += 1;
            return fulfillApiJson(route, responseDto({
                ...invitation,
                isRead: true,
                readAt: createdAt,
            }));
        });

        // 실행: 허브의 별도 수신함에 들어가 이전 초대를 더 불러온 뒤 미리본다.
        await page.goto("/ko/chat");
        await expect(page.getByTestId("open-chat-invitation-inbox-link")).toContainText("2");
        await page.getByTestId("open-chat-invitation-inbox-link").click();
        await expect(page.getByTestId("open-invitation-81")).toContainText("방고양이");
        await expect(page.getByTestId("open-invitation-81")).toContainText("OC-INVITER");
        await page.getByRole("button", { name: "이전 초대 더 보기" }).click();
        await expect(page.getByTestId("open-invitation-80")).toBeVisible();
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await expect(page.getByTestId("open-invitation-80")).toBeVisible();
        await page.getByTestId("open-invitation-81").getByRole("button", { name: "방 미리보기" }).click();

        // 검증: 전용 PATCH 후 payload URL이 아닌 숫자 roomId의 OPEN 상세로 이동한다.
        await expect(page).toHaveURL(new RegExp(`/ko/chat/open/${ROOM_ID}$`));
        expect(readCount).toBe(1);
    });

    test("OPEN-ID-03 계정 전환 뒤 이전 GET의 늦은 401은 새 계정 초대와 인증을 건드리지 않는다", async ({ page }) => {
        // 준비: A의 두 번째 조회만 보류하고 B의 조회는 즉시 반환한다.
        const invitationA = makeInvitation(81);
        const invitationB = makeInvitation(82, 902);
        let currentAccount: "A" | "B" = "A";
        let holdNextARequest = false;
        let releaseARequest: () => void = () => {};
        let signalARequest: (() => void) | null = null;
        const aRequestStarted = new Promise<void>((resolve) => {
            signalARequest = resolve;
        });
        await page.route(/\/chat\/open-invitations(?:\?.*)?$/, async (route) => {
            if (currentAccount === "A" && holdNextARequest) {
                holdNextARequest = false;
                signalARequest?.();
                await new Promise<void>((resolve) => {
                    releaseARequest = resolve;
                });
                return fulfillApiJson(
                    route,
                    errorDto("OPEN_INVITATION_NOT_ALLOWED"),
                    401,
                );
            }

            return fulfillApiJson(route, responseDto({
                items: [currentAccount === "A" ? invitationA : invitationB],
                nextCursorId: null,
                hasNext: false,
            }));
        });

        // 실행: A의 갱신을 대기시킨 뒤 세션 응답을 B로 바꾸고 전경 갱신한다.
        await page.goto("/ko/chat/open/invitations");
        await expect(page.getByTestId("open-invitation-81")).toBeVisible();
        holdNextARequest = true;
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await aRequestStarted;

        currentAccount = "B";
        await mockAuthenticatedSession(page, TEST_USERS.B);
        await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
        await expect(page.getByTestId("open-invitation-82")).toBeVisible();
        const lateUnauthorized = page.waitForResponse((response) =>
            response.url().includes("/chat/open-invitations?") &&
            response.status() === 401,
        );
        releaseARequest();
        await lateUnauthorized;
        await page.waitForTimeout(300);

        // 검증: A의 늦은 인증 실패가 B의 카드나 로그인 화면을 바꾸지 않는다.
        await expect(page.getByTestId("open-invitation-81")).toHaveCount(0);
        await expect(page.getByTestId("open-invitation-82")).toBeVisible();
        await expect(page).toHaveURL(/\/ko\/chat\/open\/invitations$/);
    });

    test("OPEN-ID-04 계정 전환 중 이전 읽음 결과는 새 계정 카드를 변경하지 않는다", async ({ page }) => {
        // 준비: A 읽음 PATCH만 보류하고 새 계정 B는 별도 초대를 가진다.
        const invitationA = makeInvitation(81);
        const invitationB = makeInvitation(82, 902);
        let currentAccount: "A" | "B" = "A";
        let releaseRead: () => void = () => {};
        let signalRead: (() => void) | null = null;
        const readStarted = new Promise<void>((resolve) => {
            signalRead = resolve;
        });
        await page.route(/\/chat\/open-invitations(?:\?.*)?$/, (route) =>
            fulfillApiJson(route, responseDto({
                items: [currentAccount === "A" ? invitationA : invitationB],
                nextCursorId: null,
                hasNext: false,
            })),
        );
        await page.route(/\/chat\/open-invitations\/81\/read$/, async (route) => {
            signalRead?.();
            await new Promise<void>((resolve) => {
                releaseRead = resolve;
            });
            return fulfillApiJson(route, responseDto({
                ...invitationA,
                isRead: true,
                readAt: createdAt,
            }));
        });

        // 실행: A의 읽음 중 B로 전환하고, B가 표시된 다음 A의 응답을 풀어준다.
        await page.goto("/ko/chat/open/invitations");
        await expect(page.getByTestId("open-invitation-81")).toBeVisible();
        await page.getByTestId("open-invitation-81")
            .getByRole("button", { name: "읽음 처리" })
            .click();
        await readStarted;

        currentAccount = "B";
        await mockAuthenticatedSession(page, TEST_USERS.B);
        await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
        await expect(page.getByTestId("open-invitation-82")).toBeVisible();
        const lateRead = page.waitForResponse((response) =>
            response.url().endsWith("/chat/open-invitations/81/read") &&
            response.status() === 200,
        );
        releaseRead();
        await lateRead;

        // 검증: B의 읽지 않은 초대와 읽음 버튼이 남고 A 카드는 나타나지 않는다.
        await expect(page.getByTestId("open-invitation-81")).toHaveCount(0);
        await expect(
            page.getByTestId("open-invitation-82")
                .getByRole("button", { name: "읽음 처리" }),
        ).toBeVisible();
    });

    test("OPEN-ID-05 더 보기 중 전경 갱신이 와도 펼친 페이지를 보존한다", async ({ page }) => {
        // 준비: 두 번째 페이지 응답을 보류해 그 사이에 전경 갱신을 끼워 넣는다.
        const invitation = makeInvitation(81);
        const older = makeInvitation(80, 902);
        let firstPageCalls = 0;
        let holdOlder = true;
        let releaseOlder: () => void = () => {};
        let signalOlder: (() => void) | null = null;
        const olderStarted = new Promise<void>((resolve) => {
            signalOlder = resolve;
        });
        await page.route(/\/chat\/open-invitations(?:\?.*)?$/, async (route) => {
            const cursor = new URL(route.request().url()).searchParams.get("cursorId");
            if (cursor === "81") {
                if (holdOlder) {
                    holdOlder = false;
                    signalOlder?.();
                    await new Promise<void>((resolve) => {
                        releaseOlder = resolve;
                    });
                }
                return fulfillApiJson(route, responseDto({
                    items: [older],
                    nextCursorId: null,
                    hasNext: false,
                }));
            }

            firstPageCalls += 1;
            return fulfillApiJson(route, responseDto({
                items: [invitation],
                nextCursorId: 81,
                hasNext: true,
            }));
        });

        // 실행: 더 보기 요청 중 focus 갱신을 예약한 뒤 응답을 완료한다.
        await page.goto("/ko/chat/open/invitations");
        await expect(page.getByTestId("open-invitation-81")).toBeVisible();
        await page.getByRole("button", { name: "이전 초대 더 보기" }).click();
        await olderStarted;
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        releaseOlder();

        // 검증: 예약된 갱신이 첫 페이지부터 재조회해도 두 카드가 유지된다.
        await expect.poll(() => firstPageCalls).toBeGreaterThan(1);
        await expect(page.getByTestId("open-invitation-81")).toBeVisible();
        await expect(page.getByTestId("open-invitation-80")).toBeVisible();
    });
});
