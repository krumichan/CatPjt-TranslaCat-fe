import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

const accessToken = process.env.E2E_ADMIN_ACCESS_TOKEN;
const refreshToken = process.env.E2E_ADMIN_REFRESH_TOKEN;
const publicId = process.env.E2E_ADMIN_PUBLIC_ID;
const secret = process.env.NEXTAUTH_SECRET;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiURL = process.env.E2E_API_BASE_URL;

test.skip(!accessToken || !refreshToken || !publicId || !secret || !apiURL,
    "격리된 관리자 계정과 실제 BE 서버가 준비된 경우에만 실행합니다.");
test.use({ trace: "off", video: "off" });

test("실제 관리자 화면에서 LL 설정을 조회하고 값 변경 없이 저장·재조회한다", async ({ context, page }) => {
    // 준비: 실제 BE 관리자 토큰을 사용하며 설정 API를 가로채지 않는다.
    const now = Math.floor(Date.now() / 1000);
    const token = await encode({ secret: secret!, maxAge: 3600, token: {
        sub: publicId!, publicId, role: "ADMIN", accessToken, refreshToken,
        accessTokenExpires: Date.now() + 3_600_000, iat: now, exp: now + 3600, jti: `admin-cutover-${now}`,
    } });
    await context.addCookies([{
        name: "next-auth.session-token", value: token, url: baseURL,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + 3600,
    }]);
    const settingsURL = `${apiURL}/admin/language-learning/settings`;
    const initialResponse = page.waitForResponse((response) =>
        response.url() === settingsURL && response.request().method() === "GET");

    // 실행: 조회된 원래 정책을 그대로 저장하므로 다른 기능의 테스트 조건을 바꾸지 않는다.
    await page.goto("/settings/admin/language-learning");
    const initial = await initialResponse;
    expect(initial.status()).toBe(200);
    const original = (await initial.json()).body;
    const savedResponse = page.waitForResponse((response) =>
        response.url() === settingsURL && response.request().method() === "PATCH");
    await page.getByRole("button", { name: /저장/ }).click();
    const saved = await savedResponse;

    // 검증: 실제 저장 응답과 새로고침 후 값이 일치해야 한다.
    expect(saved.status()).toBe(200);
    expect((await saved.json()).body).toEqual(original);
    const reloadedResponse = page.waitForResponse((response) =>
        response.url() === settingsURL && response.request().method() === "GET");
    await page.reload();
    const reloaded = await reloadedResponse;
    expect(reloaded.status()).toBe(200);
    expect((await reloaded.json()).body).toEqual(original);
    await expect(page.getByRole("button", { name: /저장/ })).toBeEnabled();
});
