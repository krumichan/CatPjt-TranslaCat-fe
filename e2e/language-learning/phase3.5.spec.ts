import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/mock-test";

import { fulfillApiJson } from "../support/api-mocks";
import {
    LEVEL_TEST_DICTATION,
    LEVEL_TEST_HISTORY,
    LEVEL_TEST_INTERPRETATION,
    LEVEL_TEST_LISTENING,
    LEVEL_TEST_QUESTION,
    LEVEL_TEST_READING_DISCOURSE,
    LEVEL_TEST_SENTENCE_ORDER,
    LEVEL_TEST_SESSION,
    LEVEL_TEST_SPEAKING,
    LEVEL_TEST_WRITING,
    mockLanguageLearningPhase35,
} from "../support/language-learning-phase35-mocks";
import {
    LANGUAGE_LEARNING_DAILY_SET,
    LANGUAGE_LEARNING_LISTENING_RESULT,
    mockLanguageLearningBase,
    mockLanguageLearningPhase3,
} from "../support/language-learning-mocks";
import { mockSpeakingMediaRecorder } from "../support/media-recorder-mock";
import { errorDto, responseDto } from "../support/mock-data";

async function overrideQuestion(
    page: Page,
    question: typeof LEVEL_TEST_QUESTION,
) {
    await page.unroute("**/language-learning/level-test/sessions/3101/current-item");
    await page.route("**/language-learning/level-test/sessions/3101/current-item", (route) =>
        fulfillApiJson(route, responseDto(question)),
    );
}

async function mockPlayableAudio(page: Page) {
    await page.addInitScript(() => {
        Object.defineProperty(HTMLMediaElement.prototype, "play", {
            configurable: true,
            value: async () => undefined,
        });
    });
}

test.describe("Language Learning Phase 3.5", () => {
    test.beforeEach(async ({ page }) => {
        await mockLanguageLearningBase(page);
        await mockLanguageLearningPhase35(page);
    });

    test("LL35-01 Landing에 20문항·6영역·마이크 안내를 표시한다", async ({ page }) => {
        await page.goto("/language-learning/level-test");
        await expect(page.getByText(/총 20문항/)).toBeVisible();
        for (const domain of ["어휘", "문법", "읽기", "듣기", "쓰기", "말하기"]) {
            await expect(page.getByText(domain, { exact: true }).first()).toBeVisible();
        }
        await expect(page.getByText(/마이크가 필요/)).toBeVisible();
    });

    test("LL35-02 Start는 POST /sessions와 idempotencyKey를 사용한다", async ({ page }) => {
        await page.goto("/language-learning/level-test");
        const requestPromise = page.waitForRequest((request) =>
            request.url().endsWith("/language-learning/level-test/sessions") &&
            request.method() === "POST",
        );
        await page.getByRole("button", { name: /테스트 시작/ }).click();
        const request = await requestPromise;
        expect(request.postDataJSON()).toMatchObject({ type: "RECHECK" });
        expect(request.postDataJSON().idempotencyKey).toBeTruthy();
        await expect(page).toHaveURL(/level-test\/session\/3101/);
    });

    test("LL35-03 진행 중 Session은 새 테스트 대신 이어하기를 제공한다", async ({ page }) => {
        await page.route("**/language-learning/level-test/status", (route) =>
            fulfillApiJson(route, responseDto({
                profileState: "ACTIVE",
                initialLevelTestCompleted: true,
                recheckRecommended: false,
                activeSessionId: 3101,
                currentQuestionNumber: 7,
                baseLevelScore: 76,
                proficiencyBand: "UPPER_INTERMEDIATE",
            })),
        );
        await page.goto("/language-learning/level-test");
        await page.getByRole("button", { name: /이어하기/ }).click();
        await expect(page).toHaveURL(/level-test\/session\/3101/);
    });

    test("LL35-04 Progress와 Domain Stepper를 표시하고 내부 Complexity Band는 숨긴다", async ({ page }) => {
        await page.goto("/language-learning/level-test/session/3101");
        await expect(page.getByText("1 / 20", { exact: true })).toBeVisible();
        await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
        await expect(page.getByText(/complexity/i)).toHaveCount(0);
        await expect(page.getByText(/band 4/i)).toHaveCount(0);
    });

    test("LL35-05 Choice는 선택 후 명시적 제출하고 item 단위 Payload를 전송한다", async ({ page }) => {
        await page.goto("/language-learning/level-test/session/3101");
        await page.getByRole("radio").first().click();
        const requestPromise = page.waitForRequest((request) =>
            request.url().includes("/items/3201/answers") && request.method() === "POST",
        );
        await page.getByRole("button", { name: /답변 제출/ }).click();
        const request = await requestPromise;
        expect(request.postDataJSON()).toMatchObject({ selectedOptionKey: "A" });
        expect(request.postDataJSON().idempotencyKey).toBeTruthy();
    });

    test("LL35-06 Sentence Order는 정답 문장을 노출하지 않고 버튼·키보드로 완성할 수 있다", async ({ page }) => {
        await overrideQuestion(page, LEVEL_TEST_SENTENCE_ORDER);
        await page.goto("/language-learning/level-test/session/3101");

        // Sentence Order의 promptText에는 채점/이력용 완성 문장이 들어갈 수 있으므로
        // 풀이 화면에서는 절대 정답 문장 전체를 렌더링하지 않는다.
        await expect(
            page.getByText(LEVEL_TEST_SENTENCE_ORDER.promptText, { exact: true }),
        ).toHaveCount(0);
        await expect(page.getByText(LEVEL_TEST_SENTENCE_ORDER.instruction)).toBeVisible();

        const remaining = page.getByRole("button", { name: /昨日|友達と|映画を|見ました/ });
        for (let index = 0; index < 4; index += 1) {
            await remaining.first().focus();
            await page.keyboard.press("Enter");
        }
        await expect(page.getByRole("button", { name: /답변 제출/ })).toBeEnabled();
    });

    test("LL35-07 Reading 계열도 공통 Question Shell에서 Prompt와 답변 방식을 분리한다", async ({ page }) => {
        await overrideQuestion(page, {
            ...LEVEL_TEST_QUESTION,
            itemId: 3207,
            questionNumber: 7,
            domain: "READING",
            itemType: "READING_GIST",
            promptText: "長い本文\n\nこの文章の要旨として最も適切なものは？",
        });
        await page.goto("/language-learning/level-test/session/3101");
        await expect(page.getByText(/長い本文/)).toBeVisible();
        await expect(page.getByText(/선택/).first()).toBeVisible();

        await overrideQuestion(page, LEVEL_TEST_READING_DISCOURSE);
        await page.reload();
        await expect(page.locator('[data-level-test-emphasis="true"]')).toHaveText(
            LEVEL_TEST_READING_DISCOURSE.emphasisText,
        );
    });

    test("LL35-08 Level Test Listening은 정상속도만 제공하고 최대 2회 재생한다", async ({ page }) => {
        await mockPlayableAudio(page);
        await overrideQuestion(page, LEVEL_TEST_LISTENING);
        await page.goto("/language-learning/level-test/session/3101");
        const play = page.getByRole("button", { name: "재생" });
        await play.click();
        await play.click();
        await expect(play).toBeDisabled();
        await expect(page.getByText(/0\.75/)).toHaveCount(0);
    });

    test("LL35-09 Dictation은 학습 언어 답변 Badge와 Text 입력을 제공한다", async ({ page }) => {
        await overrideQuestion(page, LEVEL_TEST_DICTATION);
        await page.goto("/language-learning/level-test/session/3101");
        await expect(page.getByText(/답변 언어: 日本語/)).toBeVisible();
        await expect(page.getByRole("textbox")).toBeVisible();
    });

    test("LL35-10 Interpretation은 원문 언어 답변 Badge를 표시한다", async ({ page }) => {
        await overrideQuestion(page, LEVEL_TEST_INTERPRETATION);
        await page.goto("/language-learning/level-test/session/3101");
        await expect(page.getByText(/답변 언어: 한국어/)).toBeVisible();
    });

    test("LL35-11 Writing은 BE maxAnswerLength를 Textarea에 반영한다", async ({ page }) => {
        await overrideQuestion(page, LEVEL_TEST_WRITING);
        await page.goto("/language-learning/level-test/session/3101");
        await expect(page.getByRole("textbox")).toHaveAttribute("maxlength", "800");
        await expect(page.getByTestId("level-test-task-guidance")).toBeVisible();
        await expect(page.getByText("같은 고객 정보를 세 개의 파일에 중복 입력하고 있음")).toBeVisible();
        await expect(page.getByText(LEVEL_TEST_WRITING.promptText, { exact: true })).toHaveCount(1);
    });

    test("LL35-12 Speaking Repeat은 원본 음성을 먼저 재생하고 Recorder로 녹음·미리듣기·업로드한다", async ({ page }) => {
        await mockPlayableAudio(page);
        await mockSpeakingMediaRecorder(page);
        await overrideQuestion(page, LEVEL_TEST_SPEAKING);
        await page.goto("/language-learning/level-test/session/3101");
        const referenceRequest = page.waitForRequest((request) =>
            request.url().includes("/items/3218/reference-audio") && request.method() === "GET",
        );
        await page.getByRole("button", { name: /원본 음성 듣기/ }).click();
        await referenceRequest;
        await expect(page.getByTestId("speaking-repeat-reference-audio")).toBeVisible();
        await expect(page.getByText(LEVEL_TEST_SPEAKING.promptText, { exact: true })).toHaveCount(0);
        await page.getByRole("button", { name: /녹음 시작/ }).click();
        await page.getByRole("button", { name: /녹음 정지/ }).click();
        await expect(page.getByLabel(/녹음 미리듣기/)).toBeVisible();
        const requestPromise = page.waitForRequest((request) =>
            request.url().includes("/items/3218/answers/audio") && request.method() === "POST",
        );
        await page.getByRole("button", { name: /답변 제출/ }).click();
        await requestPromise;
    });

    test("LL35-13 마이크 거부·장치 없음·사용 중을 서로 다른 안내로 구분한다", async ({ browser }) => {
        for (const [mode, expected] of [
            ["denied", /권한이 거부/],
            ["no-device", /마이크를 찾을 수 없/],
            ["busy", /다른 앱에서 사용 중/],
        ] as const) {
            const context = await browser.newContext();
            const page = await context.newPage();
            await mockSpeakingMediaRecorder(page, mode);
            await mockLanguageLearningBase(page);
            await mockLanguageLearningPhase35(page, LEVEL_TEST_SPEAKING);
            await page.goto("/language-learning/level-test/session/3101");
            await page.getByRole("button", { name: /마이크 허용/ }).click();
            await expect(page.getByText(expected)).toBeVisible();
            await context.close();
        }
    });

    test("LL35-14 평가 중 Polling에서도 기존 Question을 유지하고 Loading 화면으로 깜빡이지 않는다", async ({ page }) => {
        await page.route("**/language-learning/level-test/sessions/3101", (route) =>
            fulfillApiJson(route, responseDto({ ...LEVEL_TEST_SESSION, status: "EVALUATING" })),
        );
        await overrideQuestion(page, { ...LEVEL_TEST_QUESTION, status: "EVALUATING" });
        await page.goto("/language-learning/level-test/session/3101");
        await expect(page.getByText(/답변을 평가하고 있습니다/)).toBeVisible();
        await page.waitForTimeout(2200);
        await expect(page.getByText(LEVEL_TEST_QUESTION.promptText)).toBeVisible();
    });

    test("LL35-15 평가 실패는 답변을 유지하고 해당 문항 평가만 Retry한다", async ({ page }) => {
        await overrideQuestion(page, { ...LEVEL_TEST_WRITING, status: "EVALUATION_FAILED" });
        await page.goto("/language-learning/level-test/session/3101");
        await expect(page.getByText(/답변은 저장/)).toBeVisible();
        const requestPromise = page.waitForRequest((request) =>
            request.url().includes("/evaluation/retry") && request.method() === "POST",
        );
        await page.getByRole("button", { name: /평가 다시 시도/ }).click();
        await requestPromise;
    });

    test("LL35-15A 음성 인식 불가 평가 결과는 평가 재시도 대신 재녹음을 요구한다", async ({ page }) => {
        await mockSpeakingMediaRecorder(page);
        await overrideQuestion(page, {
            ...LEVEL_TEST_SPEAKING,
            status: "EVALUATION_FAILED",
            evaluationReasonCode: "INVALID_AUDIO",
        });
        await page.goto("/language-learning/level-test/session/3101");

        await expect(page.getByTestId("level-test-rerecord-required")).toBeVisible();
        await expect(page.getByRole("button", { name: /평가 다시 시도/ })).toHaveCount(0);
        await page.getByRole("button", { name: /다시 녹음하기/ }).click();
        await page.getByRole("button", { name: /녹음 시작/ }).click();
        await page.getByRole("button", { name: /녹음 정지/ }).click();

        const requestPromise = page.waitForRequest((request) =>
            request.url().includes("/items/3218/answers/audio") && request.method() === "POST",
        );
        await page.getByRole("button", { name: /답변 제출/ }).click();
        await requestPromise;
    });

    test("LL35-16 새로고침 후 서버의 current-item을 기준으로 같은 문항을 복구한다", async ({ page }) => {
        await overrideQuestion(page, { ...LEVEL_TEST_WRITING, questionNumber: 17 });
        await page.goto("/language-learning/level-test/session/3101");
        await expect(page.getByText("17 / 20", { exact: true })).toBeVisible();
        await page.reload();
        await expect(page.getByText("17 / 20", { exact: true })).toBeVisible();
    });

    test("LL35-17 Result에 종합 점수·Band·6영역·내부 기준 안내를 표시한다", async ({ page }) => {
        await page.goto("/language-learning/level-test/result/3101");
        await expect(page.getByText("81", { exact: true })).toBeVisible();
        await expect(page.getByText(/UPPER INTERMEDIATE/)).toBeVisible();
        for (const score of [86, 80, 84, 78, 79, 77]) {
            await expect(page.getByText(String(score), { exact: true })).toBeVisible();
        }
        await expect(page.getByText(/CEFR/)).toBeVisible();
    });

    test("LL35-18 전용 History에서 Legacy와 Multi-skill을 함께 표시하고 0점으로 보정하지 않는다", async ({ page }) => {
        await page.goto("/language-learning/level-test/history");
        await expect(page.getByText(/Legacy Writing Level Test/)).toBeVisible();
        await expect(page.getByText(/Multi-skill Level Test/)).toBeVisible();
        await page.getByRole("link", { name: /Legacy Writing Level Test/ }).click();
        await expect(page.getByText(/기존 Writing Level Test는/)).toBeVisible();
        await expect(page.getByText("0", { exact: true })).toHaveCount(0);
        expect(LEVEL_TEST_HISTORY[1].domainScores).toBeNull();
    });

    test("LL35-19 Profile과 공통 History에서 Level Test 결과에 접근할 수 있다", async ({ page }) => {
        await page.goto("/language-learning/profile");
        await expect(page.getByRole("link", { name: /최근 결과/ })).toBeVisible();
        await page.goto("/language-learning/history");
        await expect(page.getByRole("button", { name: "레벨 테스트" })).toBeVisible();
        await page.getByRole("button", { name: "레벨 테스트" }).click();
        await expect(page.getByTestId("history-activity-LEVEL_TEST:3101")).toBeVisible();
    });

    test("LL35-20 Listening Playback·Independence와 Dashboard·Writing Complexity UI를 회귀 검증한다", async ({ page }) => {
        await mockLanguageLearningPhase3(page);
        await mockPlayableAudio(page);
        await page.goto("/language-learning/listening/session/702");
        const playbackRequest = page.waitForRequest((request) =>
            request.url().includes("/items/711/playbacks") && request.method() === "POST",
        );
        await page.getByRole("button", { name: /정상속도/ }).click();
        const playback = await playbackRequest;
        expect(playback.postDataJSON()).toMatchObject({
            attemptId: 801,
            playbackType: "NORMAL",
        });
        expect(playback.postDataJSON().clientEventId).toBeTruthy();

        await page.route("**/language-learning/listening/sessions/702/result", (route) =>
            fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_LISTENING_RESULT)),
        );
        await page.goto("/language-learning/listening/session/702/result");
        await expect(page.getByText(/독립 청취/).first()).toBeVisible();
        await expect(page.getByText(/정상속도 2회/)).toBeVisible();

        await page.goto("/language-learning");
        await expect(page.getByText(/독립 청취/).first()).toBeVisible();
        await page.route("**/language-learning/writing/daily", (route) =>
            fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_DAILY_SET)),
        );
        await page.goto("/language-learning/writing");
        await expect(page.getByText(/복잡한 문법·어휘·표현/)).toBeVisible();
    });

    test("LL35-21 실패 후 같은 문항 재제출은 동일 idempotencyKey를 재사용한다", async ({ page }) => {
        const keys: string[] = [];
        let attempts = 0;
        await page.unroute("**/language-learning/level-test/sessions/3101/items/*/answers");
        await page.route("**/language-learning/level-test/sessions/3101/items/*/answers", async (route) => {
            attempts += 1;
            keys.push(route.request().postDataJSON().idempotencyKey);
            if (attempts === 1) {
                await fulfillApiJson(route, errorDto("UPSTREAM_TIMEOUT"), 503);
                return;
            }
            await fulfillApiJson(
                route,
                responseDto({
                    sessionId: 3101,
                    itemId: 3201,
                    questionNumber: 1,
                    evaluable: true,
                    score: 88,
                    reasonCode: null,
                    completed: false,
                    nextQuestion: null,
                }),
            );
        });

        await page.goto("/language-learning/level-test/session/3101");
        await page.getByRole("radio").first().click();
        const submit = page.getByRole("button", { name: /답변 제출/ });
        await submit.click();
        await expect(page.getByRole("alert")).toBeVisible();
        await expect(submit).toBeEnabled();
        await submit.click();

        await expect.poll(() => keys.length).toBe(2);
        expect(keys[0]).toBeTruthy();
        expect(keys[1]).toBe(keys[0]);
    });

    test("LL35-22 빠른 이중 클릭은 같은 문항 POST를 한 번만 전송한다", async ({ page }) => {
        let submitCount = 0;
        await page.unroute("**/language-learning/level-test/sessions/3101/items/*/answers");
        await page.route("**/language-learning/level-test/sessions/3101/items/*/answers", async (route) => {
            submitCount += 1;
            await new Promise((resolve) => setTimeout(resolve, 250));
            await fulfillApiJson(
                route,
                responseDto({
                    sessionId: 3101,
                    itemId: 3201,
                    questionNumber: 1,
                    evaluable: true,
                    score: 88,
                    reasonCode: null,
                    completed: false,
                    nextQuestion: null,
                }),
            );
        });

        await page.goto("/language-learning/level-test/session/3101");
        await page.getByRole("radio").first().click();
        const submit = page.getByRole("button", { name: /답변 제출/ });
        await submit.evaluate((button: HTMLButtonElement) => {
            button.click();
            button.click();
        });

        await expect.poll(() => submitCount).toBe(1);
    });

    test("LL35-23 답변 성공 후 다음 문제 조회 실패가 이전 문항 재제출로 돌아가지 않는다", async ({ page }) => {
        let answerAccepted = false;
        let submitCount = 0;
        await page.unroute("**/language-learning/level-test/sessions/3101");
        await page.unroute("**/language-learning/level-test/sessions/3101/current-item");
        await page.unroute("**/language-learning/level-test/sessions/3101/items/*/answers");

        await page.route("**/language-learning/level-test/sessions/3101", (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    ...LEVEL_TEST_SESSION,
                    currentQuestionNumber: answerAccepted ? 2 : 1,
                }),
            ),
        );
        await page.route("**/language-learning/level-test/sessions/3101/current-item", (route) => {
            if (answerAccepted) {
                return fulfillApiJson(
                    route,
                    errorDto("QUESTION_CONTENT_INVALID"),
                    500,
                );
            }
            return fulfillApiJson(route, responseDto(LEVEL_TEST_QUESTION));
        });
        await page.route("**/language-learning/level-test/sessions/3101/items/*/answers", async (route) => {
            submitCount += 1;
            answerAccepted = true;
            await fulfillApiJson(
                route,
                responseDto({
                    sessionId: 3101,
                    itemId: 3201,
                    questionNumber: 1,
                    evaluable: true,
                    score: 88,
                    reasonCode: null,
                    completed: false,
                    nextQuestion: null,
                }),
            );
        });

        await page.goto("/language-learning/level-test/session/3101");
        await page.getByRole("radio").first().click();
        const nextQuestionFailure = page.waitForResponse(
            (response) =>
                response.url().includes("/sessions/3101/current-item") &&
                response.status() === 500,
        );
        await page.getByRole("button", { name: /답변 제출/ }).click();
        await nextQuestionFailure;

        await expect(page.getByRole("button", { name: /답변 제출/ })).toHaveCount(0);
        await expect(page.getByText(LEVEL_TEST_QUESTION.promptText)).toHaveCount(0);
        await expect.poll(() => submitCount).toBe(1);
    });

});
