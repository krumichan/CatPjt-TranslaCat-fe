import { expect, test } from "../fixtures/mock-test";
import { fulfillApiJson } from "../support/api-mocks";
import {
    LANGUAGE_LEARNING_DAILY_SET,
    LANGUAGE_LEARNING_SETTING,
    mockLanguageLearningBase,
} from "../support/language-learning-mocks";
import { responseDto } from "../support/mock-data";

for (const [locale, englishName] of [["ko", "영어"], ["ja", "英語"]] as const) {
    test(`EN-SETTINGS-${locale} 영어 모국어·학습·피드백 설정을 현재 UI 언어로 저장한다`, async ({ page }, testInfo) => {
        // 준비: 최초 설정은 즉시 저장되며 영어 UI 경로를 요구하지 않는다.
        await mockLanguageLearningBase(page);
        const initial = { ...LANGUAGE_LEARNING_SETTING, configured: false, originLanguage: null, learningLanguage: null };
        await page.route("**/api/v1/language-learning/settings", async (route) => {
            if (route.request().method() === "PATCH") {
                const saved = route.request().postDataJSON();
                return fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_SETTING, ...saved }));
            }
            return fulfillApiJson(route, responseDto(initial));
        });

        // 실행: 각 역할에서 영어를 선택할 수 있고 원문·학습 언어는 다르게 저장한다.
        await page.goto(`/${locale}/language-learning/settings`);
        const selects = page.locator("#learning-settings select");
        await expect(selects.first()).toBeVisible();
        for (let index = 0; index < 3; index++) {
            await expect(selects.nth(index).locator('option[value="en"]')).toHaveText(englishName);
        }
        await selects.nth(0).selectOption("en");
        await selects.nth(1).selectOption("ko");
        await selects.nth(2).selectOption("en");
        const requestPromise = page.waitForRequest((request) => request.method() === "PATCH" && request.url().endsWith("/language-learning/settings"));
        const responsePromise = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().endsWith("/language-learning/settings"));
        await page.locator("#learning-settings button").last().click();
        const request = await requestPromise;
        await responsePromise;

        // 검증: API 값과 화면 locale은 독립적이다.
        expect(request.postDataJSON()).toMatchObject({ originLanguage: "en", learningLanguage: "ko", feedbackLanguage: "en" });
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(selects.nth(0)).toHaveValue("en");
        await selects.nth(0).evaluate((element) => element.scrollIntoView({ block: "center" }));
        await page.screenshot({ path: testInfo.outputPath(`english-settings-${locale}.png`), fullPage: true });
    });
}

for (const [originLanguage, learningLanguage] of [["ko", "en"], ["ja", "en"], ["en", "ko"], ["en", "ja"]] as const) {
    test(`EN-WRITING-${originLanguage}-${learningLanguage} QA 설정에서도 일반 작문으로 진입한다`, async ({ page }, testInfo) => {
        // 준비: 검수 플래그를 실제로 켠 브라우저에서 영어 언어 쌍을 검증한다.
        expect(process.env.NEXT_PUBLIC_WRITING_CURATED_QA).toBe("true");
        await mockLanguageLearningBase(page);
        await page.route("**/api/v1/language-learning/settings", (route) => fulfillApiJson(route, responseDto({
            ...LANGUAGE_LEARNING_SETTING, originLanguage, learningLanguage,
        })));
        let curatedCalls = 0;
        let dailyCalls = 0;
        const prompt = originLanguage === "ko" ? "내일 회의에 참석할 수 있는지 알려 주세요."
            : originLanguage === "ja" ? "明日の会議に出席できるか教えてください。"
                : "Please let me know if you can attend tomorrow's meeting.";
        await page.route("**/api/v1/language-learning/writing/curated/**", async (route) => {
            curatedCalls++;
            await route.fulfill({ status: 500 });
        });
        await page.route("**/api/v1/language-learning/writing/daily?**", (route) => {
            dailyCalls++;
            return fulfillApiJson(route, responseDto({
                ...LANGUAGE_LEARNING_DAILY_SET,
                items: LANGUAGE_LEARNING_DAILY_SET.items.map((item) => ({
                    ...item, originText: prompt, answered: false, canSubmit: true, attempts: [],
                })),
            }));
        });

        // 실행
        await page.goto("/ko/language-learning/writing");
        await expect(page.getByTestId("daily-writing-type-selector")).toBeVisible();
        await page.getByTestId("daily-writing-type-translation").getByRole("button").click();

        // 검증: 한일 전용 검수 API 대신 기존 범용 작문 API를 요청한다.
        await expect(page.getByText(prompt, { exact: true }).first()).toBeVisible();
        await expect(page.locator("textarea").first()).toHaveAttribute("lang", learningLanguage);
        await expect(page.getByText(prompt, { exact: true }).first()).toHaveAttribute("lang", originLanguage);
        expect(dailyCalls).toBeGreaterThan(0);
        expect(curatedCalls).toBe(0);
        if (originLanguage === "ko" && learningLanguage === "en") {
            await page.locator("textarea").first().fill("Please let me know if you can attend tomorrow's meeting.");
            await page.screenshot({ path: testInfo.outputPath("english-daily-writing.png"), fullPage: true });
        }
    });
}

test("EN-WRITING-CACHE 영어 설정 적용 뒤 이전 한일 캐시로 검수 작문을 열지 않는다", async ({ page }) => {
    // 준비: 같은 로그인으로 한일 검수 화면을 본 뒤 현재 설정이 영어로 바뀐 상황이다.
    expect(process.env.NEXT_PUBLIC_WRITING_CURATED_QA).toBe("true");
    await mockLanguageLearningBase(page);
    let hold = false;
    let release!: () => void;
    let heldRequests = 0;
    const responseGate = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/v1/language-learning/settings", async (route) => {
        if (hold) {
            heldRequests++;
            await responseGate;
        }
        return fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_SETTING, learningLanguage: hold ? "en" : "ja" }));
    });
    await page.goto("/ko/language-learning/writing");
    await expect(page.getByTestId("curated-writing-page")).toBeVisible();
    await page.getByTestId("language-learning-tab-settings").click();
    await expect(page.getByTestId("language-learning-settings")).toBeVisible();

    // 실행: 새 설정 GET을 보류한 채 캐시가 남은 작문 화면으로 돌아온다.
    hold = true;
    await page.getByTestId("language-learning-today-menu").locator("summary").click();
    await page.getByTestId("language-learning-tab-writing").click();
    await expect.poll(() => heldRequests).toBeGreaterThan(0);

    // 검증: 최신 설정을 받기 전에는 두 경로 모두 시작하지 않고, 응답 후 일반 작문을 연다.
    await expect(page.getByTestId("curated-writing-page")).toHaveCount(0);
    await expect(page.getByTestId("daily-writing-type-selector")).toHaveCount(0);
    release();
    await expect(page.getByTestId("daily-writing-type-selector")).toBeVisible();
    await expect(page.getByTestId("curated-writing-page")).toHaveCount(0);
});

test("EN-WRITING-PROGRESS 같은 학습일의 일본어 완료 이력을 영어 작문 진행에 섞지 않는다", async ({ page }) => {
    // 준비: 영어의 새 시간대에서는 이전 일본어 학습일과 같은 calendar date를 사용한다.
    await page.clock.install({ time: new Date("2026-10-16T16:00:00Z") });
    await mockLanguageLearningBase(page);
    await page.route("**/api/v1/language-learning/settings", (route) => fulfillApiJson(route, responseDto({
        ...LANGUAGE_LEARNING_SETTING, originLanguage: "ko", learningLanguage: "en", timezone: "America/Los_Angeles",
    })));
    await page.route("**/api/v1/language-learning/history?**", (route) => fulfillApiJson(route, responseDto([
        { activityId: "WRITING:old-ja", source: "WRITING", originLanguage: "ko", learningLanguage: "ja",
            learningDate: "2026-10-16", title: "Daily Writing · TRANSLATION", topic: "TRANSLATION",
            completionStatus: "COMPLETED", evaluationStatus: "SUCCESS", overallScore: 99, durationSeconds: 0 },
        { activityId: "WRITING:unknown", source: "WRITING", learningDate: "2026-10-16",
            title: "Daily Writing · GUIDED", topic: "GUIDED", completionStatus: "COMPLETED", evaluationStatus: "SUCCESS", overallScore: 100, durationSeconds: 0 },
        { activityId: "WRITING:current-en", source: "WRITING", originLanguage: "ko", learningLanguage: "en",
            learningDate: "2026-10-16", title: "Daily Writing · FREE", topic: "FREE",
            completionStatus: "COMPLETED", evaluationStatus: "SUCCESS", overallScore: 85, durationSeconds: 0 },
    ])));

    // 실행
    await page.goto("/ko/language-learning/writing");

    // 검증: 과거 일본어·미상 이력은 시작 전 상태이며 현재 영어 이력만 완료로 표시한다.
    await expect(page.getByTestId("daily-writing-type-translation")).toHaveAttribute("data-state", "NOT_STARTED");
    await expect(page.getByTestId("daily-writing-type-guided")).toHaveAttribute("data-state", "NOT_STARTED");
    await expect(page.getByTestId("daily-writing-type-free")).toHaveAttribute("data-state", "COMPLETED");
    await expect(page.getByTestId("daily-writing-type-free")).toContainText("85.0");
});
