import { expect, test } from "@playwright/test";
import { installMockAuthCookie } from "../fixtures/mock-test";
import { mockCommonPageDependencies, mockIdleWebSocket, mockNotificationBackground } from "../support/api-mocks";

test("AUTH-01 이메일 인증 후 가입하고 비밀번호 로그인 화면으로 이동한다", async ({ page }, testInfo) => {
    // 준비: 외부 메일/BE 호출은 대체하고 실제 공개 route와 폼은 그대로 사용한다.
    await page.route("**/api/auth/session", (route) => route.fulfill({ json: {} }));
    let registration: Record<string, unknown> | null = null;
    await page.route("**/api/auth/public/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith("email/challenges")) return route.fulfill({ json: { body: { challengeId: "challenge-1", expiresIn: 300, resendAfterSeconds: 30 } } });
        if (path.endsWith("email/verify")) {
            expect(route.request().postDataJSON()).toEqual({ challengeId: "challenge-1", code: "123456" });
            return route.fulfill({ json: { body: { verificationToken: "test-email-proof", expiresIn: 300 } } });
        }
        registration = route.request().postDataJSON();
        return route.fulfill({ json: { body: { publicId: "member-1", email: "reader@example.test", nickname: "고양이" } } });
    });
    await page.goto("/ko/register");

    // 실행: 인증 전에는 가입 정보를 제출할 수 없다.
    await expect(page.getByRole("button", { name: "계정 만들기", exact: true })).toBeDisabled();
    await page.locator("#register-email").fill("reader@example.test");
    await page.getByRole("button", { name: "인증 코드 보내기", exact: true }).click();
    await page.locator("#email-code").fill("123456");
    await page.getByRole("button", { name: "이메일 인증하기", exact: true }).click();
    await page.locator("#new-password").fill("valid-test-password");
    await page.locator("#confirm-password").fill("valid-test-password");
    await page.locator("#register-nickname").fill("고양이");
    await page.locator("#register-birth-date").fill("2000-02-29");
    await page.screenshot({ path: testInfo.outputPath("register-desktop.png"), fullPage: true });
    await page.getByRole("button", { name: "계정 만들기", exact: true }).click();

    // 검증: 인증 proof는 요청에만 사용하고 브라우저 저장소에는 보관하지 않는다.
    await expect(page).toHaveURL(/\/ko\/login\?registered=1$/);
    await expect(page.getByText("회원가입이 완료됐어요. 이메일과 비밀번호로 로그인해주세요.")).toBeVisible();
    expect(registration).toMatchObject({ nickname: "고양이", birthDate: "2000-02-29", verificationToken: "test-email-proof" });
    const storage = await page.evaluate(() => JSON.stringify([Object.values(localStorage), Object.values(sessionStorage)]));
    expect(storage).not.toContain("test-email-proof");
    expect(storage).not.toContain("valid-test-password");
});

test("AUTH-02 중복 이메일과 코드 오류를 표시하고 이메일 변경 시 인증을 초기화한다", async ({ page }, testInfo) => {
    // 준비
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/auth/session", (route) => route.fulfill({ json: {} }));
    await page.route("**/api/auth/public/email/challenges", (route) => {
        if (route.request().postDataJSON().email === "existing@example.test") return route.fulfill({ status: 409, json: { body: { errorCode: "AUTH_EMAIL_ALREADY_REGISTERED" } } });
        return route.fulfill({ json: { body: { challengeId: "c-2", expiresIn: 300, resendAfterSeconds: 30 } } });
    });
    await page.route("**/api/auth/public/email/verify", (route) => {
        if (route.request().postDataJSON().code === "000000") return route.fulfill({ status: 400, json: { body: { errorCode: "AUTH_EMAIL_CODE_INVALID" } } });
        return route.fulfill({ json: { body: { verificationToken: "expiring-proof", expiresIn: 300 } } });
    });
    await page.route("**/api/auth/public/register", (route) => route.fulfill({ status: 400, json: { body: { errorCode: "AUTH_EMAIL_VERIFICATION_INVALID" } } }));
    await page.goto("/ko/register");

    // 실행 및 검증: 중복/잘못된 코드와 재전송 제한을 구별한다.
    await page.locator("#register-email").fill("existing@example.test");
    await page.getByRole("button", { name: "인증 코드 보내기", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "이미 가입된 이메일" })).toBeVisible();
    await page.locator("#register-email").fill("new@example.test");
    await page.getByRole("button", { name: "인증 코드 보내기", exact: true }).click();
    await expect(page.getByRole("button", { name: /초 후 다시 보내기/ })).toBeDisabled();
    await page.locator("#email-code").fill("000000");
    await page.getByRole("button", { name: "이메일 인증하기", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "인증 코드가 올바르지" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("register-mobile-error.png"), fullPage: true });

    // 검증: 서버에서 proof가 먼저 만료되어도 타이머를 기다리지 않고 다시 인증할 수 있다.
    await page.locator("#email-code").fill("123456");
    await page.getByRole("button", { name: "이메일 인증하기", exact: true }).click();
    await page.locator("#new-password").fill("valid-test-password");
    await page.locator("#confirm-password").fill("valid-test-password");
    await page.locator("#register-nickname").fill("고양이");
    await page.locator("#register-birth-date").fill("2000-02-29");
    await page.getByRole("button", { name: "계정 만들기", exact: true }).click();
    await expect(page.getByRole("button", { name: "인증 코드 보내기", exact: true })).toBeEnabled();
    await expect(page.getByRole("alert").filter({ hasText: "이메일 인증이 만료" })).toBeVisible();
    await page.locator("#register-email").fill("other@example.test");
    await expect(page.locator("#email-code")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "계정 만들기", exact: true })).toBeDisabled();
});

test("AUTH-03 URL만 바꿔서는 Google 재인증 후 비밀번호 입력을 열 수 없다", async ({ context, page }, testInfo) => {
    // 준비: 실제 서명 세션으로 보호 route를 통과한다.
    await installMockAuthCookie(context);
    await mockCommonPageDependencies(page);
    await mockIdleWebSocket(page);
    await page.route("**/api/account/details", (route) => route.fulfill({ json: { body: { email: "reader@example.test", hasPassword: false, googleLinked: true, birthDate: null, reauthenticated: false } } }));

    // 실행: query는 성공을 주장하지만 서버에 proof는 없는 상황이다.
    await page.goto("/ko/settings/account?google=reauthenticated");

    // 검증
    await expect(page.getByRole("button", { name: "Google 계정 다시 확인", exact: true })).toBeVisible();
    await expect(page.locator("#new-password")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("account-settings.png"), fullPage: true });
});

test("AUTH-04 비밀번호 로그인 실패를 표시하고 성공 시 공통 세션으로 진입한다", async ({ context, page }, testInfo) => {
    // 준비: NextAuth CSRF/provider/session은 실제 route를 사용하고 credentials callback 응답을 대체한다.
    let attempts = 0;
    await mockNotificationBackground(page);
    await mockIdleWebSocket(page);
    await page.route("**/recent/top10**", (route) => route.fulfill({ json: { body: [] } }));
    await page.route("**/api/auth/callback/credentials", async (route) => {
        const input = new URLSearchParams(route.request().postData() ?? "");
        expect(input.get("email")).toBe("reader@example.test");
        expect(input.get("csrfToken")).toBeTruthy();
        attempts++;
        if (attempts === 1) return route.fulfill({ status: 401, json: { url: new URL("/login?error=AUTH_INVALID_CREDENTIALS", route.request().url()).toString() } });
        await installMockAuthCookie(context);
        return route.fulfill({ json: { url: new URL("/ko", route.request().url()).toString() } });
    });
    await page.goto("/ko/login");

    // 실행 및 검증: 실패 시 비밀번호는 지우고 이메일은 유지한다.
    await page.locator("#login-email").fill("reader@example.test");
    await page.locator("#login-password").fill("incorrect-password");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "이메일 또는 비밀번호" })).toBeVisible();
    await expect(page.locator("#login-password")).toHaveValue("");
    await expect(page.locator("#login-email")).toHaveValue("reader@example.test");
    await page.screenshot({ path: testInfo.outputPath("login-desktop.png"), fullPage: true });

    // 실행 및 검증: 성공 응답과 서명 세션으로 보호 홈 화면에 진입한다.
    await page.locator("#login-password").fill("correct-password");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page).toHaveURL(/\/ko\/?$/);
    expect(attempts).toBe(2);
});

test("AUTH-05 서버 재인증을 마친 Google 사용자가 이메일 인증 후 비밀번호를 추가한다", async ({ context, page }) => {
    // 준비: Google 재인증 proof 자체는 브라우저에 전달하지 않는다.
    await installMockAuthCookie(context);
    let added = false;
    let passwordRequest: Record<string, unknown> | null = null;
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    await mockCommonPageDependencies(page);
    await mockIdleWebSocket(page);
    await page.route("**/api/account/details", (route) => route.fulfill({ json: { body: { email: "reader@example.test", hasPassword: added, googleLinked: true, birthDate: null, reauthenticated: !added } } }));
    await page.route("**/api/account/email/challenges", (route) => route.fulfill({ json: { body: { challengeId: "account-email", expiresIn: 300, resendAfterSeconds: 30 } } }));
    await page.route("**/api/auth/public/email/verify", (route) => route.fulfill({ json: { body: { verificationToken: "email-proof-only", expiresIn: 300 } } }));
    await page.route("**/api/account/password", (route) => {
        passwordRequest = route.request().postDataJSON();
        added = true;
        return route.fulfill({ json: { body: null } });
    });
    await page.goto("/ko/settings/account?google=reauthenticated");

    // 실행
    await page.getByRole("button", { name: "인증 코드 보내기", exact: true }).click();
    await page.locator("#email-code").fill("123456");
    await page.getByRole("button", { name: "이메일 인증하기", exact: true }).click();
    await page.locator("#new-password").fill("new-valid-password");
    await page.locator("#confirm-password").fill("new-valid-password");
    await page.getByRole("button", { name: "비밀번호 등록", exact: true }).click();

    // 검증: 두 로그인 방법은 같은 계정에 남고 재인증 토큰은 JS 요청 본문에도 없다.
    await expect(page.getByText("비밀번호를 등록했어요. Google과 이메일 로그인 모두 사용할 수 있어요.")).toBeVisible();
    await expect(page.getByText("이메일과 비밀번호로 로그인할 수 있어요.")).toBeVisible();
    expect(passwordRequest).toEqual({ password: "new-valid-password", verificationToken: "email-proof-only" });
    expect(added).toBe(true);
    await expect(page.locator("#new-password")).toHaveCount(0);
    expect(browserErrors).toEqual([]);
});
