import { expect, test } from "../fixtures/mock-test";

import { fulfillApiJson } from "../support/api-mocks";
import {
    LANGUAGE_LEARNING_DASHBOARD,
    LANGUAGE_LEARNING_LISTENING_HISTORY_DETAIL,
    LANGUAGE_LEARNING_LISTENING_RESULT,
    LANGUAGE_LEARNING_LISTENING_SESSION,
    mockLanguageLearningBase,
    mockLanguageLearningListening,
} from "../support/language-learning-mocks";
import { responseDto } from "../support/mock-data";



test.describe("Language Learning Listening", () => {
    test.beforeEach(async ({ page }) => {
        await mockLanguageLearningBase(page);
        await mockLanguageLearningListening(page);
    });

    test("LLL-01 Listening 진입만으로 문제를 생성하지 않고 3가지 학습 유형을 표시한다", async ({ page }) => {
        let createCalls = 0;
        page.on("request", (request) => {
            if (request.url().endsWith("/language-learning/listening/daily-sets") && request.method() === "POST") {
                createCalls += 1;
            }
        });

        await page.goto("/language-learning/listening");
        await expect(page.getByTestId("listening-landing-page")).toBeVisible();
        await expect(page.getByTestId("listening-mode-DICTATION")).toContainText(/받아쓰기/);
        await expect(page.getByTestId("listening-mode-COMPREHENSION")).toContainText(/답 고르기/);
        await expect(page.getByTestId("listening-mode-SUMMARY")).toContainText(/핵심 정리/);
        expect(createCalls).toBe(0);
    });

    for (const [mode, tasks] of [
        ["DICTATION", ["DICTATION", "INTERPRETATION"]],
        ["COMPREHENSION", ["COMPREHENSION"]],
        ["SUMMARY", ["SUMMARY"]],
    ] as const) {
        test(`LLL-02-${mode} 선택한 유형만 Daily Set과 Session으로 시작한다`, async ({ page }) => {
            await page.goto("/language-learning/listening");

            const setRequestPromise = page.waitForRequest((request) =>
                request.url().endsWith("/language-learning/listening/daily-sets") &&
                request.method() === "POST",
            );
            const sessionRequestPromise = page.waitForRequest((request) =>
                request.url().endsWith("/language-learning/listening/sessions") &&
                request.method() === "POST",
            );

            await page.getByTestId(`listening-mode-${mode}`).getByRole("button").click();

            const setRequest = await setRequestPromise;
            expect(setRequest.postDataJSON()).toMatchObject({ learningMode: mode });

            const sessionRequest = await sessionRequestPromise;
            const payload = sessionRequest.postDataJSON() as { selectedTaskTypes: string[] };
            expect([...payload.selectedTaskTypes].sort()).toEqual([...tasks].sort());
        });
    }

    test("LLL-03 유형 상태에서 진행 중인 받아쓰기를 이어서 할 수 있다", async ({ page }) => {
        await page.route("**/api/v1/language-learning/listening/sessions/active", (route) =>
            fulfillApiJson(route, responseDto({ active: true, session: LANGUAGE_LEARNING_LISTENING_SESSION })),
        );
        await page.goto("/language-learning/listening");
        const card = page.getByTestId("listening-mode-DICTATION");
        await expect(card).toContainText(/진행 중/);
        await expect(card.getByRole("link")).toHaveAttribute("href", /listening\/session\/702/);
    });

    test("LLL-03A 준비 중 카드에서 문제 생성 수와 Audio 준비 수를 분리해 표시한다", async ({ page }) => {
        await page.route("**/api/v1/language-learning/listening/today/status", (route) =>
            fulfillApiJson(route, responseDto([
                { learningMode: "DICTATION", dailySetId: null, latestSessionId: null, status: null, latestSessionStatus: null, completedItemCount: 0, evaluatedItemCount: 0, submittedItemCount: 0, terminalItemCount: 0, answerRevealedItemCount: 0, physicalItemCount: 0, readyItemCount: 0, targetItemCount: 0, completed: false },
                { learningMode: "COMPREHENSION", dailySetId: 703, latestSessionId: null, status: "PARTIAL", latestSessionStatus: null, completedItemCount: 0, evaluatedItemCount: 0, submittedItemCount: 0, terminalItemCount: 0, answerRevealedItemCount: 0, physicalItemCount: 5, readyItemCount: 2, targetItemCount: 5, completed: false },
                { learningMode: "SUMMARY", dailySetId: null, latestSessionId: null, status: null, latestSessionStatus: null, completedItemCount: 0, evaluatedItemCount: 0, submittedItemCount: 0, terminalItemCount: 0, answerRevealedItemCount: 0, physicalItemCount: 0, readyItemCount: 0, targetItemCount: 0, completed: false },
            ])),
        );

        await page.goto("/language-learning/listening");
        const card = page.getByTestId("listening-mode-COMPREHENSION");
        await expect(card).toContainText(/문제 생성 5\/5/);
        await expect(card).toContainText(/Audio 준비 2\/5/);
    });

    test("LLL-03B 정답 공개 문항은 학습 완료 수에 포함하고 평가 반영 수와 별도로 설명한다", async ({ page }) => {
        await page.route("**/api/v1/language-learning/listening/today/status", (route) =>
            fulfillApiJson(route, responseDto([
                { learningMode: "DICTATION", dailySetId: 701, latestSessionId: 702, status: "READY", latestSessionStatus: "COMPLETED", completedItemCount: 4, evaluatedItemCount: 4, submittedItemCount: 5, terminalItemCount: 5, answerRevealedItemCount: 1, physicalItemCount: 5, readyItemCount: 5, targetItemCount: 5, completed: true },
                { learningMode: "COMPREHENSION", dailySetId: null, latestSessionId: null, status: null, latestSessionStatus: null, completedItemCount: 0, evaluatedItemCount: 0, submittedItemCount: 0, terminalItemCount: 0, answerRevealedItemCount: 0, physicalItemCount: 0, readyItemCount: 0, targetItemCount: 0, completed: false },
                { learningMode: "SUMMARY", dailySetId: null, latestSessionId: null, status: null, latestSessionStatus: null, completedItemCount: 0, evaluatedItemCount: 0, submittedItemCount: 0, terminalItemCount: 0, answerRevealedItemCount: 0, physicalItemCount: 0, readyItemCount: 0, targetItemCount: 0, completed: false },
            ])),
        );

        await page.goto("/language-learning/listening");
        const card = page.getByTestId("listening-mode-DICTATION");
        await expect(card).toContainText(/학습 완료 5\/5/);
        await expect(card).toContainText(/평가 반영 4\/5/);
        await expect(card).toContainText(/정답 공개 1개/);
        await expect(card).not.toContainText(/진행 4\/5/);
    });

    test("LLL-04 Session에서 제출 전 원문을 노출하지 않고 Reference Audio와 선택 Task를 표시한다", async ({ page }) => {
        await page.goto("/language-learning/listening/session/702");
        await expect(page.getByTestId("listening-session-page")).toBeVisible();
        await expect(page.getByText("明日は友達と映画を見に行きます。", { exact: true })).toHaveCount(0);
        await expect(page.getByText(/받아쓰기/).first()).toBeVisible();
        await expect(page.getByText(/따라 말하기/).first()).toBeVisible();
    });

    test("LLL-05 결과에서 미선택 Task는 숨기고 선택한 Task의 실제 평가 점수를 표시한다", async ({ page }) => {
        await page.goto("/language-learning/listening/session/702/result");
        await expect(page.getByTestId("listening-result-page")).toBeVisible();
        await expect(page.getByTestId("listening-task-result-DICTATION").getByText("88", { exact: true })).toBeVisible();
        await expect(page.getByTestId("listening-task-result-INTERPRETATION")).toHaveCount(0);
        await expect(page.getByTestId("listening-task-result-REPEAT_AFTER_AUDIO")).toContainText(/80/);
    });

    test("LLL-05A 마지막 답안 뒤에는 중간 점수를 숨기고 전체 평가 완료를 기다린다", async ({ page }) => {
        const pending = structuredClone(LANGUAGE_LEARNING_LISTENING_RESULT);
        pending.status = "EVALUATING";
        pending.learnedItemCount = 0;
        pending.evaluatedItemCount = 0;
        pending.averageScore = null;
        pending.attempts[0].status = "EVALUATING";
        pending.attempts[0].overallScore = null;
        pending.attempts[0].coverage = 0;
        pending.attempts[0].tasks = pending.attempts[0].tasks.map((task) =>
            task.status === "NOT_SELECTED"
                ? task
                : { ...task, status: "EVALUATING", evaluation: null }
        );
        let evaluationComplete = false;
        await page.route("**/api/v1/language-learning/listening/sessions/702/result", (route) =>
            fulfillApiJson(route, responseDto(evaluationComplete ? LANGUAGE_LEARNING_LISTENING_RESULT : pending)),
        );

        await page.goto("/language-learning/listening/session/702/result");
        await expect(page.getByTestId("listening-result-evaluation-status")).toBeVisible();
        await expect(page.getByTestId("listening-result-evaluated-count")).toHaveText("0/1");
        await expect(page.getByTestId("listening-result-evaluating-count")).toHaveText("1");
        await expect(page.getByTestId("listening-result-average-score")).toHaveText("—");
        // A later polling response, not a reload or a relaxed assertion, reveals the score.
        evaluationComplete = true;
        await expect(page.getByTestId("listening-result-average-score")).toHaveText("84");
        await expect(page.getByTestId("listening-result-evaluation-status")).toHaveCount(0);
    });

    test("LLL-05B 평가 오류로 제외된 문항은 0점 처리하지 않고 결과 반영 수를 표시한다", async ({ page }) => {
        const partial = structuredClone(LANGUAGE_LEARNING_LISTENING_RESULT);
        partial.evaluatedItemCount = 0;
        partial.learnedItemCount = 0;
        partial.averageScore = null;
        partial.attempts[0].status = "EVALUATED";
        partial.attempts[0].overallScore = 88;
        partial.attempts[0].coverage = 0.5;
        partial.attempts[0].tasks[0].status = "EVALUATED";
        partial.attempts[0].tasks[2].status = "EVALUATION_FAILED";
        partial.attempts[0].tasks[2].evaluation = null;
        partial.attempts[0].tasks[2].evaluationErrorCode = "AI_EVALUATION_FAILED";
        await page.route("**/api/v1/language-learning/listening/sessions/702/result", (route) =>
            fulfillApiJson(route, responseDto(partial)),
        );

        await page.goto("/language-learning/listening/session/702/result");
        await expect(page.getByTestId("listening-result-page")).toBeVisible();
        await expect(page.getByTestId("listening-result-partial-notice")).toContainText(/0문제만 최종 점수에 반영/);
        await expect(page.getByTestId("listening-task-result-REPEAT_AFTER_AUDIO")).toContainText(/평가 실패/);
    });

    test("LLL-06 실패 Task만 평가 Retry한다", async ({ page }) => {
        const failedResult = structuredClone(LANGUAGE_LEARNING_LISTENING_RESULT);
        const task = failedResult.attempts[0].tasks[0];
        task.status = "EVALUATION_FAILED";
        task.evaluation = null;
        task.evaluationErrorCode = "AI_EVALUATION_FAILED";
        await page.route("**/api/v1/language-learning/listening/sessions/702/result", (route) =>
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

    test("LLL-07 오류 신고의 Audio 보관 동의는 기본 해제다", async ({ page }) => {
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

    test("LLL-08 Dashboard에서 통합 능력·학습별 성과·Listening Task/Metric Trend를 표시한다", async ({ page }) => {
        await page.goto("/language-learning");
        await expect(page.getByTestId("dashboard-integrated-ability")).toBeVisible();
        await expect(page.getByTestId("dashboard-activity-listening")).toBeVisible();
        await expect(page.getByTestId("dashboard-listening-trends")).toBeVisible();
        const trend = page.getByTestId("dashboard-source-trend");
        await trend.getByRole("combobox").first().selectOption("LISTENING");
    });

    test("LLL-09 Dashboard 추천 숨기기는 BE에 위임한다", async ({ page }) => {
        await page.goto("/language-learning");
        const requestPromise = page.waitForRequest((request) =>
            request.url().includes("/recommendations/501/dismiss") && request.method() === "POST",
        );
        await page.getByTestId("dashboard-recommendations").getByRole("button", { name: "추천 숨기기", exact: true }).click();
        await requestPromise;
    });

    test("LLL-10 History에서 Listening 상세와 Audio 보관 상태를 표시한다", async ({ page }) => {
        await page.goto("/language-learning/history");
        await page.getByRole("button", { name: "듣기", exact: true }).click();
        await page.getByTestId("history-activity-LISTENING:702").click();
        await expect(page.getByTestId("listening-history-detail")).toBeVisible();
        await expect(page.getByTestId("listening-history-detail")).toContainText("明日は友達と映画を見に行きます。");
    });

    test("LLL-11 만료 Audio는 재생 버튼 대신 만료 안내를 표시한다", async ({ page }) => {
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
        await page.route("**/api/v1/language-learning/history/LISTENING%3A702", (route) =>
            fulfillApiJson(route, responseDto({ activityId: "LISTENING:702", source: "LISTENING", detail: expired })),
        );
        await page.goto("/language-learning/history");
        await page.getByRole("button", { name: "듣기", exact: true }).click();
        await page.getByTestId("history-activity-LISTENING:702").click();
        await expect(page.getByTestId("listening-history-detail")).toContainText(/보관 기간/);
        await expect(page.getByTestId("listening-history-detail").getByRole("button", { name: /Reference Audio/ })).toHaveCount(0);
    });

    test("LLL-11A History Reference Audio의 실패를 표시하고 같은 버튼으로 재시도한다", async ({ page }) => {
        let audioRequests = 0;
        await page.route("**/api/v1/language-learning/listening/items/711/audio", async (route) => {
            if (route.request().method() !== "GET") return route.fallback();
            audioRequests += 1;
            if (audioRequests === 1) {
                await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
                return;
            }
            await route.fallback();
        });

        await page.goto("/language-learning/history");
        await page.getByRole("button", { name: "듣기", exact: true }).click();
        await page.getByTestId("history-activity-LISTENING:702").click();
        const detail = page.getByTestId("listening-history-detail");
        const play = detail.getByRole("button", { name: /Reference Audio/ });
        await play.click();
        await expect(detail.getByRole("alert")).toContainText(/Reference Audio/);
        await expect(play).toBeEnabled();
        await play.click();
        await expect(detail.locator("audio")).toBeVisible();
        await expect(detail.getByRole("alert")).toHaveCount(0);
        expect(audioRequests).toBe(2);
    });

    test("LLL-11B History Audio를 가져오는 동안 로딩 상태로 중복 클릭을 막는다", async ({ page }) => {
        let release = () => {};
        const gate = new Promise<void>((resolve) => { release = resolve; });
        let audioRequests = 0;
        await page.route("**/api/v1/language-learning/listening/items/711/audio", async (route) => {
            if (route.request().method() !== "GET") return route.fallback();
            audioRequests += 1;
            await gate;
            await route.fallback();
        });

        try {
            await page.goto("/language-learning/history");
            await page.getByRole("button", { name: "듣기", exact: true }).click();
            await page.getByTestId("history-activity-LISTENING:702").click();
            const detail = page.getByTestId("listening-history-detail");
            const requested = page.waitForRequest((request) =>
                request.method() === "GET" && request.url().includes("/listening/items/711/audio"),
            );
            await detail.getByRole("button", { name: /Reference Audio/ }).click();
            await requested;
            await expect(detail.getByRole("button", { name: /Audio 불러오는 중/ })).toBeDisabled();
            expect(audioRequests).toBe(1);
            release();
            await expect(detail.locator("audio")).toBeVisible();
        } finally {
            release();
        }
    });

    test("LLL-12 진행 중 Session은 Server 조회 결과를 기준으로 계속하기를 제공한다", async ({ page }) => {
        await page.route("**/api/v1/language-learning/listening/sessions/active", (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    active: true,
                    session: LANGUAGE_LEARNING_LISTENING_SESSION,
                }),
            ),
        );
        await page.goto("/language-learning/listening");
        const resume = page.getByTestId("listening-mode-DICTATION").getByRole("link", { name: /계속하기/ });
        await expect(resume).toBeVisible();
        await expect(resume).toHaveAttribute("href", /listening\/session\/702/);
    });

    test("LLL-13 Topic/Keyword Hint는 BE가 제공한 Snapshot 내용을 표시한다", async ({ page }) => {
        await page.goto("/language-learning/listening/session/702");
        await page.getByRole("button", { name: /Topic 힌트/ }).click();
        await expect(page.getByTestId("listening-assistance-result")).toContainText("週末の予定");
        await page.getByRole("button", { name: /Keyword 힌트/ }).click();
        await expect(page.getByTestId("listening-assistance-result")).toContainText("友達 · 映画");
    });

    test("LLL-14 SHOW_ANSWER는 확인 후 원문을 공개하고 연습 상태로 표시한다", async ({ page }) => {
        await page.goto("/language-learning/listening/session/702");
        page.once("dialog", (dialog) => dialog.accept());
        await page.getByRole("button", { name: /정답 보기/ }).click();
        await expect(page.getByTestId("listening-revealed-answer")).toContainText("明日は友達と映画を見に行きます。");
        await expect(page.getByTestId("listening-revealed-answer")).toContainText(/공식 평가 제외/);
    });

    test("LLL-15 보관 기간 내 Repeat Audio는 BE Streaming Endpoint로 재생할 수 있다", async ({ page }) => {
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

    test("LLL-15A 결과 화면은 선택한 Task만 표시하고 Reference Audio를 다시 들을 수 있다", async ({ page }) => {
        await page.goto("/language-learning/listening/session/702/result");
        await expect(page.getByTestId("listening-task-result-INTERPRETATION")).toHaveCount(0);
        await expect(page.getByText("표기 정확도")).toBeVisible();

        const player = page.getByTestId("listening-result-reference-audio-711");
        const requestPromise = page.waitForRequest((request) =>
            request.url().includes("/language-learning/listening/items/711/audio") &&
            request.method() === "GET",
        );
        await player.getByRole("button", { name: /Reference Audio/ }).click();
        await requestPromise;
        await expect(player.locator("audio")).toBeVisible();
    });

    test("LLL-16 Learning Settings에서 Listening 목표와 기본 Task 조합을 저장한다", async ({ page }) => {
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

    test("LLL-17 기존 Dashboard Widget isolation 회귀를 유지한다", async ({ page }) => {
        await page.route("**/api/v1/language-learning/dashboard**", (route) =>
            fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_DASHBOARD, trends: { ...LANGUAGE_LEARNING_DASHBOARD.trends, sourceMetrics: null } })),
        );
        await page.goto("/language-learning");
        await expect(page.getByText(/이 위젯을 표시하지 못했습니다/)).toBeVisible();
        await expect(page.getByTestId("dashboard-activity-listening")).toBeVisible();
    });
});
