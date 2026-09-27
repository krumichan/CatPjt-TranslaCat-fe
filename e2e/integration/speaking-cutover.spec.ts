import { expect, test, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { writeFileSync } from "node:fs";

const accessToken = process.env.E2E_SPEAKING_ACCESS_TOKEN;
const refreshToken = process.env.E2E_SPEAKING_REFRESH_TOKEN;
const publicId = process.env.E2E_SPEAKING_PUBLIC_ID;
const secret = process.env.NEXTAUTH_SECRET;
const capture = process.env.E2E_SPEAKING_AUDIO_PATH;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiURL = process.env.E2E_API_BASE_URL ?? "";
const controlPath = process.env.E2E_SPEAKING_CONTROL_PATH;

test.skip(!accessToken || !refreshToken || !publicId || !secret || !capture || !apiURL,
    "격리 계정·합성 마이크·실제 서비스가 준비된 경우에만 실행합니다.");
test.use({
    permissions: ["microphone"],
    launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream",
        `--use-file-for-fake-audio-capture=${capture}`] },
    trace: "off",
    video: "off",
});

test.beforeEach(async ({ context }) => {
    // 준비: 합성 로그인 세션과 마이크 입력만 준비하고 업무 API·MediaRecorder는 실제 구현을 실행한다.
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 3600;
    const token = await encode({ secret: secret!, maxAge, token: {
        sub: publicId!, publicId, role: "USER", accessToken, refreshToken,
        accessTokenExpires: Date.now() + maxAge * 1000, iat: now, exp: now + maxAge,
        jti: `speaking-cutover-${now}`,
    } });
    await context.addCookies([{ name: "next-auth.session-token", value: token, url: baseURL,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + maxAge }]);
});

async function openMode(page: Page, mode: string): Promise<void> {
    if (!controlPath) throw new Error("합성 Speaking 제어 경로가 필요합니다.");
    writeFileSync(controlPath, JSON.stringify({ speechEnabled: true, practiceMode: mode, scenario: "normal" }));
    await page.goto("/language-learning/speaking");
    await page.getByTestId(`speaking-mode-${mode}`).getByRole("button", { name: "이 형식 시작하기", exact: true }).click();
    await page.getByTestId("speaking-topic-mode-custom").click();
    await page.getByTestId("speaking-custom-topic-input").fill(`TRANSLACAT_SYNTHETIC_SPEAKING_UI_${mode}_${Date.now()}`);
    await page.getByRole("button", { name: "Speaking 시작", exact: true }).click();
    await expect(page).toHaveURL(/\/speaking\/-\d+$/);
}

async function record(page: Page, milliseconds: number, replace = false): Promise<void> {
    await page.getByRole("button", { name: "녹음 시작", exact: true }).click();
    // 실제 MediaRecorder의 길이를 확보하는 대기이며 업무 응답·모델 timeout을 늘리는 설정이 아니다.
    await page.waitForTimeout(milliseconds);
    await page.getByRole("button", { name: "녹음 종료", exact: true }).click();
    const processed = page.waitForResponse((response) => response.url().endsWith("/turns") && response.request().method() === "POST");
    await page.getByRole("button", { name: replace ? "이 발화 교체하기" : "답변 보내기", exact: true }).click();
    expect((await processed).status()).toBe(200);
}

test("실제 마이크 녹음과 자유 코칭이 FE에서 Ktor 저장까지 연결된다", async ({ page }) => {
    // 준비
    const statuses: number[] = [];
    const turns: number[] = [];
    page.on("response", (response) => {
        if (!response.url().startsWith(`${apiURL}/language-learning/speaking/`)) return;
        statuses.push(response.status());
        if (response.url().endsWith("/turns") && response.request().method() === "POST") turns.push(response.status());
    });

    // 실행: 사용자가 실제로 하는 선택·녹음·제출·완료 동작을 그대로 수행한다.
    await openMode(page, "FREE");
    await record(page, 3200);
    await expect(page.getByTestId("speaking-turn-1")).toContainText("Yesterday I went to the park");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "종료하고 코칭 받기", exact: true }).click();

    // 검증: 코칭 결과 표시와 원본 음성 처리 HTTP가 모두 성공해야 한다.
    await expect(page.getByTestId("speaking-coaching-result")).toBeVisible();
    expect(turns).toEqual([200]);
    expect(statuses.length).toBeGreaterThan(5);
    expect(statuses.every((status) => status === 200)).toBe(true);
});

test("실제 Guided 다섯 발화와 60초 근거를 제출하고 공식 평가 화면을 확인한다", async ({ page }) => {
    // 준비: 원본 60초 기준을 실제로 녹음하므로 테스트 실행 한도만 그 소요 시간에 맞춘다.
    test.setTimeout(150_000);
    await openMode(page, "GUIDED");

    // 실행
    for (let index = 1; index <= 5; index++) {
        await record(page, 13_000);
        await expect(page.getByTestId(`speaking-turn-${index}`)).toContainText("Yesterday I went to the park");
    }
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "종료하고 평가받기", exact: true }).click();

    // 검증
    await expect(page.getByTestId("speaking-evaluation-result")).toBeVisible();
    await expect(page.getByTestId("speaking-metric-MEANING")).toBeVisible();
});

test("실제 Read Aloud 다섯 문제와 재녹음을 완료하고 문제별 결과를 확인한다", async ({ page }) => {
    // 준비: 열한 번의 실제 마이크 녹음·재녹음과 기존 문제 제출 화면을 사용한다.
    test.setTimeout(120_000);
    await openMode(page, "READ_ALOUD");

    // 실행
    for (let problem = 1; problem <= 5; problem++) {
        const panel = page.getByTestId("read-aloud-problem-panel");
        await expect(panel).toContainText(`오늘의 문제 ${problem}/5`);
        await record(page, 1600);
        if (problem === 1) {
            page.once("dialog", (dialog) => dialog.accept());
            await page.getByTestId("speaking-turn-1").getByRole("button", { name: "다시 녹음", exact: true }).click();
            await record(page, 1600, true);
        }
        await record(page, 1600);
        await expect(panel).toContainText("필수 발화 2/2");
        await panel.getByRole("button", { name: problem === 5 ? "마지막 문제 평가하기" : "이 문제 평가하고 다음으로", exact: true }).click();
    }

    // 검증
    await expect(page.getByTestId("speaking-problem-results")).toBeVisible();
    for (let index = 1; index <= 5; index++) await expect(page.getByTestId(`speaking-problem-result-${index}`)).toBeVisible();
    await expect(page.getByTestId("speaking-evaluation-result")).toBeVisible();
});
