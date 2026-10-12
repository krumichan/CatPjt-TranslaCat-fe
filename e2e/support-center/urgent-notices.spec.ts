import { expect, installMockAuthCookie, test } from "../fixtures/mock-test";
import { TEST_USERS } from "../support/test-users";
import { createUrgentNoticeStore, holdUrgentRequest, mockUrgentNotices, urgentNotice } from "./urgent-notices-mocks";

test.describe("긴급 공지 로그인 안내", () => {
    test("URGENT-01 일반 공지는 로그인 팝업에 표시하지 않는다", async ({ page }) => {
        // 준비
        const store = createUrgentNoticeStore([urgentNotice(40, "NORMAL")]);
        await mockUrgentNotices(page, store);

        // 실행
        await page.goto("/support?tab=notices");

        // 검증
        await expect.poll(() => store.loads.length).toBeGreaterThan(0);
        await expect(page.getByTestId("urgent-notice-modal")).toHaveCount(0);
        expect(store.dismissals).toEqual([]);
    });

    test("URGENT-02 닫기는 같은 로그인에서 이동·새로고침·다른 탭에도 유지된다", async ({ page, context }) => {
        // 준비: 같은 로그인으로 두 탭에서 공지를 연다.
        const store = createUrgentNoticeStore();
        await mockUrgentNotices(page, store);
        const secondPage = await context.newPage();
        await mockUrgentNotices(secondPage, store);
        await page.goto("/settings");
        await secondPage.goto("/settings");
        await expect(page.getByTestId("urgent-notice-modal")).toBeVisible();
        await expect(secondPage.getByTestId("urgent-notice-modal")).toBeVisible();

        // 실행
        await page.getByTestId("urgent-notice-modal").getByRole("button", { name: "닫기", exact: true }).click();

        // 검증: 영구 저장 요청 없이 열린 다른 탭에도 닫힘을 전달한다.
        await expect(secondPage.getByTestId("urgent-notice-modal")).toHaveCount(0);
        await page.reload();
        await page.goto("/support?tab=notices");
        await expect(page.getByTestId("urgent-notice-modal")).toHaveCount(0);
        const thirdPage = await context.newPage();
        await mockUrgentNotices(thirdPage, store);
        await thirdPage.goto("/settings");
        await expect.poll(() => store.loads.length).toBeGreaterThan(2);
        await expect(thirdPage.getByTestId("urgent-notice-modal")).toHaveCount(0);
        expect(store.dismissals).toEqual([]);
    });

    test("URGENT-03 닫은 공지는 실제 로그아웃 후 같은 계정 새 로그인에서 다시 표시된다", async ({ page }) => {
        // 준비
        const store = createUrgentNoticeStore();
        const auth = await mockUrgentNotices(page, store);
        await page.goto("/settings");
        await page.getByTestId("urgent-notice-modal").getByRole("button", { name: "닫기", exact: true }).click();

        // 실행: 로그아웃은 실제 NextAuth 경로로 쿠키를 제거한다.
        auth.session.authenticated = false;
        await page.getByTestId("user-menu-toggle").click();
        await page.getByRole("menuitem", { name: "로그아웃", exact: true }).click();
        await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
        await auth.changeLogin(TEST_USERS.A, "urgent-login-two");
        await page.goto("/settings");

        // 검증
        await expect(page.getByTestId("urgent-notice-modal")).toBeVisible();
        expect(store.dismissals).toEqual([]);
    });

    test("URGENT-04 그만 보기는 재로그인·새 기기에도 유지되고 다른 사용자에게 적용되지 않는다", async ({ page, browser, baseURL }) => {
        // 준비
        const store = createUrgentNoticeStore();
        const auth = await mockUrgentNotices(page, store);
        await page.goto("/settings");

        // 실행
        await page.getByTestId("urgent-notice-modal").getByRole("button", { name: "그만 보기", exact: true }).click();
        await expect(page.getByTestId("urgent-notice-modal")).toHaveCount(0);
        await auth.changeLogin(TEST_USERS.A, "urgent-after-dismiss");
        await page.reload();
        await expect.poll(() => store.loads.length).toBeGreaterThan(1);
        await expect(page.getByTestId("urgent-notice-modal")).toHaveCount(0);

        // 실행: 저장소가 전혀 없는 다른 브라우저 context에서도 서버 설정을 적용한다.
        const otherDevice = await browser.newContext({ baseURL });
        try {
            await installMockAuthCookie(otherDevice, "USER", { loginSessionId: "urgent-other-device" });
            const otherPage = await otherDevice.newPage();
            const otherAuth = await mockUrgentNotices(otherPage, store);
            await otherPage.goto("/settings");
            await expect.poll(() => store.loads.length).toBeGreaterThan(2);
            await expect(otherPage.getByTestId("urgent-notice-modal")).toHaveCount(0);

            // 검증: 같은 기기에서 다른 계정은 자신의 공지를 계속 볼 수 있다.
            await otherAuth.changeLogin(TEST_USERS.B, "urgent-user-b");
            await otherPage.reload();
            await expect(otherPage.getByTestId("urgent-notice-modal")).toBeVisible();
            expect(store.dismissedByUser.get(TEST_USERS.A.publicId)?.has(41)).toBe(true);
            expect(store.dismissedByUser.get(TEST_USERS.B.publicId)?.has(41)).not.toBe(true);
        } finally {
            await otherDevice.close();
        }
    });

    test("URGENT-05 여러 긴급 공지는 순서대로 처리하며 일반 공지는 끼어들지 않는다", async ({ page }, testInfo) => {
        // 준비
        const store = createUrgentNoticeStore([urgentNotice(40), urgentNotice(41), urgentNotice(42, "NORMAL")]);
        await mockUrgentNotices(page, store);
        await page.goto("/settings");
        const modal = page.getByTestId("urgent-notice-modal");
        await expect(modal.getByRole("heading", { name: "서비스 점검 안내 41", exact: true })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath("urgent-login-modal.png"), fullPage: true });

        // 실행
        await modal.getByRole("button", { name: "닫기", exact: true }).click();
        await expect(modal.getByRole("heading", { name: "서비스 점검 안내 40", exact: true })).toBeVisible();
        await modal.getByRole("button", { name: "그만 보기", exact: true }).click();

        // 검증
        await expect(modal).toHaveCount(0);
        expect(store.dismissals).toEqual([{ user: TEST_USERS.A.publicId, id: 40 }]);
    });

    test("URGENT-06 영구 숨김 저장 실패는 팝업을 유지하고 다시 시도할 수 있다", async ({ page }) => {
        // 준비
        const store = createUrgentNoticeStore();
        store.failedDismissalsRemaining = 1;
        await mockUrgentNotices(page, store);
        await page.goto("/settings");
        const modal = page.getByTestId("urgent-notice-modal");

        // 실행 및 검증: 실패한 설정은 닫힘으로 저장하지 않는다.
        await modal.getByRole("button", { name: "그만 보기", exact: true }).click();
        await expect(modal.getByRole("alert")).toContainText("설정을 저장하지 못했어요");
        await expect(modal).toBeVisible();
        expect(store.dismissedByUser.get(TEST_USERS.A.publicId)?.has(41)).not.toBe(true);

        // 실행 및 검증: 재시도가 저장되면 팝업을 닫는다.
        await modal.getByRole("button", { name: "그만 보기", exact: true }).click();
        await expect(modal).toHaveCount(0);
        expect(store.dismissals).toHaveLength(2);
        expect(store.dismissedByUser.get(TEST_USERS.A.publicId)?.has(41)).toBe(true);
    });

    test("URGENT-07 이전 계정의 늦은 조회 응답을 새 계정에 표시하지 않는다", async ({ page }) => {
        // 준비: A의 조회를 보류하고 B는 이 공지를 이미 영구 숨긴 상태로 둔다.
        const store = createUrgentNoticeStore();
        store.dismissedByUser.set(TEST_USERS.B.publicId, new Set([41]));
        const held = holdUrgentRequest(store, "load");
        const auth = await mockUrgentNotices(page, store);
        await page.goto("/settings");
        await held.started;

        // 실행: 페이지를 유지하면서 인증 세션만 새 계정으로 바꾼다.
        await auth.changeLogin(TEST_USERS.B, "urgent-stale-load-b");
        await auth.refreshSession();
        await expect.poll(() => store.loads.includes(TEST_USERS.B.publicId)).toBe(true);
        held.release();

        // 검증
        await expect.poll(() => store.completedLoads.includes(TEST_USERS.A.publicId)).toBe(true);
        await expect(page.getByTestId("urgent-notice-modal")).toHaveCount(0);
        expect(store.dismissals).toEqual([]);
    });

    test("URGENT-08 이전 계정의 늦은 저장 응답이 새 계정 팝업을 닫지 않는다", async ({ page }) => {
        // 준비
        const store = createUrgentNoticeStore();
        const auth = await mockUrgentNotices(page, store);
        await page.goto("/settings");
        const held = holdUrgentRequest(store, "dismiss");
        await page.getByTestId("urgent-notice-modal").getByRole("button", { name: "그만 보기", exact: true }).click();
        await held.started;

        // 실행
        await auth.changeLogin(TEST_USERS.B, "urgent-stale-save-b");
        await auth.refreshSession();
        await expect.poll(() => store.loads.includes(TEST_USERS.B.publicId)).toBe(true);
        held.release();

        // 검증: 저장은 A에게만 적용하고 B의 공지는 계속 표시한다.
        await expect.poll(() => store.dismissedByUser.get(TEST_USERS.A.publicId)?.has(41)).toBe(true);
        await expect(page.getByTestId("urgent-notice-modal")).toBeVisible();
        expect(store.dismissedByUser.get(TEST_USERS.B.publicId)?.has(41)).not.toBe(true);
        expect(store.dismissals).toEqual([{ user: TEST_USERS.A.publicId, id: 41 }]);
    });

    test("URGENT-09 모바일 긴 본문에서도 버튼과 키보드 초점을 유지하고 Escape로 닫는다", async ({ page }, testInfo) => {
        // 준비
        await page.setViewportSize({ width: 390, height: 844 });
        const notice = urgentNotice(41);
        notice.content = "점검 중 저장한 내용은 유지됩니다. 이용에 참고해 주세요.\n".repeat(45);
        const store = createUrgentNoticeStore([notice]);
        await mockUrgentNotices(page, store);
        await page.goto("/settings");
        const modal = page.getByTestId("urgent-notice-modal");

        // 검증: 긴 본문만 스크롤하고 두 동작은 화면 안에 둔다.
        await expect(modal).toBeVisible();
        await expect(modal.getByRole("button", { name: "닫기", exact: true })).toBeInViewport();
        await expect(modal.getByRole("button", { name: "그만 보기", exact: true })).toBeInViewport();
        await page.screenshot({ path: testInfo.outputPath("urgent-mobile-long-content.png"), fullPage: true });

        // 실행 및 검증: Tab 이동이 배경으로 빠져나가지 않는다.
        const content = modal.getByRole("region", { name: "공지 내용", exact: true });
        await modal.getByRole("button", { name: "닫기", exact: true }).focus();
        await page.keyboard.press("Tab");
        await expect(content).toBeFocused();
        await page.keyboard.press("PageDown");
        await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        await page.keyboard.press("Tab");
        await expect(modal.getByRole("button", { name: "그만 보기", exact: true })).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(content).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(modal.getByRole("button", { name: "닫기", exact: true })).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(modal).toHaveCount(0);
        await page.reload();
        await expect(modal).toHaveCount(0);
        expect(store.dismissals).toEqual([]);
    });

    test("URGENT-10 공지 조회 실패가 앱을 막지 않고 재시도 성공 후 안내를 표시한다", async ({ page }) => {
        // 준비
        const store = createUrgentNoticeStore();
        store.failedLoadsRemaining = 1;
        await mockUrgentNotices(page, store);

        // 실행
        await page.goto("/settings");

        // 검증: 조회 실패 중에도 기본 화면을 사용할 수 있다.
        await expect.poll(() => store.loadFailures.length).toBe(1);
        await expect(page.getByTestId("app-header")).toBeVisible();
        await expect(page.getByTestId("urgent-notice-modal")).toHaveCount(0);

        // 검증: 자동 재시도에서 받은 공지는 정상적으로 보여 준다.
        await expect(page.getByTestId("urgent-notice-modal")).toBeVisible({ timeout: 20_000 });
        expect(store.loads.length).toBeGreaterThan(1);
        expect(store.dismissals).toEqual([]);
    });

    test("URGENT-11 영구 숨김 요청 시간이 초과되면 버튼을 복구하고 닫을 수 있다", async ({ page }) => {
        // 준비: 응답 없는 서버 요청을 유지해 브라우저의 제한 시간을 검증한다.
        const store = createUrgentNoticeStore();
        await mockUrgentNotices(page, store);
        await page.goto("/settings");
        const modal = page.getByTestId("urgent-notice-modal");
        const held = holdUrgentRequest(store, "dismiss");

        try {
            // 실행
            await modal.getByRole("button", { name: "그만 보기", exact: true }).click();
            await held.started;
            await expect(modal.getByRole("button", { name: "닫기", exact: true })).toBeDisabled();

            // 검증: 실패를 안내하고 두 버튼과 Escape 닫기를 다시 허용한다.
            await expect(modal.getByRole("alert")).toContainText("설정을 저장하지 못했어요", { timeout: 15_000 });
            await expect(modal.getByRole("button", { name: "그만 보기", exact: true })).toBeEnabled();
            await expect(modal.getByRole("button", { name: "닫기", exact: true })).toBeEnabled();
            expect(store.dismissedByUser.get(TEST_USERS.A.publicId)?.has(41)).not.toBe(true);
            await page.keyboard.press("Escape");
            await expect(modal).toHaveCount(0);
        } finally {
            held.release();
        }
    });
});
