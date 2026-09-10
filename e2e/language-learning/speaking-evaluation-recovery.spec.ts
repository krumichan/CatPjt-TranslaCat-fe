import { expect, test } from "../fixtures/mock-test";
import { fulfillApiJson } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import {
    LANGUAGE_LEARNING_SPEAKING_DETAIL, LANGUAGE_LEARNING_SPEAKING_EVALUATION,
    mockLanguageLearningBase, mockLanguageLearningSpeaking,
} from "../support/language-learning-mocks";
import type { SpeakingEvaluation, SpeakingReadAloudProblemEvaluation, SpeakingSessionDetail } from "../../src/types/language-learning/speaking";

const SESSION = "**/api/v1/language-learning/speaking/sessions/301";
const EVALUATION = "**/api/v1/language-learning/speaking/sessions/301/evaluation";
const RETRY = "**/api/v1/language-learning/speaking/sessions/301/read-aloud/problems/5/evaluation/retry";
function problem(status: string, retryCount = 0): SpeakingReadAloudProblemEvaluation {
    return { problemIndex: 5, attemptCount: 2, status, overallScore: status === "EVALUATED" ? 82 : null,
        evaluationConfidence: status === "EVALUATED" ? 0.9 : null, errorMessage: null,
        submittedAt: "2026-09-10T10:00:00", evaluatedAt: null, manualRetryCount: retryCount, manualRetryLimit: 1 };
}
function detail(item: SpeakingReadAloudProblemEvaluation): SpeakingSessionDetail {
    return { ...structuredClone(LANGUAGE_LEARNING_SPEAKING_DETAIL),
        session: { ...LANGUAGE_LEARNING_SPEAKING_DETAIL.session,
            practiceMode: "READ_ALOUD", status: "EVALUATED", evaluationStatus: "EVALUATED" },
        resumable: false, readAloudProblemEvaluations: [item] };
}

test.describe("Speaking persisted evaluation recovery", () => {
    test.beforeEach(async ({ page }) => {
        await mockLanguageLearningBase(page);
        await mockLanguageLearningSpeaking(page);
    });
    test("LLS-R01 종료된 세션의 실패한 문제만 재평가하고 종합 결과는 유지한다", async ({ page }) => {
        let current: SpeakingReadAloudProblemEvaluation = problem("FAILED");
        let retries = 0;
        let pendingReads = 0;
        await page.route(SESSION, async (route) => {
            if (current.status === "PENDING" && ++pendingReads >= 3) current = problem("EVALUATED", 1);
            await fulfillApiJson(route, responseDto(detail(current)));
        });
        await page.route(EVALUATION, (route) => fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_SPEAKING_EVALUATION)));
        await page.route(RETRY, async (route) => {
            expect(route.request().method()).toBe("POST");
            retries++;
            current = problem("PENDING", 1);
            await fulfillApiJson(route, responseDto(current));
        });
        await page.goto("/language-learning/speaking/301/evaluation");
        await expect(page.getByTestId("speaking-evaluation-result")).toBeVisible();
        await page.getByTestId("speaking-problem-retry-5").click();
        await expect(page.getByTestId("speaking-problem-result-5")).toContainText("82 / 100", { timeout: 20_000 });
        await expect(page.getByTestId("speaking-problem-retry-5")).toHaveCount(0);
        await expect(page.getByTestId("speaking-evaluation-result")).toBeVisible();
        expect(retries).toBe(1);
    });
    test("LLS-R02 재시도 한도를 소진한 문제와 증거 부족 결과는 재시도하지 않는다", async ({ page }) => {
        await page.route(SESSION, (route) => fulfillApiJson(route, responseDto(detail(problem("FAILED", 1)))));
        await page.goto("/language-learning/speaking/301/evaluation");
        await expect(page.getByTestId("speaking-problem-result-5")).toBeVisible();
        await expect(page.getByTestId("speaking-problem-retry-5")).toHaveCount(0);
        await page.route(SESSION, (route) => fulfillApiJson(route, responseDto(detail(problem("INSUFFICIENT_EVIDENCE")))));
        await page.reload();
        await expect(page.getByTestId("speaking-problem-result-5")).toBeVisible();
        await expect(page.getByTestId("speaking-problem-retry-5")).toHaveCount(0);
        await expect(page.getByTestId("speaking-problem-result-5")).not.toContainText("/ 100");
    });
    test("LLS-R03 평가가 비활성화된 세션은 무한 평가중 대신 생략 안내를 표시한다", async ({ page }) => {
        const skipped = detail(problem("NOT_REQUESTED"));
        skipped.session.evaluationStatus = "NOT_REQUESTED";
        skipped.session.status = "COMPLETED";
        await page.route(SESSION, (route) => fulfillApiJson(route, responseDto(skipped)));
        await page.route(EVALUATION, (route) => fulfillApiJson(route, responseDto(null)));
        await page.goto("/language-learning/speaking/301/evaluation");
        await expect(page.getByTestId("speaking-evaluation-not-requested")).toBeVisible();
        await expect(page.getByTestId("speaking-evaluation-pending")).toHaveCount(0);
        await expect(page.getByTestId("speaking-problem-retry-5")).toHaveCount(0);
    });
    test("LLS-R04 개별 평가 재시도 실패를 표시하고 기존 종합 점수는 지우지 않는다", async ({ page }) => {
        await page.route(SESSION, (route) => fulfillApiJson(route, responseDto(detail(problem("FAILED")))));
        await page.route(RETRY, (route) => fulfillApiJson(route, { resultCode: 500, message: "Evaluation failed", body: { errorCode: "SPEAKING_EVALUATION_FAILED" } }, 500));
        await page.goto("/language-learning/speaking/301/evaluation");
        await page.getByTestId("speaking-problem-retry-5").click();
        await expect(page.getByTestId("speaking-problem-result-5").getByRole("alert")).toBeVisible();
        await expect(page.getByTestId("speaking-evaluation-result")).toBeVisible();
        await expect(page.getByTestId("speaking-problem-retry-5")).toBeEnabled();
    });
    test("LLS-R05 FAILED에서 재시도한 실제 무점수 응답은 정상 종료하고 종합 점수를 만들지 않는다", async ({ page }) => {
        let state: "FAILED" | "PENDING" | "INSUFFICIENT_EVIDENCE" = "FAILED";
        let pendingReads = 0;
        let retries = 0;
        await page.route(SESSION, async (route) => {
            if (state === "PENDING" && ++pendingReads >= 3) state = "INSUFFICIENT_EVIDENCE";
            const current: SpeakingSessionDetail = structuredClone(LANGUAGE_LEARNING_SPEAKING_DETAIL);
            current.session.evaluationStatus = state;
            current.session.status = state === "FAILED" ? "EVALUATION_FAILED" : "COMPLETED";
            current.resumable = false;
            await fulfillApiJson(route, responseDto(current));
        });
        await page.route(EVALUATION, async (route) => {
            const result: SpeakingEvaluation | null = state === "INSUFFICIENT_EVIDENCE" ? {
                ...LANGUAGE_LEARNING_SPEAKING_EVALUATION,
                status: "INSUFFICIENT_EVIDENCE", overallScore: null, evaluationConfidence: null, metrics: [],
            } : null;
            await fulfillApiJson(route, responseDto(result));
        });
        await page.route("**/api/v1/language-learning/speaking/sessions/301/evaluation/retry", async (route) => {
            expect(route.request().method()).toBe("POST");
            state = "PENDING";
            retries++;
            await fulfillApiJson(route, responseDto(null));
        });
        await page.goto("/language-learning/speaking/301/evaluation");
        await page.getByTestId("speaking-evaluation-retry").click();
        await expect(page.getByTestId("speaking-evaluation-pending")).toBeVisible();
        await expect(page.getByTestId("speaking-evaluation-insufficient")).toBeVisible({ timeout: 20_000 });
        await expect(page.getByTestId("speaking-evaluation-pending")).toHaveCount(0);
        await expect(page.getByTestId("speaking-evaluation-result")).toHaveCount(0);
        expect(retries).toBe(1);
    });

});
