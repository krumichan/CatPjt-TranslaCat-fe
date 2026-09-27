import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

interface SyntheticUser {
    source: string;
    publicId: string;
    accessToken: string;
}

const users: SyntheticUser[] = JSON.parse(process.env.E2E_OVERVIEW_USERS ?? "[]");
const secret = process.env.NEXTAUTH_SECRET;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiURL = process.env.E2E_API_BASE_URL ?? "";

for (const user of users) {
    test(`실제 ${user.source} 공통 대시보드·이력은 LL 집계와 상세를 표시한다`, async ({ context, page }) => {
        // 준비: 기존 합성 DB 계정의 인증 세션만 주입하고 업무 HTTP는 가로채지 않는다.
        expect(secret).toBeTruthy();
        expect(apiURL).toBeTruthy();
        const now = Math.floor(Date.now() / 1000);
        const maxAge = 3600;
        const session = await encode({
            secret: secret!, maxAge,
            token: {
                sub: user.publicId, publicId: user.publicId, role: "USER",
                accessToken: user.accessToken, refreshToken: user.accessToken,
                accessTokenExpires: Date.now() + maxAge * 1000,
                iat: now, exp: now + maxAge, jti: `overview-cutover-${user.source}-${now}`,
            },
        });
        await context.addCookies([{
            name: "next-auth.session-token", value: session, url: baseURL,
            httpOnly: true, secure: false, sameSite: "Lax", expires: now + maxAge,
        }]);
        const statuses: number[] = [];
        page.on("response", (response) => {
            if (response.url().startsWith(`${apiURL}/language-learning/`)) statuses.push(response.status());
        });

        // 실행: 대시보드와 출처별 실제 이력 상세를 순서대로 연다.
        await page.goto("/language-learning");
        await expect(page.getByTestId("language-learning-dashboard")).toBeVisible();
        const detail = page.waitForResponse((response) =>
            decodeURIComponent(response.url()).includes(`/language-learning/history/${user.source}:`)
            && response.request().method() === "GET");
        await page.goto("/language-learning/history");
        await page.getByTestId(`history-source-${user.source}`).click();
        const activity = page.locator(`[data-testid^="history-activity-${user.source}:"]`).first();
        await expect(activity).toBeVisible();
        await activity.click();

        // 검증: 실 HTTP로 불러온 상세가 선택되며 모든 학습 조회가 성공한다.
        expect((await detail).status()).toBe(200);
        await expect(activity).toHaveClass(/bg-blue-600/);
        expect(statuses.length).toBeGreaterThan(3);
        expect(statuses.every((status) => status === 200)).toBe(true);
    });
}
