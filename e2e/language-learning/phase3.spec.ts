import { expect, test } from "../fixtures/mock-test";

import { fulfillApiJson } from "../support/api-mocks";
import {
    LANGUAGE_LEARNING_DASHBOARD,
    LANGUAGE_LEARNING_LISTENING_HISTORY_DETAIL,
    LANGUAGE_LEARNING_LISTENING_RESULT,
    LANGUAGE_LEARNING_LISTENING_SESSION,
    mockLanguageLearningBase,
    mockLanguageLearningPhase3,
} from "../support/language-learning-mocks";
import { responseDto } from "../support/mock-data";

const TASK_LABELS = {
    DICTATION: /받아쓰기/,
    INTERPRETATION: /의미 쓰기/,
    REPEAT_AFTER_AUDIO: /따라 말하기/,
} as const;

test.describe("Language Learning Phase 3", () => {
    test.beforeEach(async ({ page }) => {
        await mockLanguageLearningBase(page);
        await mockLanguageLearningPhase3(page);
    });

    test("LL3-01 Listening 진입에서 오늘의 Set과 시작 동선을 표시한다", async ({ page }) => {
        await page.goto("/language-learning/listening");
        await expect(page.getByTestId("listening-landing-page")).toBeVisible();
        await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");
        await expect(page.getByTestId("listening-start-link")).toBeVisible();
        await expect(page.getByTestId("listening-start-link")).toHaveAttribute("href", /listening\/setup/);
    });

    for (const [name, tasks] of [
        ["D", ["DICTATION"]],
        ["R", ["REPEAT_AFTER_AUDIO"]],
        ["D+I", ["DICTATION", "INTERPRETATION"]],
        ["R+I", ["REPEAT_AFTER_AUDIO", "INTERPRETATION"]],
        ["D+R", ["DICTATION", "REPEAT_AFTER_AUDIO"]],
        ["D+I+R", ["DICTATION", "INTERPRETATION", "REPEAT_AFTER_AUDIO"]],
    ] as const) {
        test(`LL3-02-${name} 허용 Task 조합을 Session 생성 Payload로 전송한다`, async ({ page }) => {
            await page.goto("/language-learning/listening/setup");
            for (const task of Object.keys(TASK_LABELS) as Array<keyof typeof TASK_LABELS>) {
                const checkbox = page.getByRole("checkbox", { name: TASK_LABELS[task] });
                const shouldCheck = (tasks as readonly string[]).includes(task);
                if ((await checkbox.isChecked()) !== shouldCheck) {
                    await page.getByTestId(`listening-task-option-${task}`).click();
                }
            }

            const requestPromise = page.waitForRequest((request) =>
                request.url().endsWith("/language-learning/listening/sessions") &&
                request.method() === "POST",
            );
            await page.getByRole("button", { name: /Listening 시작/ }).click();
            const request = await requestPromise;
            const payload = request.postDataJSON() as {
                dailySetId: number;
                selectedTaskTypes: string[];
                idempotencyKey: string;
            };
            expect(payload.dailySetId).toBe(701);
            expect([...payload.selectedTaskTypes].sort()).toEqual([...tasks].sort());
            expect(payload.idempotencyKey).toBeTruthy();
        });
    }

    test("LL3-03 Interpretation 단독 선택을 차단한다", async ({ page }) => {
        await page.goto("/language-learning/listening/setup");
        await page.getByTestId("listening-task-option-DICTATION").click();
        await page.getByTestId("listening-task-option-INTERPRETATION").click();
        await expect(
            page.getByRole("alert").filter({ hasText: /받아쓰기 또는 따라 말하기 중 하나 이상이 필요/ }),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: /Listening 시작/ })).toBeDisabled();
    });

    test("LL3-04 Session에서 제출 전 원문을 노출하지 않고 Reference Audio와 선택 Task를 표시한다", async ({ page }) => {
        await page.goto("/language-learning/listening/session/702");
        await expect(page.getByTestId("listening-session-page")).toBeVisible();
        await expect(page.getByText("明日は友達と映画を見に行きます。", { exact: true })).toHaveCount(0);
        await expect(page.getByText(/받아쓰기/).first()).toBeVisible();
        await expect(page.getByText(/따라 말하기/).first()).toBeVisible();
    });

    test("LL3-05 결과에서 NOT_SELECTED와 실제 평가 점수를 구분한다", async ({ page }) => {
        await page.goto("/language-learning/listening/session/702/result");
        await expect(page.getByTestId("listening-result-page")).toBeVisible();
        await expect(page.getByTestId("listening-task-result-DICTATION").getByText("88", { exact: true })).toBeVisible();
        await expect(page.getByTestId("listening-task-result-INTERPRETATION")).toContainText(/미선택/);
        await expect(page.getByTestId("listening-task-result-REPEAT_AFTER_AUDIO")).toContainText(/80/);
    });

    test("LL3-06 실패 Task만 평가 Retry한다", async ({ page }) => {
        const failedResult = structuredClone(LANGUAGE_LEARNING_LISTENING_RESULT);
        const task = failedResult.attempts[0].tasks[0];
        task.status = "EVALUATION_FAILED";
        task.evaluation = null;
        task.evaluationErrorCode = "AI_EVALUATION_FAILED";
        await page.route("**/language-learning/listening/sessions/702/result", (route) =>
            fulfillApiJson(route, responseDto(failedResult)),
        );
        await page.goto("/language-learning/listening/session/702/result");

        const requestPromise = page.waitForRequest((request) =>
            request.url().includes("/attempts/801/retry-evaluation") &&
            request.method() === "POST",
        );
        await page.getByTestId("listening-task-result-DICTATION").getByRole("button", { name: /평가 다시 시도/ }).click();
        const request = await requestPromise;
        expect(request.postDataJSON()).toMatchObject({ taskType: "DICTATION" });
    });

    test("LL3-07 오류 신고의 Audio 보관 동의는 기본 해제다", async ({ page }) => {
        await page.goto("/language-learning/listening/session/702/result");
        await page.getByTestId("listening-task-result-REPEAT_AFTER_AUDIO").getByRole("button", { name: /오류 신고/ }).click();
        const dialog = page.getByRole("dialog");
        const consent = dialog.getByRole("checkbox");
        await expect(consent).not.toBeChecked();

        const requestPromise = page.waitForRequest((request) =>
            request.url().includes("/responses/903/reports") && request.method() === "POST",
        );
        await dialog.getByRole("button", { name: /신고 보내기/ }).click();
        const request = await requestPromise;
        expect(request.postDataJSON().consentToRetainAudio).toBe(false);
    });

    test("LL3-08 Dashboard에서 통합 능력·학습별 성과·Listening Task/Metric Trend를 표시한다", async ({ page }) => {
        await page.goto("/language-learning");
        await expect(page.getByTestId("dashboard-integrated-ability")).toBeVisible();
        await expect(page.getByTestId("dashboard-activity-listening")).toBeVisible();
        await expect(page.getByTestId("dashboard-listening-trends")).toBeVisible();
        const trend = page.getByTestId("dashboard-source-trend");
        await trend.getByRole("combobox").first().selectOption("LISTENING");
    });

    test("LL3-09 Dashboard 추천 숨기기는 BE에 위임한다", async ({ page }) => {
        await page.goto("/language-learning");
        const requestPromise = page.waitForRequest((request) =>
            request.url().includes("/recommendations/501/dismiss") && request.method() === "POST",
        );
        await page.getByTestId("dashboard-recommendations").getByRole("button").click();
        await requestPromise;
    });

    test("LL3-10 History에서 Listening 상세와 Audio 보관 상태를 표시한다", async ({ page }) => {
        await page.goto("/language-learning/history");
        await page.getByRole("button", { name: /Listening/ }).first().click();
        await page.getByTestId("history-activity-LISTENING:702").click();
        await expect(page.getByTestId("listening-history-detail")).toBeVisible();
        await expect(page.getByTestId("listening-history-detail")).toContainText("明日は友達と映画を見に行きます。");
    });

    test("LL3-11 만료 Audio는 재생 버튼 대신 만료 안내를 표시한다", async ({ page }) => {
        const expired = structuredClone(LANGUAGE_LEARNING_LISTENING_HISTORY_DETAIL);
        expired.attempts[0].referenceAudio = {
            available: false,
            expired: true,
            retentionUntil: "2026-08-22T12:00:00",
            deletedAt: "2026-08-22T12:01:00",
        };
        expired.attempts[0].attempt.tasks[2].audioAvailability = {
            available: false,
            expired: true,
            retentionUntil: "2026-08-22T12:00:00",
            deletedAt: "2026-08-22T12:01:00",
        };
        await page.route("**/language-learning/history/LISTENING%3A702", (route) =>
            fulfillApiJson(route, responseDto({ activityId: "LISTENING:702", source: "LISTENING", detail: expired })),
        );
        await page.goto("/language-learning/history");
        await page.getByRole("button", { name: /Listening/ }).first().click();
        await page.getByTestId("history-activity-LISTENING:702").click();
        await expect(page.getByTestId("listening-history-detail")).toContainText(/보관 기간/);
        await expect(page.getByTestId("listening-history-detail").getByRole("button", { name: /Reference Audio/ })).toHaveCount(0);
    });

    test("LL3-12 진행 중 Session은 Server 조회 결과를 기준으로 계속하기를 제공한다", async ({ page }) => {
        await page.route("**/language-learning/listening/sessions/active", (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    active: true,
                    session: LANGUAGE_LEARNING_LISTENING_SESSION,
                }),
            ),
        );
        await page.goto("/language-learning/listening");
        const resume = page.getByRole("link", { name: /계속하기/ });
        await expect(resume).toBeVisible();
        await expect(resume).toHaveAttribute("href", /listening\/session\/702/);
    });

    test("LL3-13 Topic/Keyword Hint는 BE가 제공한 Snapshot 내용을 표시한다", async ({ page }) => {
        await page.goto("/language-learning/listening/session/702");
        await page.getByRole("button", { name: /Topic 힌트/ }).click();
        await expect(page.getByTestId("listening-assistance-result")).toContainText("週末の予定");
        await page.getByRole("button", { name: /Keyword 힌트/ }).click();
        await expect(page.getByTestId("listening-assistance-result")).toContainText("友達 · 映画");
    });

    test("LL3-14 SHOW_ANSWER는 확인 후 원문을 공개하고 연습 상태로 표시한다", async ({ page }) => {
        await page.goto("/language-learning/listening/session/702");
        page.once("dialog", (dialog) => dialog.accept());
        await page.getByRole("button", { name: /정답 보기/ }).click();
        await expect(page.getByTestId("listening-revealed-answer")).toContainText("明日は友達と映画を見に行きます。");
        await expect(page.getByTestId("listening-revealed-answer")).toContainText(/공식 평가 제외/);
    });

    test("LL3-15 보관 기간 내 Repeat Audio는 BE Streaming Endpoint로 재생할 수 있다", async ({ page }) => {
        await page.goto("/language-learning/listening/session/702/result");
        const repeat = page.getByTestId("listening-task-result-REPEAT_AFTER_AUDIO");
        const requestPromise = page.waitForRequest((request) =>
            request.url().includes("/language-learning/listening/responses/903/audio") &&
            request.method() === "GET",
        );
        await repeat.getByRole("button", { name: /내 Audio 재생/ }).click();
        await requestPromise;
        await expect(repeat.locator("audio")).toBeVisible();
    });

    test("LL3-16 Learning Settings에서 Listening 목표와 기본 Task 조합을 저장한다", async ({ page }) => {
        await page.goto("/language-learning/settings");
        const goal = page.getByLabel(/하루 Listening 목표/);
        await expect(goal).toHaveValue("5");
        await goal.fill("7");

        const interpretation = page.getByRole("checkbox", { name: /의미 쓰기/ });
        await page.getByTestId("listening-setting-task-option-INTERPRETATION").click();
        await expect(interpretation).toBeChecked();

        const requestPromise = page.waitForRequest((request) =>
            request.url().endsWith("/language-learning/settings") &&
            request.method() === "PATCH",
        );
        await page.getByRole("button", { name: /설정 저장/ }).click();
        const request = await requestPromise;
        expect(request.postDataJSON()).toMatchObject({
            dailyListeningGoalCount: 7,
            defaultListeningTaskTypes: ["DICTATION", "INTERPRETATION"],
        });
    });

    test("LL3-17 기존 Dashboard Widget isolation 회귀를 유지한다", async ({ page }) => {
        await page.route("**/language-learning/dashboard**", (route) =>
            fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_DASHBOARD, speakingSummary: null })),
        );
        await page.goto("/language-learning");
        await expect(page.getByText(/이 위젯을 표시하지 못했습니다/)).toBeVisible();
        await expect(page.getByTestId("dashboard-activity-listening")).toBeVisible();
    });
});
