import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

const accessToken = process.env.E2E_PRACTICE_ACCESS_TOKEN;
const refreshToken = process.env.E2E_PRACTICE_REFRESH_TOKEN;
const publicId = process.env.E2E_PRACTICE_PUBLIC_ID;
const secret = process.env.NEXTAUTH_SECRET;
const setId = process.env.E2E_VOCABULARY_SET_ID;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiURL = process.env.E2E_API_BASE_URL ?? "";

test.skip(!accessToken || !refreshToken || !publicId || !secret || !apiURL || !setId,
    "격리 계정과 합성 과거 Vocabulary 세트가 준비된 경우에만 실행합니다.");

test("기존 Vocabulary 답변·재도전·결과 복습과 누적 mastery를 실제 UI로 확인한다", async ({ context, page }) => {
    // 준비: 합성 계정의 서명 세션만 주입하고 업무 요청은 실제 BE·LL로 전송한다.
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 3600;
    const token = await encode({
        secret: secret!, maxAge,
        token: {
            sub: publicId!, publicId, role: "USER", accessToken, refreshToken,
            accessTokenExpires: Date.now() + maxAge * 1000,
            iat: now, exp: now + maxAge, jti: `vocabulary-cutover-${now}`,
        },
    });
    await context.addCookies([{
        name: "next-auth.session-token", value: token, url: baseURL,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + maxAge,
    }]);
    const answers: number[] = [];
    const profileStatuses: number[] = [];
    page.on("response", (response) => {
        if (!response.url().startsWith(`${apiURL}/language-learning/`)) return;
        if (response.url().endsWith("/answers")) answers.push(response.status());
        if (response.url().includes("/profile")) profileStatuses.push(response.status());
    });

    // 실행: 종료 안내를 보존하면서 직접 연결된 기존 세트의 첫 오답·재도전·복습 문항을 제출한다.
    await page.goto("/language-learning/vocabulary");
    await expect(page.getByRole("heading", { name: "독립 Daily Vocabulary 신규 제공을 종료했습니다", exact: true }).first()).toBeVisible();
    await page.goto(`/language-learning/vocabulary/session/${setId}`);
    await expect(page.getByRole("heading", { name: "문제 1 / 10", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "B Option B", exact: true }).click();
    await page.getByRole("button", { name: "답변 제출", exact: true }).click();
    await expect(page.getByText("아쉽지만 정답이 아닙니다.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "A Option A", exact: true }).click();
    await page.getByRole("button", { name: "다시 답하기", exact: true }).click();
    await expect(page.getByText("정답입니다.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "다음 문제", exact: true }).click();
    for (let order = 2; order <= 10; order++) {
        await expect(page.getByRole("heading", { name: `문제 ${order} / 10`, exact: true })).toBeVisible();
        if (order === 2) await expect(page.getByText("복습 문제", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "A Option A", exact: true }).click();
        await page.getByRole("button", { name: "답변 제출", exact: true }).click();
        if (order < 10) await page.getByRole("button", { name: "다음 문제", exact: true }).click();
    }

    // 검증: 공식 첫 시도 점수는 재도전으로 바뀌지 않으며 완료 화면의 오답 복습도 그대로 열린다.
    await expect(page.getByRole("heading", { name: "학습 결과", exact: true })).toBeVisible();
    await expect(page.getByText("첫 제출 기준 9 / 10문제 정답", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "#1 · 복습 정답", exact: true }).click();
    await expect(page.getByRole("heading", { name: "문제 1 / 10", exact: true })).toBeVisible();
    await expect(page.getByText("Expression 1", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "답변 제출", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "결과로 돌아가기", exact: true }).click();
    await expect(page.getByText("첫 제출 기준 9 / 10문제 정답", { exact: true })).toBeVisible();
    expect(answers).toEqual(Array(11).fill(200));

    // 검증: 실제 Profile API의 전용 mastery가 홈의 기존 누적 숙련도 구역에 반영된다.
    await page.goto("/language-learning#learning-profile");
    const profileToggle = page.locator('button[aria-controls="dashboard-learning-profile-content"]');
    await expect(profileToggle).toBeVisible();
    if (await profileToggle.getAttribute("aria-expanded") === "false") await profileToggle.click();
    await expect(page.getByRole("heading", { name: "Vocabulary 누적 숙련도", exact: true })).toBeVisible();
    const masteryToggle = page.locator('button[aria-controls="profile-vocabulary-mastery-content"]');
    if (await masteryToggle.getAttribute("aria-expanded") === "false") await masteryToggle.click();
    const mastery = page.locator("#profile-vocabulary-mastery-content");
    await expect(mastery.getByText("평균 숙련도 63", { exact: true })).toBeVisible();
    await expect(mastery.getByText("Review expression", { exact: true })).toBeVisible();
    await expect(mastery.getByText("Expression 1", { exact: true })).toBeVisible();
    expect(profileStatuses.length).toBeGreaterThan(0);
    expect(profileStatuses.every((status) => status === 200)).toBe(true);
});
