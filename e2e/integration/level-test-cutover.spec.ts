import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

const accessToken = process.env.E2E_LEVEL_ACCESS_TOKEN;
const refreshToken = process.env.E2E_LEVEL_REFRESH_TOKEN;
const publicId = process.env.E2E_LEVEL_PUBLIC_ID;
const secret = process.env.NEXTAUTH_SECRET;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiURL = process.env.E2E_API_BASE_URL ?? "";

test.skip(!accessToken || !refreshToken || !publicId || !secret || !apiURL,
    "격리 BE 계정과 NextAuth 테스트 세션이 준비된 경우에만 실행합니다.");
test.use({
    permissions: ["microphone"],
    launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
    // 합성 계정 토큰이 네트워크 trace에 저장되지 않도록 해당 산출물을 끈다.
    trace: "off",
    video: "off",
});

test("실제 FE Level Test 20문항·녹음·새로고침·결과·이력을 연결한다", async ({ context, page }) => {
    test.setTimeout(180_000);
    // 준비: 합성 계정의 서명 세션을 사용하며 업무 API를 가로채지 않는다.
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 3600;
    const token = await encode({ secret: secret!, maxAge, token: {
        sub: publicId!, publicId, role: "USER", accessToken, refreshToken,
        accessTokenExpires: Date.now() + maxAge * 1000,
        iat: now, exp: now + maxAge, jti: `level-cutover-${now}`,
    } });
    await context.addCookies([{
        name: "next-auth.session-token", value: token, url: baseURL,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + maxAge,
    }]);
    const statuses: number[] = [];
    const answers: number[] = [];
    page.on("response", (response) => {
        if (!response.url().startsWith(`${apiURL}/language-learning/level-test/`)) return;
        statuses.push(response.status());
        if (response.request().method() === "POST" && /\/answers(?:\/audio)?$/.test(new URL(response.url()).pathname)) {
            answers.push(response.status());
        }
    });

    // 실행: 선택·순서·텍스트·실제 MediaRecorder 녹음을 모두 UI에서 제출한다.
    await page.goto("/language-learning/level-test");
    await page.getByRole("button", { name: /테스트 시작/ }).click();
    await expect(page).toHaveURL(/level-test\/session\/-?\d+/);
    const sessionId = page.url().split("/").pop();
    for (let number = 1; number <= 20; number += 1) {
        await expect(page.getByText(`${number} / 20`, { exact: true })).toBeVisible();
        console.log(`Level UI question=${number}`);
        if (number === 11) {
            await page.reload();
            await expect(page.getByText("11 / 20", { exact: true })).toBeVisible();
        }
        if (number === 6) {
            for (const part of ["second", "first", "third", "fourth"]) {
                await page.getByRole("button", { name: part, exact: true }).click();
            }
        } else if (number <= 12) {
            await page.getByRole("radio").first().click();
        } else if (number <= 17) {
            await page.getByRole("textbox").fill(number === 13
                ? "A friendly gardener planted purple flowers beside the wooden gate."
                : "Synthetic answer");
        } else {
            if (number === 18 || number === 19) {
                await page.getByRole("button", { name: "원본 음성 듣기", exact: true }).click();
            }
            const allow = page.getByRole("button", { name: "마이크 허용", exact: true });
            if (await allow.isVisible()) await allow.click();
            await page.getByRole("button", { name: "녹음 시작", exact: true }).click();
            // 최소 음성 길이를 충족하는 합성 마이크 입력을 실제 녹음한다.
            await page.waitForTimeout(3500);
            await page.getByRole("button", { name: "녹음 정지", exact: true }).click();
            await expect(page.getByLabel(/녹음 미리듣기/)).toBeVisible();
        }
        await expect(page.getByRole("button", { name: "답변 제출", exact: true })).toBeEnabled();
        const submitted = page.waitForResponse((response) =>
            response.url().startsWith(`${apiURL}/language-learning/level-test/`) &&
            response.request().method() === "POST" && /\/answers(?:\/audio)?$/.test(new URL(response.url()).pathname),
            { timeout: 20_000 },
        );
        await page.getByRole("button", { name: "답변 제출", exact: true }).click();
        expect((await submitted).status(), `문항 ${number} 실제 답변 HTTP`).toBe(200);
    }

    // 검증: 새로 조회한 결과·20개 이력과 실제 HTTP의 성공 상태를 확인한다.
    await expect(page).toHaveURL(new RegExp(`/level-test/result/${sessionId}$`));
    await expect(page.getByText(/CEFR/)).toBeVisible();
    await page.goto(`/language-learning/level-test/history/${sessionId}`);
    for (let number = 1; number <= 20; number += 1) {
        await expect(page.getByTestId(`level-test-history-item-${number}`)).toBeVisible();
    }
    expect(answers).toHaveLength(20);
    expect(statuses.length).toBeGreaterThan(40);
    expect(statuses.every((status) => status === 200)).toBe(true);
    console.log(`Level UI HTTP=${statuses.length}, answers=${answers.length}, synthetic microphone=3`);
});
