import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

const accessToken = process.env.E2E_PRACTICE_ACCESS_TOKEN;
const refreshToken = process.env.E2E_PRACTICE_REFRESH_TOKEN;
const publicId = process.env.E2E_PRACTICE_PUBLIC_ID;
const secret = process.env.NEXTAUTH_SECRET;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiURL = process.env.E2E_API_BASE_URL ?? "";

test.skip(
    !accessToken || !refreshToken || !publicId || !secret || !apiURL,
    "격리 BE 계정과 NextAuth 테스트 세션이 준비된 경우에만 실행합니다.",
);

test("실제 Reading 다섯 답변과 결과가 FE·BE·LL·합성 Provider를 통과한다", async ({ context, page }) => {
    // 준비: 합성 계정의 정상 서명 세션만 주입하고 업무 API는 실제 서버로 보낸다.
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 3600;
    const token = await encode({
        secret: secret!,
        maxAge,
        token: {
            sub: publicId!, publicId, role: "USER", accessToken, refreshToken,
            accessTokenExpires: Date.now() + maxAge * 1000,
            iat: now, exp: now + maxAge, jti: `practice-cutover-${now}`,
        },
    });
    await context.addCookies([{
        name: new URL(baseURL).protocol === "https:"
            ? "__Secure-next-auth.session-token" : "next-auth.session-token",
        value: token, url: baseURL, httpOnly: true,
        secure: new URL(baseURL).protocol === "https:", sameSite: "Lax", expires: now + maxAge,
    }]);
    const statuses: number[] = [];
    const answers: number[] = [];
    page.on("response", (response) => {
        if (response.url().startsWith(`${apiURL}/language-learning/practice/`)) {
            statuses.push(response.status());
            if (response.url().endsWith("/answers")) answers.push(response.status());
        }
    });

    // 실행: 첫 지문과 다음 지문을 동일한 화면 업무 경로에서 생성하고 모두 제출한다.
    await page.goto("/language-learning/reading");
    await page.locator("article").filter({ has: page.getByRole("heading", { name: "독해 문제", exact: true }) })
        .getByRole("button", { name: "이 형식 시작하기", exact: true }).click();
    await expect(page).toHaveURL(/\/reading\/session\/-\d+$/);
    for (let index = 1; index <= 5; index++) {
        await expect(page.getByRole("heading", { name: `문제 ${index} / 5`, exact: true })).toBeVisible();
        await page.getByRole("button", { name: "A Synthetic option A", exact: true }).click();
        await page.getByRole("button", { name: "답변 제출", exact: true }).click();
        if (index < 5) {
            await expect(page.getByText("정답입니다.", { exact: true })).toBeVisible();
            await page.getByRole("button", { name: "다음 문제", exact: true }).click();
        }
    }

    // 검증: 원본 공식 첫 답변 집계와 완료 표시까지 확인한다.
    await expect(page.getByRole("heading", { name: "학습 결과", exact: true })).toBeVisible();
    await expect(page.getByText("첫 제출 기준 5 / 5문제 정답", { exact: true })).toBeVisible();
    expect(answers).toEqual([200, 200, 200, 200, 200]);
    expect(statuses.length).toBeGreaterThan(7);
    expect(statuses.every((status) => status === 200)).toBe(true);
});
