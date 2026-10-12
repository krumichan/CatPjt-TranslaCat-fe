import { expect, test, installMockAuthCookie } from "../fixtures/mock-test";
import { fulfillApiJson, fulfillJson } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

import {
    mockSupportCenter,
    SUPPORT_RECIPIENT,
} from "./support-center-mocks";

test.describe("고객센터", () => {
    test("SUPPORT-01 사용자가 문의를 작성하면 대기 상태의 상세로 이동한다", async ({ page }, testInfo) => {
        // 준비
        await page.setViewportSize({ width: 1440, height: 1080 });
        const state = await mockSupportCenter(page);
        await page.goto("/support");

        // 실행
        await page.getByRole("button", { name: "문의하기", exact: true }).click();
        await page.getByLabel("제목", { exact: true }).fill("학습 기록을 확인하고 싶어요");
        await page.getByLabel("내용", { exact: true }).fill("지난주에 완료한 학습 기록의 위치를 알려주세요.");
        await page.getByRole("combobox", { name: "분류", exact: true }).selectOption("LEARNING");
        await page.getByRole("button", { name: "문의 등록", exact: true }).click();

        // 검증
        await expect(page.getByRole("heading", { name: "학습 기록을 확인하고 싶어요", exact: true })).toBeVisible();
        await expect.poll(() => state.mutations.find((item) => item.path === "/support/inquiries")?.body).toMatchObject({
            title: "학습 기록을 확인하고 싶어요",
            content: "지난주에 완료한 학습 기록의 위치를 알려주세요.",
            category: "LEARNING",
        });
        expect(state.inquiries[0].status).toBe("WAITING");
        expect(state.unexpectedRequests).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath("support-inquiry-desktop.png"), fullPage: true });
    });

    test("SUPPORT-02 사용자 추가 문의와 종료·재개가 같은 문의에 반영된다", async ({ page }) => {
        // 준비
        const state = await mockSupportCenter(page);
        await page.goto("/support?tab=inquiries&id=11");
        await expect(page.getByText("최근 활동에서 번역 기록을 확인해 주세요.", { exact: true })).toBeVisible();

        // 실행: 추가 질문은 대기 상태로 되돌린다.
        await page.getByTestId("support-reply-101").getByRole("button", { name: "이 답글에 답하기", exact: true }).click();
        await page.getByLabel("추가 문의 내용", { exact: true }).fill("모바일에서도 같은 위치인가요?");
        await page.getByRole("button", { name: "추가 문의 등록", exact: true }).click();

        // 검증
        await expect(page.getByText("모바일에서도 같은 위치인가요?", { exact: true })).toBeVisible();
        expect(state.inquiries[0].status).toBe("WAITING");
        expect(state.inquiries[0].replies.at(-1)?.authorRole).toBe("USER");
        expect(state.inquiries[0].replies.at(-1)?.parentId).toBe(101);

        // 실행: 해결한 문의를 닫았다가 다시 열 수 있다.
        await page.getByRole("button", { name: "해결됐어요", exact: true }).click();
        await expect(page.getByRole("button", { name: "문의 다시 열기", exact: true })).toBeVisible();
        expect(state.inquiries[0].status).toBe("CLOSED");
        await page.getByRole("button", { name: "문의 다시 열기", exact: true }).click();

        // 검증
        await expect(page.getByLabel("추가 문의 내용", { exact: true })).toBeVisible();
        expect(state.inquiries[0].status).toBe("WAITING");
        expect(state.unexpectedRequests).toEqual([]);
    });

    test("SUPPORT-03 일반 사용자는 공지 작성과 개인 메시지 발송을 할 수 없다", async ({ page }) => {
        // 준비
        const state = await mockSupportCenter(page);
        await page.goto("/support?tab=notices");

        // 검증: 관리 기능은 사용자 화면에 노출하지 않는다.
        await expect(page.getByRole("button", { name: /일반 공지 고객센터 이용 안내/ })).toBeVisible();
        await expect(page.getByRole("button", { name: "공지 작성", exact: true })).toHaveCount(0);

        // 실행
        await page.goto("/support?tab=messages");

        // 검증
        await expect(page.getByText("계정 확인 안내", { exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "메시지 작성", exact: true })).toHaveCount(0);
        expect(state.mutations).toEqual([]);
        expect(state.unexpectedRequests).toEqual([]);
    });

    test("SUPPORT-04 ADMIN 답변은 답변 완료 상태로 변경된다", async ({ page, context }) => {
        // 준비
        await installMockAuthCookie(context, "ADMIN");
        const state = await mockSupportCenter(page, { role: "ADMIN" });
        state.inquiries[0].status = "WAITING";
        await page.goto("/support?tab=inquiries&id=11");

        // 실행
        await page.getByLabel("답변 내용", { exact: true }).fill("모바일 메뉴의 최근 활동에서도 확인할 수 있습니다.");
        await page.getByRole("button", { name: "답변 등록", exact: true }).click();

        // 검증
        await expect(page.getByText("모바일 메뉴의 최근 활동에서도 확인할 수 있습니다.", { exact: true })).toBeVisible();
        expect(state.inquiries[0].status).toBe("ANSWERED");
        expect(state.inquiries[0].replies.at(-1)?.authorRole).toBe("ADMIN");
        expect(state.unexpectedRequests).toEqual([]);
    });

    test("SUPPORT-05 ADMIN이 긴급 공지를 작성하고 공지 본문을 확인한다", async ({ page, context }, testInfo) => {
        // 준비
        await page.setViewportSize({ width: 1440, height: 1080 });
        await installMockAuthCookie(context, "ADMIN");
        const state = await mockSupportCenter(page, { role: "ADMIN" });
        await page.goto("/support?tab=notices");

        // 실행
        await page.getByRole("button", { name: "공지 작성", exact: true }).click();
        await page.getByLabel("제목", { exact: true }).fill("학습 서비스 점검 안내");
        await page.getByLabel("내용", { exact: true }).fill("내일 오전 3시에 학습 서비스를 점검합니다.");
        await page.getByRole("radio", { name: "긴급 공지", exact: true }).check();
        await page.screenshot({ path: testInfo.outputPath("support-notice-admin.png"), fullPage: true });
        await page.getByRole("button", { name: "공지 등록", exact: true }).click();

        // 검증
        await expect(page.getByRole("heading", { name: "학습 서비스 점검 안내", exact: true })).toBeVisible();
        await expect.poll(() => state.mutations.find((item) => item.path === "/support/notices")?.body).toEqual({
            title: "학습 서비스 점검 안내",
            content: "내일 오전 3시에 학습 서비스를 점검합니다.",
            noticeType: "URGENT",
        });
        expect(state.unexpectedRequests).toEqual([]);
    });

    test("SUPPORT-06 ADMIN이 검색한 사용자에게 개인 메시지를 보낸다", async ({ page, context }) => {
        // 준비
        await installMockAuthCookie(context, "ADMIN");
        const state = await mockSupportCenter(page, { role: "ADMIN" });
        await page.goto("/support?tab=messages");

        // 실행
        await page.getByRole("button", { name: "메시지 작성", exact: true }).click();
        await page.getByLabel("받는 사용자 검색", { exact: true }).fill(SUPPORT_RECIPIENT.publicId);
        await page.getByRole("button", { name: "검색", exact: true }).click();
        await page.getByRole("button", { name: new RegExp(SUPPORT_RECIPIENT.publicId) }).click();
        await page.getByLabel("제목", { exact: true }).fill("문의 처리 결과 안내");
        await page.getByLabel("내용", { exact: true }).fill("문의하신 내용을 확인했으며 조치를 완료했습니다.");
        await page.getByRole("button", { name: "메시지 보내기", exact: true }).click();

        // 검증
        await expect(page.getByRole("heading", { name: "문의 처리 결과 안내", exact: true })).toBeVisible();
        await expect.poll(() => state.mutations.find((item) => item.path === "/support/messages")?.body).toEqual({
            recipientId: SUPPORT_RECIPIENT.id,
            title: "문의 처리 결과 안내",
            content: "문의하신 내용을 확인했으며 조치를 완료했습니다.",
        });
        expect(state.recipientQueries).toContain(SUPPORT_RECIPIENT.publicId);
        expect(state.unexpectedRequests).toEqual([]);
    });

    test("SUPPORT-07 알림의 답변으로 이동하면 고객센터와 알림 읽음이 동기화된다", async ({ page }) => {
        // 준비
        const state = await mockSupportCenter(page, { withReplyNotification: true });
        await page.goto("/settings");
        const bell = page.getByRole("button", { name: "알림", exact: true });
        await expect(bell).toContainText("1");

        // 실행
        await bell.click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: /활동/ }).click();
        await dialog.getByTestId("support-notification-301").click();

        // 검증: 상세를 읽은 뒤에만 알림 개수가 줄어든다.
        await expect(page).toHaveURL((url) =>
            url.pathname.endsWith("/support") &&
            url.searchParams.get("tab") === "inquiries" &&
            url.searchParams.get("id") === "11" &&
            url.searchParams.get("replyId") === "101" &&
            url.searchParams.get("notificationId") === "301",
        );
        await expect(page.getByText("최근 활동에서 번역 기록을 확인해 주세요.", { exact: true })).toBeVisible();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(bell).not.toContainText("1");
        expect(state.notifications[0].isRead).toBe(true);
        expect(state.unexpectedRequests).toEqual([]);
    });

    test("SUPPORT-08 모바일 메뉴와 우측 사용자 메뉴에서 고객센터에 접근한다", async ({ page }, testInfo) => {
        // 준비
        await page.setViewportSize({ width: 390, height: 844 });
        const state = await mockSupportCenter(page);
        await page.goto("/settings");

        // 실행: 모바일 공용 메뉴의 고객센터 진입점 확인
        await page.getByTestId("mobile-navigation-open").click();
        const drawer = page.getByTestId("app-mobile-navigation-drawer");
        await drawer.getByRole("link", { name: "고객센터", exact: true }).click();

        // 검증
        await expect(page).toHaveURL(/\/support(?:\?.*)?$/);
        await expect(page.getByRole("heading", { name: "고객센터", exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath("support-mobile.png"), fullPage: true });

        // 실행: 우측 메뉴에서도 같은 화면으로 연결한다.
        await page.getByTestId("user-menu-toggle").click();

        // 검증
        await expect(page.getByRole("menuitem", { name: "고객센터", exact: true })).toHaveAttribute("href", /\/support$/);
        expect(state.unexpectedRequests).toEqual([]);
    });

    test("SUPPORT-09 상세를 불러오지 못하면 알림을 읽음으로 바꾸지 않는다", async ({ page }) => {
        // 준비: 목록에 있는 알림의 실제 대상 조회가 실패하는 상황
        const state = await mockSupportCenter(page, { withReplyNotification: true });
        await page.route(/\/support\/inquiries\/11(?:\?.*)?$/, (route) =>
            fulfillApiJson(route, responseDto(null, 404, "문의를 찾을 수 없습니다."), 404),
        );
        await page.goto("/settings");
        const bell = page.getByRole("button", { name: "알림", exact: true });
        await bell.click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: /활동/ }).click();

        // 실행
        const failedDetail = page.waitForResponse((response) =>
            /\/support\/inquiries\/11(?:\?.*)?$/.test(response.url()) && response.status() === 404,
        );
        await dialog.getByTestId("support-notification-301").click();
        await failedDetail;

        // 검증: 상세 확인 실패를 읽음으로 오인하지 않는다.
        await expect(bell).toContainText("1");
        await expect(page.getByTestId("support-reply-101")).toHaveCount(0);
        expect(state.notifications[0].isRead).toBe(false);
        expect(state.mutations).toEqual([]);
    });

    test("SUPPORT-10 ADMIN 이외의 역할에는 관리자 작성 화면을 제공하지 않는다", async ({ page }) => {
        // 준비: 알 수 없는 역할도 일반 사용자와 같은 화면 권한을 가진다.
        const state = await mockSupportCenter(page);
        await page.route("**/api/auth/session", (route) =>
            fulfillJson(route, {
                user: {
                    name: TEST_USERS.A.nickname,
                    email: TEST_USERS.A.email,
                    role: "OPERATOR",
                    publicId: TEST_USERS.A.publicId,
                    accessTokenExpires: Date.now() + 3_600_000,
                },
                accessToken: "mock-access-token-A",
                expires: new Date(Date.now() + 3_600_000).toISOString(),
            }),
        );

        // 실행: URL을 직접 열어도 관리자 폼은 나타나지 않는다.
        await page.goto("/support?tab=notices&view=new");

        // 검증
        await expect(page.getByRole("heading", { name: "고객센터", exact: true })).toBeVisible();
        await expect(page.getByLabel("제목", { exact: true })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "공지 등록", exact: true })).toHaveCount(0);
        expect(state.mutations).toEqual([]);
        expect(state.unexpectedRequests).toEqual([]);
    });

    test("SUPPORT-11 받은 메시지에서 시작한 문의는 원래 메시지를 연결한다", async ({ page }) => {
        // 준비
        const state = await mockSupportCenter(page);
        await page.goto("/support?tab=messages&id=31");
        await expect(page.getByRole("heading", { name: "계정 확인 안내", exact: true })).toBeVisible();

        // 실행
        await page.getByRole("button", { name: "이 메시지에 대해 문의하기", exact: true }).click();
        await page.getByLabel("제목", { exact: true }).fill("계정 확인 안내에 대한 추가 문의");
        await page.getByLabel("내용", { exact: true }).fill("어떤 계정 설정을 확인해야 하나요?");
        await page.getByRole("button", { name: "문의 등록", exact: true }).click();

        // 검증: 개인 메시지에 답장을 붙이지 않고 연결된 문의를 만든다.
        await expect(page.getByRole("heading", { name: "계정 확인 안내에 대한 추가 문의", exact: true })).toBeVisible();
        await expect.poll(() => state.mutations.find((item) => item.path === "/support/inquiries")?.body.relatedMessageId).toBe(31);
        expect(state.messages[0].readAt).not.toBeNull();
        expect(state.unexpectedRequests).toEqual([]);
    });

    test("SUPPORT-12 이미 보는 공지의 새 알림을 열면 본문을 다시 읽고 알림을 갱신한다", async ({ page }) => {
        // 준비: 같은 공지의 이전 알림으로 들어온 상세 화면을 유지한다.
        const state = await mockSupportCenter(page);
        await page.goto("/support?tab=notices&id=21&notificationId=300");
        await expect(page.getByText("문의는 고객센터에서 작성할 수 있습니다.", { exact: true })).toBeVisible();

        // 실행: 관리자가 공지를 바꾸어 같은 대상의 새 알림이 도착한다.
        state.notices[0].content = "점검 시간이 변경되었습니다. 오전 4시에 다시 이용해 주세요.";
        state.notices[0].noticeType = "URGENT";
        state.notifications.push({
            id: 302,
            type: "SUPPORT_NOTICE",
            title: "고객센터 이용 안내가 변경되었습니다.",
            targetType: "NOTICE",
            targetId: 21,
            replyId: null,
            isRead: false,
            readAt: null,
            createdAt: "2026-10-11T10:00:00",
        });
        const bell = page.getByRole("button", { name: "알림", exact: true });
        await bell.click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: /활동/ }).click();
        await expect(bell).toContainText("1");

        // 실행: 대상 ID가 같더라도 새 알림 ID는 상세 재조회를 발생시킨다.
        const refreshedDetail = page.waitForResponse((response) =>
            /\/support\/notices\/21(?:\?.*)?$/.test(response.url()) && response.status() === 200,
        );
        await dialog.getByTestId("support-notification-302").click();
        await refreshedDetail;

        // 검증: 새 본문을 실제로 확인한 뒤에만 배지가 줄어든다.
        await expect(page).toHaveURL((url) =>
            url.pathname.endsWith("/support") &&
            url.searchParams.get("tab") === "notices" &&
            url.searchParams.get("id") === "21" &&
            url.searchParams.get("notificationId") === "302",
        );
        await expect(page.getByText("점검 시간이 변경되었습니다. 오전 4시에 다시 이용해 주세요.", { exact: true })).toBeVisible();
        await expect(bell).not.toContainText("1");
        expect(state.notifications[0].isRead).toBe(true);
        expect(state.unexpectedRequests).toEqual([]);
    });
});
