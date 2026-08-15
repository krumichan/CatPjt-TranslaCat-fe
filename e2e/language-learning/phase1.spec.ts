import { expect, test } from "../fixtures/mock-test";

import { fulfillJson } from "../support/api-mocks";
import {
    LANGUAGE_LEARNING_DAILY_SET,
    LANGUAGE_LEARNING_DASHBOARD,
    LANGUAGE_LEARNING_EVALUATION,
    LANGUAGE_LEARNING_LEVEL_STATUS,
    mockLanguageLearningBase,
} from "../support/language-learning-mocks";
import { responseDto } from "../support/mock-data";

test.describe("Language Learning Phase 1", () => {
    test.beforeEach(async ({ page }) => {
        await mockLanguageLearningBase(page);
    });

    test("LL-01 Sidebar에서 언어 학습으로 이동하고 Dashboard를 표시한다", async ({ page }) => {
        await page.goto("/language-learning");

        await expect(page.getByTestId("language-learning-dashboard")).toBeVisible();
        await expect(page.getByRole("heading", { name: "5대 Skill Radar" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Keyword 숙련도" })).toBeVisible();
    });

    test("LL-02 최초 Level Test가 필요한 사용자는 시작 안내를 표시한다", async ({ page }) => {
        await page.route("**/language-learning/level-test/status", (route) =>
            fulfillJson(
                route,
                responseDto({
                    ...LANGUAGE_LEARNING_LEVEL_STATUS,
                    profileState: "LEVEL_TEST_REQUIRED",
                    initialLevelTestCompleted: false,
                    baseLevelScore: null,
                }),
            ),
        );

        await page.goto("/language-learning");
        await expect(page.getByText("첫 학습 전에 레벨을 확인해요")).toBeVisible();
        await expect(page.getByRole("link", { name: "레벨 테스트 시작" })).toBeVisible();
    });

    test("LL-03 Daily Writing에서 5대 평가축과 추천 답안을 표시한다", async ({ page }) => {
        await page.route("**/language-learning/writing/daily", (route) =>
            fulfillJson(route, responseDto(LANGUAGE_LEARNING_DAILY_SET)),
        );

        await page.goto("/language-learning/writing");
        await expect(page.getByTestId("daily-writing-page")).toBeVisible();
        await expect(page.getByText("표현력", { exact: true })).toBeVisible();

        const recommendedAnswerList = page.getByRole("list", {
            name: "추천 답안",
        });
        await expect(recommendedAnswerList).toBeVisible();
        await expect(
            recommendedAnswerList.getByRole("listitem").first(),
        ).toContainText(
            LANGUAGE_LEARNING_EVALUATION.recommendedAnswers[0],
        );
    });

    test("LL-04 학습 설정에서 Admin Min/Max와 Keyword Type을 표시한다", async ({ page }) => {
        await page.goto("/language-learning/settings");
        await expect(page.getByTestId("language-learning-settings")).toBeVisible();
        await expect(page.getByText("관리자 허용 범위: 1 ~ 20")).toBeVisible();
        await expect(page.getByRole("option", { name: "Topic" }).first()).toBeAttached();
        await expect(page.getByRole("option", { name: "Vocabulary" }).first()).toBeAttached();
    });
    test("LL-05 재학습 기간 내 과거 문제를 다시 제출할 수 있다", async ({ page }) => {
        const reviewSet = {
            ...LANGUAGE_LEARNING_DAILY_SET,
            learningDate: "2026-08-12",
            reviewAvailable: true,
            items: LANGUAGE_LEARNING_DAILY_SET.items.map((item, index) => ({
                ...item,
                answeredToday: false,
                canSubmit: index === 0,
            })),
        };

        await page.route("**/language-learning/dashboard**", (route) =>
            fulfillJson(
                route,
                responseDto({
                    ...LANGUAGE_LEARNING_DASHBOARD,
                    recentLearningHistory: [
                        {
                            learningDate: "2026-08-12",
                            sentenceCount: 5,
                            status: "COMPLETED",
                            averageScore: 84,
                        },
                    ],
                }),
            ),
        );
        await page.route("**/language-learning/history?**", (route) =>
            fulfillJson(
                route,
                responseDto([
                    {
                        activityId: "WRITING:101",
                        source: "WRITING",
                        learningDate: "2026-08-12",
                        title: "Daily Writing",
                        topic: null,
                        durationSeconds: 0,
                        overallScore: 84,
                        completionStatus: "COMPLETED",
                        evaluationStatus: "EVALUATED",
                    },
                ]),
            ),
        );
        await page.route(
            "**/language-learning/history/WRITING%3A101",
            (route) =>
                fulfillJson(
                    route,
                    responseDto({
                        activityId: "WRITING:101",
                        source: "WRITING",
                        detail: reviewSet,
                    }),
                ),
        );
        await page.route("**/language-learning/writing/daily/items/1001/answers", (route) =>
            fulfillJson(
                route,
                responseDto({
                    answerId: 6001,
                    itemId: 1001,
                    attemptDate: "2026-08-13",
                    evaluation: LANGUAGE_LEARNING_EVALUATION,
                }),
            ),
        );

        await page.goto("/language-learning/history");
        await expect(page.getByText("다시 작성해 보기")).toBeVisible();

        const reviewInput = page.getByPlaceholder("이 문제를 다시 학습해 보세요.");
        await reviewInput.fill("昨日、友達に会いました。");
        await page.getByRole("button", { name: "재학습 평가" }).click();

        await expect(reviewInput).toHaveValue("");
    });

    test("LL-06 학습 서비스 허브에서 언어 학습으로 진입할 수 있다", async ({ page }) => {
        await page.goto("/learning");

        const languageLearningCard = page.getByTestId(
            "service-card-languageLearning",
        );
        await expect(languageLearningCard).toBeVisible();
        await expect(
            languageLearningCard.getByRole("heading"),
        ).toBeVisible();

        await languageLearningCard.click();
        await expect(page).toHaveURL(/\/learning\/language-learning$/);
        await expect(
            page.getByTestId("language-learning-dashboard"),
        ).toBeVisible();
    });

    test("LL-07 언어 학습 공통 메뉴를 별도 탭 영역으로 표시한다", async ({ page }) => {
        await page.goto("/language-learning");

        const dashboardHero = page.getByTestId(
            "language-learning-hero",
        );
        await expect(dashboardHero).toBeVisible();
        await expect(
            page.getByTestId("language-learning-tabs"),
        ).toBeVisible();

        const dashboardHeroHeight = (
            await dashboardHero.boundingBox()
        )?.height;
        await expect(
            page.getByTestId("language-learning-tab-dashboard"),
        ).toHaveAttribute("aria-current", "page");

        await page
            .getByTestId("language-learning-tab-history")
            .click();
        await expect(page).toHaveURL(/\/language-learning\/history$/);
        const historyHero = page.getByTestId(
            "language-learning-hero",
        );
        await expect(historyHero).toBeVisible();

        const historyHeroHeight = (
            await historyHero.boundingBox()
        )?.height;
        expect(historyHeroHeight).toBe(dashboardHeroHeight);
    });

});
