import { expect, test } from "../fixtures/mock-test";

import { fulfillApiJson, fulfillJson } from "../support/api-mocks";
import {
    LANGUAGE_LEARNING_DAILY_SET,
    LANGUAGE_LEARNING_DASHBOARD,
    LANGUAGE_LEARNING_EVALUATION,
    LANGUAGE_LEARNING_KEYWORDS,
    LANGUAGE_LEARNING_LEVEL_STATUS,
    LANGUAGE_LEARNING_SETTING,
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
        await expect(page.getByTestId("dashboard-integrated-ability")).toBeVisible();
        await expect(page.getByTestId("dashboard-activity-writing")).toBeVisible();
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
        await page.route("**/language-learning/writing/daily?**", (route) =>
            fulfillJson(route, responseDto(LANGUAGE_LEARNING_DAILY_SET)),
        );

        await page.goto("/language-learning/writing");
        await page.getByTestId("daily-writing-type-translation").click();
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

    test("LL-03A Daily Writing은 일괄 평가를 백그라운드에서 계속하고 완료 유형을 결과 보기로 표시한다", async ({ page }) => {
        const todayParts = new Intl.DateTimeFormat("en-US", {
            timeZone: LANGUAGE_LEARNING_SETTING.timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(new Date());
        const todayValues = Object.fromEntries(
            todayParts.map((part) => [part.type, part.value]),
        );
        const today = `${todayValues.year}-${todayValues.month}-${todayValues.day}`;
        const submittedAnswers = new Map<number, string>();
        let evaluationPollCount = 0;
        let resumeRequestCount = 0;
        let allowEvaluationCompletion = false;
        const batchSet = {
            ...LANGUAGE_LEARNING_DAILY_SET,
            learningDate: today,
            status: "READY",
            items: LANGUAGE_LEARNING_DAILY_SET.items.map((item) => ({
                ...item,
                answered: false,
                answeredToday: false,
                canSubmit: true,
                attempts: [],
            })),
        };

        await page.route("**/language-learning/writing/daily?**", (route) => {
            const allSubmitted = submittedAnswers.size === batchSet.items.length;
            const completed =
                allSubmitted &&
                allowEvaluationCompletion &&
                evaluationPollCount >= 1;
            if (allSubmitted && allowEvaluationCompletion) {
                evaluationPollCount += 1;
            }

            return fulfillJson(
                route,
                responseDto({
                    ...batchSet,
                    status: completed ? "COMPLETED" : "READY",
                    items: batchSet.items.map((item) => {
                        const answer = submittedAnswers.get(item.itemId);
                        if (!answer) return item;
                        return {
                            ...item,
                            answered: true,
                            answeredToday: true,
                            canSubmit: false,
                            attempts: [
                                {
                                    answerId: 7000 + item.itemId,
                                    attemptDate: today,
                                    answer,
                                    submittedAt: `${today}T12:00:00`,
                                    evaluationStatus: completed
                                        ? "SUCCESS"
                                        : "PENDING",
                                    evaluationFailureMessage: null,
                                    evaluation: completed
                                        ? LANGUAGE_LEARNING_EVALUATION
                                        : null,
                                },
                            ],
                        };
                    }),
                }),
            );
        });
        await page.route(
            "**/language-learning/writing/daily/items/*/answers",
            (route) => {
                const match = route.request().url().match(/items\/(\d+)\/answers/);
                const itemId = Number(match?.[1]);
                const answer = route.request().postDataJSON().answer as string;
                submittedAnswers.set(itemId, answer);
                return fulfillJson(
                    route,
                    responseDto({
                        answerId: 7000 + itemId,
                        itemId,
                        attemptDate: today,
                        evaluationStatus: "PENDING",
                        evaluationFailureMessage: null,
                        evaluation: null,
                    }),
                );
            },
        );
        await page.route(
            "**/language-learning/writing/daily/items/*/evaluation/resume",
            (route) => {
                resumeRequestCount += 1;
                allowEvaluationCompletion = true;
                return fulfillJson(route, responseDto(null));
            },
        );
        await page.route("**/language-learning/history?**", (route) => {
            const allSubmitted = submittedAnswers.size === batchSet.items.length;
            const completed =
                allSubmitted &&
                allowEvaluationCompletion &&
                evaluationPollCount >= 2;
            return fulfillJson(
                route,
                responseDto(
                    allSubmitted
                        ? [
                              {
                                  activityId: "WRITING:101",
                                  source: "WRITING",
                                  learningDate: today,
                                  title: "Daily Writing · TRANSLATION",
                                  topic: "TRANSLATION",
                                  durationSeconds: 0,
                                  overallScore: completed ? 84 : null,
                                  completionStatus: completed
                                      ? "COMPLETED"
                                      : "READY",
                                  evaluationStatus: completed
                                      ? "SUCCESS"
                                      : "PENDING",
                              },
                          ]
                        : [],
                ),
            );
        });

        await page.goto("/language-learning/writing");
        await page.getByTestId("daily-writing-type-translation").click();

        const answers = page.locator("textarea");
        await expect(answers).toHaveCount(5);
        for (let index = 0; index < 5; index += 1) {
            await answers.nth(index).fill(`一括評価の回答 ${index + 1}`);
        }

        const bulkEvaluation = page.getByTestId(
            "daily-writing-bulk-evaluation",
        );
        await expect(bulkEvaluation).toContainText("5개에 답변을 작성했습니다");
        await bulkEvaluation
            .getByRole("button", { name: "5개 모두 AI 평가" })
            .click();

        await expect.poll(() => submittedAnswers.size).toBe(5);
        await expect(bulkEvaluation).toContainText(
            "페이지를 새로고침하거나 다른 메뉴로 이동해도 평가가 계속됩니다",
        );

        await page.reload();
        const evaluatingCard = page.getByTestId(
            "daily-writing-type-translation",
        );
        await expect(evaluatingCard).toHaveAttribute(
            "data-state",
            "EVALUATING",
        );
        await expect(evaluatingCard).toContainText("평가 중");
        await evaluatingCard.click();

        await expect.poll(() => resumeRequestCount).toBeGreaterThan(0);
        await expect(
            page.getByText("오늘의 학습 완료!", { exact: true }),
        ).toBeVisible();

        await page.getByRole("button", { name: "다른 유형 선택" }).click();
        const translationCard = page.getByTestId(
            "daily-writing-type-translation",
        );
        await expect(translationCard).toHaveAttribute(
            "data-state",
            "COMPLETED",
        );
        await expect(translationCard).toContainText("완료");
        await expect(
            translationCard.getByText("결과 보기", { exact: true }),
        ).toBeVisible();
    });

    test("LL-03B Daily Writing 작성 중 답변은 새로고침 후에도 자동 복구한다", async ({ page }) => {
        const draftSet = {
            ...LANGUAGE_LEARNING_DAILY_SET,
            status: "READY",
            items: LANGUAGE_LEARNING_DAILY_SET.items.map((item) => ({
                ...item,
                answered: false,
                answeredToday: false,
                canSubmit: true,
                attempts: [],
            })),
        };

        await page.route("**/language-learning/writing/daily?**", (route) =>
            fulfillJson(route, responseDto(draftSet)),
        );

        await page.goto("/language-learning/writing");
        await page.getByTestId("daily-writing-type-translation").click();

        const answers = page.locator("textarea");
        await answers.nth(0).fill("保存される回答 1");
        await answers.nth(1).fill("保存される回答 2");
        await answers.nth(2).fill("保存される回答 3");
        await expect(page.getByText("자동 임시 저장됨").first()).toBeVisible();

        await page.reload();
        await page.getByTestId("daily-writing-type-translation").click();

        const restored = page.locator("textarea");
        await expect(restored.nth(0)).toHaveValue("保存される回答 1");
        await expect(restored.nth(1)).toHaveValue("保存される回答 2");
        await expect(restored.nth(2)).toHaveValue("保存される回答 3");
    });

    test("LL-04 학습 설정에서 Admin Min/Max와 Keyword Type을 표시한다", async ({ page }) => {
        await page.goto("/language-learning/settings");
        await expect(page.getByTestId("language-learning-settings")).toBeVisible();
        await expect(page.getByText("관리자 허용 범위: 1 ~ 20", { exact: true })).toBeVisible();
        await expect(page.getByRole("option", { name: "Topic" }).first()).toBeAttached();
        await expect(page.getByRole("option", { name: "Vocabulary" }).first()).toBeAttached();
        await expect(
            page.getByText(/첫 Writing Daily Set 또는 Speaking Session/),
        ).toBeVisible();

        const itGroup = page.getByTestId("system-keyword-group-1");
        await expect(itGroup).toBeVisible();
        await expect(page.getByTestId("system-keyword-1")).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        await expect(page.getByTestId("system-keyword-2")).toHaveCount(0);

        await itGroup
            .getByRole("button", { name: "IT 세부 Keyword 펼치기" })
            .click();
        await expect(page.getByTestId("system-keyword-2")).toBeVisible();
        await expect(page.getByTestId("system-keyword-2")).toHaveAttribute(
            "aria-pressed",
            "false",
        );
    });

    test("LL-04B 최초 학습 설정 저장은 즉시 적용 안내를 표시한다", async ({ page }) => {
        const initialSetting = {
            ...LANGUAGE_LEARNING_SETTING,
            originLanguage: null,
            learningLanguage: null,
            pendingOriginLanguage: null,
            pendingLearningLanguage: null,
            pendingEffectiveDate: null,
            configured: false,
        };

        await page.route("**/language-learning/settings", (route) => {
            if (route.request().method() === "PATCH") {
                return fulfillApiJson(
                    route,
                    responseDto({
                        ...LANGUAGE_LEARNING_SETTING,
                        originLanguage: "ko",
                        learningLanguage: "ja",
                        configured: true,
                    }),
                );
            }

            return fulfillApiJson(route, responseDto(initialSetting));
        });

        await page.goto("/language-learning/settings");
        await page.getByRole("button", { name: "설정 저장" }).click();

        await expect(
            page.getByText("초기 학습 설정을 저장했습니다."),
        ).toBeVisible();
    });

    test("LL-04A 전체 시스템 언어를 Keyword Locale에 적용한다", async ({ page }) => {
        let requestedLocale: string | undefined;
        const localizedKeyword =
            "とても長いショッピング価格比較と配送確認の会話練習";

        await page.setViewportSize({ width: 390, height: 844 });

        await page.route("**/language-learning/keywords", (route) => {
            requestedLocale =
                route.request().headers()["x-translacat-locale"];

            return fulfillJson(
                route,
                responseDto({
                    ...LANGUAGE_LEARNING_KEYWORDS,
                    systemKeywords:
                        LANGUAGE_LEARNING_KEYWORDS.systemKeywords.map(
                            (keyword) =>
                                keyword.id === 3
                                    ? {
                                          ...keyword,
                                          displayName: localizedKeyword,
                                      }
                                    : keyword,
                        ),
                }),
            );
        });

        await page.goto("/ja/language-learning/settings");

        const keywordLabel = page.getByTestId("system-keyword-primary-3");
        await expect(keywordLabel).toBeVisible();
        await expect(keywordLabel).toHaveText(localizedKeyword);
        await expect(page.getByTestId("system-keyword-meta-3")).toBeVisible();

        const layout = await keywordLabel.evaluate((element) => {
            const style = window.getComputedStyle(element);

            return {
                whiteSpace: style.whiteSpace,
                textOverflow: style.textOverflow,
                scrollWidth: element.scrollWidth,
                clientWidth: element.clientWidth,
            };
        });

        expect(layout.whiteSpace).toBe("normal");
        expect(layout.textOverflow).not.toBe("ellipsis");
        expect(layout.clientWidth).toBeGreaterThan(0);
        expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
        expect(requestedLocale).toBe("ja");
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
                    evaluationStatus: "SUCCESS",
                    evaluationFailureMessage: null,
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
