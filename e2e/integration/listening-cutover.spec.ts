import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

const accessToken = process.env.E2E_LISTENING_ACCESS_TOKEN;
const refreshToken = process.env.E2E_LISTENING_REFRESH_TOKEN;
const publicId = process.env.E2E_LISTENING_PUBLIC_ID;
const secret = process.env.NEXTAUTH_SECRET;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiURL = process.env.E2E_API_BASE_URL ?? "";

test.skip(!accessToken || !refreshToken || !publicId || !secret || !apiURL,
    "격리 BE 계정과 NextAuth 테스트 세션이 준비된 경우에만 실행합니다.");

test("실제 Listening 생성·답변·평가·재진입은 FE·BE·LL·범용 Python 경로를 사용한다", async ({ context, page }) => {
    // 준비: 합성 계정으로 서명한 브라우저 세션만 주입하며 업무 HTTP는 가로채지 않는다.
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 3600;
    const token = await encode({
        secret: secret!, maxAge,
        token: {
            sub: publicId!, publicId, role: "USER", accessToken, refreshToken,
            accessTokenExpires: Date.now() + maxAge * 1000,
            iat: now, exp: now + maxAge, jti: `listening-cutover-${now}`,
        },
    });
    await context.addCookies([{
        name: "next-auth.session-token", value: token, url: baseURL,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + maxAge,
    }]);
    const statuses: number[] = [];
    const answers: number[] = [];
    page.on("response", (response) => {
        if (response.url().startsWith(`${apiURL}/language-learning/listening/`)) {
            statuses.push(response.status());
            if (response.request().method() === "POST" && /\/responses\/(DICTATION|INTERPRETATION)$/.test(response.url())) {
                answers.push(response.status());
            }
        }
    });

    // 실행: 실제 화면에서 문항 생성 후 두 Task 답변을 제출한다.
    await page.goto("/language-learning/listening");
    await page.getByTestId("listening-mode-DICTATION").getByRole("button").click();
    await expect(page).toHaveURL(/\/listening\/session\/-\d+$/);
    await expect(page.getByTestId("listening-revealed-answer")).toHaveCount(0);
    await page.getByTestId("listening-answer-DICTATION").getByRole("textbox").fill("京都で静かな寺を見学したいです。");
    await page.getByTestId("listening-answer-INTERPRETATION").getByRole("textbox").fill("합성 의미 답변");
    await page.getByRole("button", { name: "선택 답안 제출", exact: true }).click();

    // 검증: 결과와 재진입 상태가 DB에 확정한 원본 Task 평가를 표시한다.
    await expect(page).toHaveURL(/\/listening\/session\/-\d+\/result$/);
    await expect(page.getByText("평가 반영 1/1", { exact: true })).toBeVisible();
    await expect(page.getByTestId("listening-task-result-DICTATION")).toBeVisible();
    await expect(page.getByTestId("listening-task-result-INTERPRETATION")).toBeVisible();
    await page.reload();
    await expect(page.getByText("평가 반영 1/1", { exact: true })).toBeVisible();
    expect(answers).toEqual([200, 200]);
    expect(statuses.length).toBeGreaterThan(8);
    expect(statuses.every((status) => status === 200)).toBe(true);
});
