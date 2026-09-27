import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

const accessToken = process.env.E2E_WRITING_ACCESS_TOKEN;
const refreshToken = process.env.E2E_WRITING_REFRESH_TOKEN;
const publicId = process.env.E2E_WRITING_PUBLIC_ID;
const secret = process.env.NEXTAUTH_SECRET;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiURL = process.env.E2E_API_BASE_URL ?? "";
const sentenceCount = Number(process.env.E2E_WRITING_SENTENCE_COUNT ?? "1");
const modes = process.env.E2E_WRITING_ALL_MODES === "1"
    ? ["free", "guided", "translation"]
    : ["free"];

test.skip(
    !accessToken || !refreshToken || !publicId || !secret || !apiURL,
    "격리 BE 계정과 NextAuth 테스트 세션이 준비된 경우에만 실행합니다.",
);

for (const mode of modes) {
    test(`실제 FE Writing ${mode} ${sentenceCount}문항 생성·평가·재진입`, async ({ context, page }) => {
        test.setTimeout(60_000);
        // 준비: 격리 DB의 합성 계정으로 정상 서명된 브라우저 세션을 구성한다.
        const now = Math.floor(Date.now() / 1000);
        const maxAge = 60 * 60;
        const token = await encode({
            secret: secret!,
            maxAge,
            token: {
                sub: publicId!,
                publicId,
                role: "USER",
                accessToken,
                refreshToken,
                accessTokenExpires: Date.now() + maxAge * 1000,
                iat: now,
                exp: now + maxAge,
                jti: `writing-cutover-${now}`,
            },
        });
        const url = new URL(baseURL);
        await context.addCookies([{
            name: url.protocol === "https:"
                ? "__Secure-next-auth.session-token"
                : "next-auth.session-token",
            value: token,
            url: baseURL,
            httpOnly: true,
            secure: url.protocol === "https:",
            sameSite: "Lax",
            expires: now + maxAge,
        }]);
        const writingStatuses: number[] = [];
        const answerStatuses: number[] = [];
        const entryStatuses: string[] = [];
        page.on("response", (response) => {
            if (response.url().startsWith(`${apiURL}/language-learning/`)) {
                entryStatuses.push(`${new URL(response.url()).pathname}:${response.status()}`);
            }
            if (response.url().startsWith(`${apiURL}/language-learning/writing/daily`)) {
                writingStatuses.push(response.status());
                if (response.request().method() === "POST" && response.url().endsWith("/answers")) {
                    answerStatuses.push(response.status());
                }
            }
        });

        // 실행: mock 없이 실제 페이지에서 최초 문항을 생성하고 답변을 전송한다.
        await page.goto("/language-learning/writing");
        const type = page.getByTestId(`daily-writing-type-${mode}`);
        await expect(type).toBeVisible({ timeout: 12_000 }).catch(() => {
            throw new Error(`Writing 진입 API 상태: ${entryStatuses.join(", ")}`);
        });
        await type.getByRole("button").click();
        await expect(page.getByTestId("daily-writing-page")).toBeVisible();
        const answer = page.locator("textarea");
        await expect(answer).toHaveCount(sentenceCount);
        for (let index = 0; index < sentenceCount; index += 1) {
            await answer.nth(index).fill("Synthetic answer");
        }
        const submitLabel = sentenceCount === 1 ? "AI 평가 받기" : `${sentenceCount}개 모두 AI 평가`;
        await page.getByRole("button", { name: submitLabel, exact: true }).click();

        // 검증: 실제 BE Writing 응답 뒤 평가가 끝난 화면까지 표시한다.
        await expect(page.getByText("오늘의 학습 완료!", { exact: true })).toBeVisible();
        await page.reload();
        // 새로고침은 기존 유형 선택 화면으로 돌아가므로 완료된 결과를 다시 연다.
        const completedType = page.getByTestId(`daily-writing-type-${mode}`);
        await expect(completedType.getByText("완료", { exact: true })).toBeVisible();
        await completedType.getByRole("button", { name: "결과 보기", exact: true }).click();
        await expect(page.getByText("오늘의 학습 완료!", { exact: true })).toBeVisible();
        await expect(page.locator("textarea")).toHaveCount(0);
        expect(writingStatuses.length).toBeGreaterThanOrEqual(2);
        expect(answerStatuses).toHaveLength(sentenceCount);
        expect(writingStatuses.every((status) => status === 200)).toBe(true);
    });
}
