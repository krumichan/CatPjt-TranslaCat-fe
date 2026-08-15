import { expect, test } from "../fixtures/mock-test";

import { fulfillApiJson, fulfillJson } from "../support/api-mocks";
import {
    LANGUAGE_LEARNING_DASHBOARD,
    LANGUAGE_LEARNING_SPEAKING_DETAIL,
    LANGUAGE_LEARNING_SPEAKING_EVALUATION,
    LANGUAGE_LEARNING_SPEAKING_TURNS,
    mockLanguageLearningBase,
    mockLanguageLearningPhase2,
} from "../support/language-learning-mocks";
import { mockSpeakingMediaRecorder } from "../support/media-recorder-mock";
import { responseDto } from "../support/mock-data";

const SESSION_DETAIL_URL = "**/language-learning/speaking/sessions/301";
const EVALUATION_URL =
    "**/language-learning/speaking/sessions/301/evaluation";

test.describe("Language Learning Phase 2", () => {
    test.beforeEach(async ({ page }) => {
        await mockLanguageLearningBase(page);
        await mockLanguageLearningPhase2(page);
    });

    test("LL2-01 Speaking Topic과 3가지 시작 방식을 표시한다", async ({ page }) => {
        await page.goto("/language-learning/speaking");
        await expect(page.getByTestId("speaking-start-page")).toBeVisible();
        await expect(page.getByText("週末の予定", { exact: true })).toBeVisible();
        await expect(page.getByRole("radio", { name: /AI 먼저/ })).toBeAttached();
        await expect(page.getByRole("radio", { name: /내가 먼저/ })).toBeAttached();
        await expect(page.getByRole("radio", { name: /Topic 추천/ })).toBeAttached();
    });

    test("LL2-02 진행 중 Session에서 평가 준비도와 6개 학습 보조를 표시한다", async ({ page }) => {
        await page.goto("/language-learning/speaking/301");
        await expect(page.getByTestId("speaking-session-page")).toBeVisible();
        await expect(page.getByText("유효 Turn 5 / 5")).toBeVisible();
        for (const label of [
            "AI 음성 다시 듣기",
            "느리게 듣기",
            "질문 다시 보기",
            "힌트",
            "번역",
            "예시 답안",
        ]) {
            await expect(page.getByRole("button", { name: label })).toBeVisible();
        }
    });

    test("LL2-03 마이크 녹음 후 Turn 전송 UI가 동작한다", async ({ page }) => {
        await mockSpeakingMediaRecorder(page);
        await page.goto("/language-learning/speaking/301");
        await expect(page.getByText("마이크 사용 가능")).toBeVisible();
        await page.getByRole("button", { name: "녹음 시작" }).click();
        await expect(page.getByRole("button", { name: "녹음 종료" })).toBeVisible();
        await page.waitForTimeout(1100);
        await page.getByRole("button", { name: "녹음 종료" }).click();
        await expect(page.getByRole("button", { name: "답변 보내기" })).toBeEnabled();
        await page.getByRole("button", { name: "답변 보내기" }).click();
        await expect(page.getByTestId("speaking-session-page")).toBeVisible();
    });

    test("LL2-04 Speaking 평가에서 8대 Metric과 Evidence를 표시한다", async ({ page }) => {
        await page.goto("/language-learning/speaking/301/evaluation");
        await expect(page.getByTestId("speaking-evaluation-result")).toBeVisible();
        await expect(page.getByRole("heading", { name: "공통 5대 Skill" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Speaking 3대 Skill" })).toBeVisible();
        const pronunciationMetric = page.getByTestId(
            "speaking-metric-PRONUNCIATION",
        );
        await expect(
            pronunciationMetric.getByRole("heading", {
                name: "발음",
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            page
                .getByTestId("speaking-metric-INTERACTION")
                .getByRole("heading", {
                    name: "대화 능력",
                    exact: true,
                }),
        ).toBeVisible();
        await expect(page.getByText("Evidence phrase").first()).toBeVisible();
    });

    test("LL2-05 Dashboard V2에서 Writing/Speaking 진행과 Source 필터를 표시한다", async ({ page }) => {
        await page.goto("/language-learning");
        await expect(page.getByTestId("dashboard-learning-progress-v2")).toBeVisible();
        await expect(page.getByTestId("dashboard-speaking-summary")).toBeVisible();
        const trend = page.getByTestId("dashboard-source-trend");
        await expect(trend).toBeVisible();
        await trend.getByRole("combobox").first().selectOption("SPEAKING");
    });

    test("LL2-06 통합 History에서 Speaking 상세를 표시한다", async ({ page }) => {
        await page.goto("/language-learning/history");
        await page.getByRole("button", { name: /Speaking/ }).first().click();
        const speakingDetail = page.getByTestId("speaking-history-detail");
        await expect(speakingDetail).toBeVisible();
        await expect(
            speakingDetail.getByRole("heading", {
                name: "週末の予定",
                exact: true,
            }),
        ).toBeVisible();
    });

    test("LL2-07 사용자 설정에 Speaking 목표와 Voice를 표시한다", async ({ page }) => {
        await page.goto("/language-learning/settings");
        await expect(page.getByText("하루 Speaking 목표")).toBeVisible();
        await expect(page.getByText("기본 Speaking Voice")).toBeVisible();
        await expect(page.getByRole("option", { name: "Aoede" })).toBeAttached();
    });

    test("LL2-08 진행 중 Speaking Session을 우선 복구한다", async ({ page }) => {
        await page.route(
            "**/language-learning/speaking/sessions/active",
            (route) =>
                fulfillApiJson(
                    route,
                    responseDto(LANGUAGE_LEARNING_SPEAKING_DETAIL),
                ),
        );

        await page.goto("/language-learning/speaking");
        await expect(page.getByText("진행 중인 Session")).toBeVisible();
        await expect(page.getByRole("link", { name: "이어서 학습" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Speaking 시작" })).toBeDisabled();
    });

    test("LL2-09 TTS 부분 실패 시 AI Text를 유지하고 TTS 재시도를 제공한다", async ({ page }) => {
        const failedTurn = {
            ...LANGUAGE_LEARNING_SPEAKING_TURNS[0],
            status: "PARTIAL_FAILURE",
            failedStage: "TTS",
            assistantAudioUrl: null,
            errorMessage: "TTS provider timeout",
        };
        await page.route(SESSION_DETAIL_URL, (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    ...LANGUAGE_LEARNING_SPEAKING_DETAIL,
                    turns: [failedTurn],
                }),
            ),
        );

        await page.goto("/language-learning/speaking/301");
        await expect(
            page.getByText(failedTurn.assistantText, { exact: true }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "TTS만 다시 생성" }),
        ).toBeVisible();
    });

    test("LL2-10 NOT_EVALUABLE Metric을 0점으로 표시하지 않는다", async ({ page }) => {
        const metrics = LANGUAGE_LEARNING_SPEAKING_EVALUATION.metrics.map(
            (metric) =>
                metric.metricType === "PRONUNCIATION"
                    ? {
                          ...metric,
                          state: "NOT_EVALUABLE",
                          score: null,
                          notEvaluableReason: "Audio quality insufficient",
                      }
                    : metric,
        );
        await page.route(EVALUATION_URL, (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    ...LANGUAGE_LEARNING_SPEAKING_EVALUATION,
                    metrics,
                }),
            ),
        );

        await page.goto("/language-learning/speaking/301/evaluation");
        const pronunciationCard = page.getByTestId(
            "speaking-metric-PRONUNCIATION",
        );
        await expect(pronunciationCard.getByText("평가 불가")).toBeVisible();
        await expect(
            pronunciationCard.getByText("Audio quality insufficient"),
        ).toBeVisible();
        await expect(pronunciationCard.getByText("0", { exact: true })).toHaveCount(0);
    });

    test("LL2-11 마이크 권한 거부와 브라우저 미지원을 구분한다", async ({ page }) => {
        await mockSpeakingMediaRecorder(page, "denied");
        await page.goto("/language-learning/speaking/301");
        await expect(
            page.getByText(/마이크 권한이 차단되어 있습니다/),
        ).toBeVisible();

        const unsupportedPage = await page.context().newPage();
        await mockLanguageLearningBase(unsupportedPage);
        await mockLanguageLearningPhase2(unsupportedPage);
        await mockSpeakingMediaRecorder(unsupportedPage, "unsupported");
        await unsupportedPage.goto("/language-learning/speaking/301");
        await expect(
            unsupportedPage.getByText(/이 브라우저는 음성 녹음을 지원하지 않습니다/),
        ).toBeVisible();
        await unsupportedPage.close();
    });

    test("LL2-12 마이크 장치 없음과 사용 중 상태를 구분한다", async ({ page }) => {
        await mockSpeakingMediaRecorder(page, "no-device");
        await page.goto("/language-learning/speaking/301");
        await page.getByRole("button", { name: "마이크 권한 요청" }).click();
        await expect(page.getByText(/사용 가능한 마이크를 찾지 못했습니다/)).toBeVisible();

        const busyPage = await page.context().newPage();
        await mockLanguageLearningBase(busyPage);
        await mockLanguageLearningPhase2(busyPage);
        await mockSpeakingMediaRecorder(busyPage, "busy");
        await busyPage.goto("/language-learning/speaking/301");
        await busyPage.getByRole("button", { name: "마이크 권한 요청" }).click();
        await expect(
            busyPage.getByText(/다른 앱에서 마이크를 사용 중일 수 있습니다/),
        ).toBeVisible();
        await busyPage.close();
    });

    test("LL2-13 낮은 STT Confidence에서 다시 녹음·평가 제외·오류 신고를 제공한다", async ({ page }) => {
        const lowConfidenceTurn = {
            ...LANGUAGE_LEARNING_SPEAKING_TURNS[0],
            sttConfidence: 0.42,
        };
        await page.route(SESSION_DETAIL_URL, (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    ...LANGUAGE_LEARNING_SPEAKING_DETAIL,
                    turns: [
                        lowConfidenceTurn,
                        ...LANGUAGE_LEARNING_SPEAKING_TURNS.slice(1),
                    ],
                }),
            ),
        );

        await page.goto("/language-learning/speaking/301");
        const turn = page.getByTestId("speaking-turn-1");
        await expect(turn.getByText(/음성 인식 신뢰도가 낮습니다/)).toBeVisible();
        await expect(turn.getByRole("button", { name: "다시 녹음" })).toBeVisible();
        await expect(turn.getByRole("button", { name: "평가에서 제외" })).toBeVisible();
        await turn.getByRole("button", { name: "STT 오류 신고" }).click();

        await page.getByLabel(/최대 30일 보관/).check();
        await page.getByLabel(/운영 지원 요청/).check();
        const requestPromise = page.waitForRequest(
            (request) =>
                request.url().includes("/stt-reports") &&
                request.method() === "POST",
        );
        await page.getByRole("button", { name: "신고 보내기" }).click();
        const request = await requestPromise;
        const body = request.postDataJSON();
        expect(body.audioAnalysisConsent).toBe(true);
        expect(body.supportRequested).toBe(true);
        await expect(page.getByText(/STT-701/)).toBeVisible();
    });

    test("LL2-14 평가 생성 전 EVALUATION_PENDING을 정상 대기 상태로 처리한다", async ({ page }) => {
        await page.route(EVALUATION_URL, (route) =>
            fulfillJson(
                route,
                {
                    resultCode: 409,
                    message: "Speaking evaluation is pending.",
                    body: { errorCode: "EVALUATION_PENDING" },
                },
                409,
            ),
        );
        await page.route(SESSION_DETAIL_URL, (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    ...LANGUAGE_LEARNING_SPEAKING_DETAIL,
                    session: {
                        ...LANGUAGE_LEARNING_SPEAKING_DETAIL.session,
                        status: "EVALUATING",
                        evaluationStatus: "PENDING",
                    },
                }),
            ),
        );

        await page.goto("/language-learning/speaking/301/evaluation");
        await expect(
            page.getByTestId("speaking-evaluation-pending"),
        ).toBeVisible();
        await expect(page.getByText("Speaking 평가 중")).toBeVisible();
    });

    test("LL2-15 평가 실패 시 Session 기록을 유지하고 평가만 재시도한다", async ({ page }) => {
        await page.route(EVALUATION_URL, (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    ...LANGUAGE_LEARNING_SPEAKING_EVALUATION,
                    status: "FAILED",
                    overallScore: null,
                }),
            ),
        );

        await page.goto("/language-learning/speaking/301/evaluation");
        await expect(page.getByText("평가에 실패했습니다")).toBeVisible();
        const retryRequest = page.waitForRequest(
            (request) =>
                request.url().includes("/evaluation/retry") &&
                request.method() === "POST",
        );
        await page.getByRole("button", { name: "평가 다시 요청" }).click();
        await retryRequest;
    });

    test("LL2-16 평가 기준 미달 시 계속 대화와 평가 없이 종료를 제공한다", async ({ page }) => {
        const shortTurns = LANGUAGE_LEARNING_SPEAKING_TURNS.slice(0, 2).map(
            (turn) => ({ ...turn, durationSeconds: 8 }),
        );
        await page.route(SESSION_DETAIL_URL, (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    ...LANGUAGE_LEARNING_SPEAKING_DETAIL,
                    session: {
                        ...LANGUAGE_LEARNING_SPEAKING_DETAIL.session,
                        completedTurns: 2,
                        totalDurationSeconds: 16,
                    },
                    turns: shortTurns,
                }),
            ),
        );

        await page.goto("/language-learning/speaking/301");
        await expect(page.getByText("유효 Turn 2 / 5")).toBeVisible();
        await expect(
            page.getByRole("button", { name: "계속 대화하기" }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "평가 없이 종료하기" }),
        ).toBeVisible();
    });

    test("LL2-17 Dashboard Widget 하나가 실패해도 나머지 Widget을 유지한다", async ({ page }) => {
        await page.route("**/language-learning/dashboard**", (route) =>
            fulfillApiJson(
                route,
                responseDto({
                    ...LANGUAGE_LEARNING_DASHBOARD,
                    speakingSummary: null,
                }),
            ),
        );

        await page.goto("/language-learning");
        await expect(page.getByTestId("dashboard-learning-progress-v2")).toBeVisible();
        await expect(
            page.getByText(/이 위젯을 표시하지 못했습니다/),
        ).toBeVisible();
        await expect(page.getByTestId("language-learning-dashboard")).toBeVisible();
    });

    test("LL2-18 Admin Speaking 설정에서 범위 검증으로 잘못된 저장을 막는다", async ({ page }) => {
        await page.route("**/api/auth/session", (route) =>
            fulfillJson(route, {
                user: {
                    name: "Admin",
                    email: "admin@example.com",
                    image: null,
                    role: "ADMIN",
                    publicId: "admin-e2e",
                    accessToken: "mock-admin-access-token",
                },
                accessToken: "mock-admin-access-token",
                expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            }),
        );

        await page.goto("/settings/admin/language-learning");
        await expect(page.getByTestId("admin-speaking-settings")).toBeVisible();
        const maxGoal = page.getByLabel(/최대 Speaking 목표/);
        await expect(maxGoal).toHaveValue("20");
        await maxGoal.fill("50");
        await expect(page.getByText(/각 기간\/개수 설정을 확인해 주세요/)).toBeVisible();
        await expect(page.getByRole("button", { name: "저장" })).toBeDisabled();
    });

    test("LL2-19 Mobile viewport에서도 Speaking 핵심 조작을 제공한다", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await mockSpeakingMediaRecorder(page);
        await page.goto("/language-learning/speaking/301");

        await expect(page.getByTestId("speaking-session-page")).toBeVisible();
        await expect(page.getByRole("button", { name: "녹음 시작" })).toBeVisible();
        await expect(page.getByRole("button", { name: "종료하고 평가받기" })).toBeVisible();
    });

    test("LL2-20 일본어 Locale에서도 Speaking 시작 UI를 표시한다", async ({ page }) => {
        await page.goto("/ja/language-learning/speaking");

        await expect(page.getByTestId("speaking-start-page")).toBeVisible();
        await expect(
            page.getByRole("group", { name: "会話開始方法" }),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: "Speakingを開始" })).toBeVisible();
    });

});
