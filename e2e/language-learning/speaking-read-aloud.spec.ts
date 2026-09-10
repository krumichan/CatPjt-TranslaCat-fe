import { expect, test } from "../fixtures/mock-test";
import { fulfillApiJson } from "../support/api-mocks";
import { mockLanguageLearningBase, mockLanguageLearningSpeaking } from "../support/language-learning-mocks";
import { createReadAloudDetail } from "../support/language-learning-read-aloud-mocks";
import { mockSpeakingMediaRecorder } from "../support/media-recorder-mock";
import { responseDto } from "../support/mock-data";

const DETAIL_URL = "**/api/v1/language-learning/speaking/sessions/301";

test.describe("Language Learning current READ_ALOUD policy", () => {
    test.beforeEach(async ({ page }) => {
        await mockLanguageLearningBase(page);
        await mockLanguageLearningSpeaking(page);
        await mockSpeakingMediaRecorder(page);
    });

    test("LLS-RA-01 한 번의 발화로 문제를 평가할 수 없고 과거 도움말/메모 UI를 표시하지 않는다", async ({ page }) => {
        const detail = createReadAloudDetail(1);
        await page.route(DETAIL_URL, (route) => fulfillApiJson(route, responseDto(detail)));
        await page.goto("/language-learning/speaking/301");
        const problem = page.getByTestId("read-aloud-problem-panel");
        await expect(problem).toContainText("오늘의 문제 1/5");
        await expect(problem).toContainText("필수 발화 1/2");
        await expect(problem.getByRole("button", { name: "이 문제 평가하고 다음으로" })).toBeDisabled();
        await expect(page.getByTestId("speaking-assistance-panel")).toHaveCount(0);
        await expect(page.getByRole("textbox", { name: "내 메모" })).toHaveCount(0);
        await expect(page.getByTestId("speaking-practice-prompt").getByRole("button", { name: "느리게 재생", exact: true })).toBeEnabled();
    });

    test("LLS-RA-02 두 번의 짧은 발화 뒤 비동기 평가를 요청하고 다음 문제로 이동한다", async ({ page }) => {
        const detail = createReadAloudDetail(2);
        await page.route(DETAIL_URL, (route) => fulfillApiJson(route, responseDto(detail)));
        await page.route("**/api/v1/language-learning/speaking/sessions/301/read-aloud/problems/1/evaluate", async (route) => {
            const evaluation = {
                problemIndex: 1, attemptCount: 2, status: "EVALUATING",
                overallScore: null, evaluationConfidence: null, errorMessage: null,
                submittedAt: "2026-09-09T12:00:00", evaluatedAt: null,
            };
            detail.readAloudProblemEvaluations = [evaluation];
            await fulfillApiJson(route, responseDto(evaluation));
        });
        await page.goto("/language-learning/speaking/301");
        const problem = page.getByTestId("read-aloud-problem-panel");
        await expect(problem).toContainText("필수 발화 2/2");
        const evaluate = problem.getByRole("button", { name: "이 문제 평가하고 다음으로" });
        // Eight seconds is sufficient for this problem; the legacy 60-second
        // whole-session gate must not block READ_ALOUD problem evaluation.
        await expect(evaluate).toBeEnabled();
        const requested = page.waitForRequest((request) =>
            request.url().endsWith("/read-aloud/problems/1/evaluate") && request.method() === "POST",
        );
        await evaluate.click();
        await requested;
        await expect(problem).toContainText("오늘의 문제 2/5");
        await expect(problem).toContainText("문제 1 · 평가 중");
        await expect(page.getByTestId("speaking-practice-prompt")).toContainText("駅まで一緒に歩きましょう。");
        await expect(page).toHaveURL(/speaking\/301$/);
    });

    test("LLS-RA-03 세 번째 발화는 선택 사항이고 네 번째 발화는 추가할 수 없다", async ({ page }) => {
        let detail = createReadAloudDetail(2);
        await page.route(DETAIL_URL, (route) => fulfillApiJson(route, responseDto(detail)));
        await page.goto("/language-learning/speaking/301");
        const problem = page.getByTestId("read-aloud-problem-panel");
        await expect(page.getByRole("button", { name: "녹음 시작", exact: true })).toBeDisabled();
        await problem.getByRole("button", { name: "한 번 더 말하기 (선택)", exact: true }).click();
        await expect(page.getByRole("button", { name: "녹음 시작", exact: true })).toBeEnabled();
        detail = createReadAloudDetail(3);
        await page.reload();
        await expect(problem.getByRole("button", { name: /한 번 더 말하기/ })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "녹음 시작", exact: true })).toBeDisabled();
        await expect(problem.getByRole("button", { name: "이 문제 평가하고 다음으로" })).toBeEnabled();
    });

    test("LLS-RA-04 재녹음은 기존 발화 ID를 교체하고 새 발화를 추가하지 않는다", async ({ page }) => {
        const detail = createReadAloudDetail(2);
        let replacementCalls = 0;
        await page.route(DETAIL_URL, (route) => fulfillApiJson(route, responseDto(detail)));
        await page.route("**/api/v1/language-learning/speaking/sessions/301/turns/401/rerecord/upload-url", (route) =>
            fulfillApiJson(route, responseDto({ turnId: 401, turnIndex: 1, uploadToken: "rerecord-token", uploadUrl: "/mock-upload", expiresAt: "2026-09-09T12:00:00" })),
        );
        await page.route("**/api/v1/language-learning/speaking/sessions/301/turns", async (route) => {
            replacementCalls += 1;
            const body = route.request().postDataBuffer()?.toString("utf8") ?? "";
            expect(body).toContain('"turnId":401');
            expect(body).toContain('"rerecord":true');
            expect(body).toContain('"assistanceUsage":[]');
            detail.turns[0] = { ...detail.turns[0], recordingRevision: 1, transcript: "同じ発話を録音し直しました。" };
            await fulfillApiJson(route, responseDto(detail.turns[0]));
        });
        await page.goto("/language-learning/speaking/301");
        page.once("dialog", (dialog) => dialog.accept());
        const firstTurn = page.getByTestId("speaking-turn-1");
        await firstTurn.getByRole("button", { name: "다시 녹음", exact: true }).click();
        await page.getByRole("button", { name: "녹음 시작", exact: true }).click();
        // Exercise the real minimum recording duration; this is not a rendering retry delay.
        await page.waitForTimeout(1100);
        await page.getByRole("button", { name: "녹음 종료", exact: true }).click();
        await page.getByRole("button", { name: "이 발화 교체하기", exact: true }).click();
        await expect(firstTurn).toContainText("同じ発話を録音し直しました。");
        await expect(page.getByTestId("speaking-turn-2")).toBeVisible();
        await expect(page.getByTestId("speaking-turn-3")).toHaveCount(0);
        await expect(page.getByTestId("read-aloud-problem-panel")).toContainText("필수 발화 2/2");
        expect(replacementCalls).toBe(1);
    });

});
