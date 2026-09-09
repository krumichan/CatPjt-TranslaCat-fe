import { expect, test } from "../fixtures/mock-test";
import { fulfillApiJson } from "../support/api-mocks";
import {
    LANGUAGE_LEARNING_DAILY_SET,
    LANGUAGE_LEARNING_LISTENING_ATTEMPT,
    LANGUAGE_LEARNING_LISTENING_ITEM,
    LANGUAGE_LEARNING_LISTENING_SESSION,
    mockLanguageLearningBase,
    mockLanguageLearningListening,
} from "../support/language-learning-mocks";
import { responseDto } from "../support/mock-data";
import type { PracticeQuestion, PracticeSet } from "../../src/types/language-learning/practice";

const question = (order: number): PracticeQuestion => ({
    questionId: 400 + order,
    order,
    questionType: "SINGLE_CHOICE",
    difficulty: "CURRENT",
    complexityBand: 3,
    passageId: `passage-${order}`,
    passageText: `問題${order}の文章です。`,
    prompt: `問題${order}の質問です。`,
    options: [{ key: "A", text: "選択肢A" }, { key: "B", text: "選択肢B" }],
    skillTag: "MAIN_IDEA",
    targetExpression: null,
    reviewTarget: false,
    vocabularyCandidates: [],
    answered: false,
    correct: false,
    canRetry: false,
    attempts: [],
    correctAnswer: [],
    evidenceText: null,
    explanationOrigin: null,
    explanationLearning: null,
});

const practiceSet = (questions: PracticeQuestion[]): PracticeSet => ({
    practiceSetId: 401,
    learningDate: "2026-09-09",
    domain: "READING",
    mode: "COMPREHENSION",
    status: "ACTIVE",
    generationStatus: "GENERATING",
    generatedQuestionCount: questions.length,
    generationFailureMessage: null,
    questionCount: 5,
    answeredCount: 0,
    correctCount: 0,
    officialScore: null,
    complexityBand: 3,
    promptVersion: null,
    metrics: [],
    questions,
});

test.describe("Language Learning progressive generation", () => {
    test.beforeEach(async ({ page }) => { await mockLanguageLearningBase(page); });

    test("Writing exposes the first problem and preserves a draft when the next arrives", async ({ page }) => {
        let append = false;
        const items = LANGUAGE_LEARNING_DAILY_SET.items.map((item) => ({ ...item, canSubmit: true, answered: false, answeredToday: false, attempts: [] }));
        await page.route("**/language-learning/writing/daily?**", (route) => fulfillApiJson(route, responseDto({
            ...LANGUAGE_LEARNING_DAILY_SET,
            status: "GENERATING",
            sentenceCount: 5,
            generatedItemCount: append ? 2 : 1,
            generationFailureMessage: null,
            items: items.slice(0, append ? 2 : 1),
        })));
        await page.goto("/language-learning/writing");
        await page.getByTestId("daily-writing-type-translation").click();
        await expect(page.getByRole("textbox")).toHaveCount(1);
        await page.getByRole("textbox").fill("入力中の解答を保持してください。");
        append = true;
        await expect(page.getByRole("textbox")).toHaveCount(2);
        await expect(page.getByRole("textbox").first()).toHaveValue("入力中の解答を保持してください。");
        await expect(page.getByTestId("generation-progress")).toContainText("문제 준비 2/5");
        await expect(page.getByRole("button", { name: /2개.*평가/ })).toBeDisabled();
    });

    test("Writing retry preserves existing item IDs and the typed answer", async ({ page }) => {
        let retried = false;
        const first = { ...LANGUAGE_LEARNING_DAILY_SET.items[0], canSubmit: true, answered: false, answeredToday: false, attempts: [] };
        const value = () => ({ ...LANGUAGE_LEARNING_DAILY_SET, sentenceCount: 5, status: retried ? "GENERATING" : "PARTIAL", generationFailureMessage: retried ? null : "third-party generation error", items: [first] });
        await page.route("**/language-learning/writing/daily?**", (route) => fulfillApiJson(route, responseDto(value())));
        await page.route(`**/language-learning/writing/daily/${LANGUAGE_LEARNING_DAILY_SET.dailySetId}/retry-generation`, (route) => { retried = true; return fulfillApiJson(route, responseDto(value())); });
        await page.goto("/language-learning/writing");
        await page.getByTestId("daily-writing-type-translation").click();
        await page.getByRole("textbox").fill("失敗後も残る解答です。");
        await page.getByRole("button", { name: "나머지 문제 준비 재시도" }).click();
        await expect.poll(() => retried).toBe(true);
        await expect(page.getByRole("textbox")).toHaveValue("失敗後も残る解答です。");
        await expect(page.getByTestId("generation-progress")).toContainText("문제 준비 1/5");
    });

    test("Reading initially waits for one problem, then preserves the current choice during polling", async ({ page }) => {
        let count = 0;
        await page.route("**/language-learning/practice/sets/401", (route) => fulfillApiJson(route, responseDto(practiceSet(Array.from({ length: count }, (_, index) => question(index + 1))))));
        await page.goto("/language-learning/reading/session/401");
        await expect(page.getByTestId("generation-progress")).toContainText("문제 준비 0/5");
        count = 1;
        await expect(page.getByText("問題1の質問です。", { exact: true })).toBeVisible();
        const choice = page.getByRole("button", { name: "A 選択肢A", exact: true });
        await choice.click();
        count = 2;
        await expect(page.getByTestId("generation-progress")).toContainText("문제 준비 2/5");
        await expect(page.getByText("問題1の質問です。", { exact: true })).toBeVisible();
        await expect(choice).toHaveClass(/border-blue-500/);
    });

    test("Reading partial failure retries missing problems without clearing an existing choice", async ({ page }) => {
        let retried = false;
        const value = (): PracticeSet => ({ ...practiceSet([question(1)]), generationStatus: retried ? "GENERATING" : "PARTIAL", generationFailureMessage: retried ? null : "provider failure" });
        await page.route("**/language-learning/practice/sets/401", (route) => fulfillApiJson(route, responseDto(value())));
        await page.route("**/language-learning/practice/sets/401/retry-generation", (route) => { retried = true; return fulfillApiJson(route, responseDto(value())); });
        await page.goto("/language-learning/reading/session/401");
        const choice = page.getByRole("button", { name: "B 選択肢B", exact: true });
        await choice.click();
        await page.getByRole("button", { name: "나머지 문제 준비 재시도" }).click();
        await expect.poll(() => retried).toBe(true);
        await expect(choice).toHaveClass(/border-blue-500/);
        await expect(page.getByText("問題1の質問です。", { exact: true })).toBeVisible();
    });

    test("Reading does not show completion for an answered partial set", async ({ page }) => {
        const first = { ...question(1), answered: true, correct: true, correctAnswer: ["A"], attempts: [{ attemptId: 901, attemptNo: 1, answer: ["A"], correct: true, official: true, submittedAt: "2026-09-09T12:00:00" }] };
        const value = { ...practiceSet([first]), status: "COMPLETED", answeredCount: 1, correctCount: 1 };
        await page.route("**/language-learning/practice/sets/401", (route) => fulfillApiJson(route, responseDto(value)));
        await page.goto("/language-learning/reading/session/401");
        await expect(page.getByTestId("generation-progress")).toContainText("문제 준비 1/5");
        await expect(page.getByText("問題1の質問です。", { exact: true })).toBeVisible();
    });

    test("Listening starts with one playable item before the other four are generated", async ({ page }) => {
        await mockLanguageLearningListening(page);
        await page.route("**/language-learning/listening/daily-sets", (route) => fulfillApiJson(route, responseDto({
            dailySetId: 701,
            learningMode: "DICTATION",
            status: "PARTIAL",
            targetItemCount: 5,
            physicalItemCount: 1,
            readyItemCount: 1,
            failureReason: null,
            generationInProgress: true,
            items: [{ itemId: 711, itemIndex: 1, replacementSequence: 0, status: "READY" }],
        })));
        await page.goto("/language-learning/listening");
        const request = page.waitForRequest((value) => value.url().endsWith("/language-learning/listening/sessions") && value.method() === "POST");
        await page.getByTestId("listening-mode-DICTATION").getByRole("button").click();
        expect((await request).postDataJSON()).toMatchObject({ dailySetId: 701 });
        await expect(page).toHaveURL(/listening\/session\/702$/);
    });

    test("Listening preserves slot two's draft when slot one's TTS becomes ready later", async ({ page }) => {
        await mockLanguageLearningListening(page);
        let earlierReady = false;
        const second = { ...LANGUAGE_LEARNING_LISTENING_ATTEMPT, attemptId: 802, itemId: 712, itemIndex: 2 };
        const first = { ...LANGUAGE_LEARNING_LISTENING_ATTEMPT, itemIndex: 1 };
        const value = () => ({ ...LANGUAGE_LEARNING_LISTENING_SESSION, targetItemCount: 5, attachedItemCount: earlierReady ? 2 : 1, dailySetStatus: "PARTIAL", generationInProgress: true, attempts: earlierReady ? [first, second] : [second] });
        await page.route("**/language-learning/listening/sessions/702", (route) => fulfillApiJson(route, responseDto(value())));
        await page.route("**/language-learning/listening/sessions/702/resume", (route) => fulfillApiJson(route, responseDto(value())));
        await page.route("**/language-learning/listening/sessions/702/items/712", (route) => fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_LISTENING_ITEM, itemId: 712, itemIndex: 2, attempt: second })));
        await page.goto("/language-learning/listening/session/702");
        await expect(page.getByTestId("generation-progress")).toContainText("2번 준비됨");
        await expect(page.getByTestId("generation-progress")).toContainText("1번 준비 대기");
        const answer = page.getByTestId("listening-answer-DICTATION").getByRole("textbox");
        await answer.fill("二番の解答です。");
        earlierReady = true;
        await expect(page.getByTestId("generation-progress")).toContainText("문제 준비 2/5");
        await expect(answer).toHaveValue("二番の解答です。");
    });

    test("Listening automatically enters when polling discovers the first READY item", async ({ page }) => {
        await mockLanguageLearningListening(page);
        let ready = false;
        const value = () => ({
            dailySetId: 701,
            learningMode: "DICTATION",
            status: "GENERATING",
            targetItemCount: 5,
            physicalItemCount: ready ? 1 : 0,
            readyItemCount: ready ? 1 : 0,
            failureReason: null,
            generationInProgress: true,
            items: ready ? [{ itemId: 711, itemIndex: 1, replacementSequence: 0, status: "READY" }] : [],
        });
        await page.route("**/language-learning/listening/daily-sets", (route) => fulfillApiJson(route, responseDto(value())));
        await page.route("**/language-learning/listening/daily-sets/701", (route) => fulfillApiJson(route, responseDto(value())));
        await page.goto("/language-learning/listening");
        await page.getByTestId("listening-mode-DICTATION").getByRole("button").click();
        ready = true;
        await expect(page).toHaveURL(/listening\/session\/702$/);
    });

    test("Listening waits for missing slots instead of completing after one evaluated item", async ({ page }) => {
        await mockLanguageLearningListening(page);
        let completionRequests = 0;
        page.on("request", (request) => { if (request.url().endsWith("/sessions/702/complete")) completionRequests += 1; });
        const value = { ...LANGUAGE_LEARNING_LISTENING_SESSION, targetItemCount: 5, dailySetStatus: "PARTIAL", generationInProgress: true, attempts: [{ ...LANGUAGE_LEARNING_LISTENING_ATTEMPT, itemIndex: 1, status: "EVALUATED" }] };
        await page.route("**/language-learning/listening/sessions/702", (route) => fulfillApiJson(route, responseDto(value)));
        await page.route("**/language-learning/listening/sessions/702/resume", (route) => fulfillApiJson(route, responseDto(value)));
        await page.goto("/language-learning/listening/session/702");
        await expect(page.getByTestId("generation-progress")).toContainText("문제 준비 1/5");
        await expect(page).toHaveURL(/listening\/session\/702$/);
        expect(completionRequests).toBe(0);
    });
});
