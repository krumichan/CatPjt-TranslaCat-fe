import { expect, test } from "../fixtures/mock-test";
import { fulfillApiJson } from "../support/api-mocks";
import { LANGUAGE_LEARNING_KEYWORDS, mockLanguageLearningBase } from "../support/language-learning-mocks";
import { responseDto } from "../support/mock-data";

const SCENARIOS = [
    { name: "PC", width: 1280, height: 900, failRefresh: false },
    { name: "모바일", width: 390, height: 844, failRefresh: false },
    { name: "목록 재조회 실패", width: 390, height: 844, failRefresh: true },
] as const;

for (const scenario of SCENARIOS) {
    test(`시스템 키워드 선택 — ${scenario.name}에서 화면과 스크롤을 유지한다`, async ({ page }) => {
        // 준비: 선택 저장 후 목록 조회를 잠시 보류해 중간 로딩 상태도 검증한다.
        await mockLanguageLearningBase(page);
        await page.setViewportSize({ width: scenario.width, height: scenario.height });
        let keywords = structuredClone(LANGUAGE_LEARNING_KEYWORDS);
        let selected = false;
        let refreshStarted = false;
        let failRefresh: boolean = scenario.failRefresh;
        let releaseRefresh!: () => void;
        const refreshGate = new Promise<void>((resolve) => { releaseRefresh = resolve; });
        await page.route("**/api/v1/language-learning/keywords", async (route) => {
            if (selected) {
                refreshStarted = true;
                await refreshGate;
                if (failRefresh) {
                    await route.fulfill({ status: 503, body: "temporarily unavailable" });
                    return;
                }
            }
            await fulfillApiJson(route, responseDto(keywords));
        });
        await page.route("**/api/v1/language-learning/keywords/system/2/selection", async (route) => {
            selected = true;
            keywords = {
                ...keywords,
                systemKeywords: keywords.systemKeywords.map((keyword) => keyword.id === 2
                    ? { ...keyword, selected: route.request().postDataJSON().selected }
                    : keyword),
            };
            // 저장 응답의 표시명이 달라도 현재 UI 언어의 라벨은 유지해야 한다.
            await fulfillApiJson(route, responseDto({ ...keywords.systemKeywords[1], displayName: "Deployment" }));
        });
        await page.goto("/ko/language-learning/settings");
        const settings = page.getByTestId("language-learning-settings");
        await expect(settings).toBeVisible();
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        const draft = page.getByPlaceholder("예: Customer Service, deployment");
        await draft.fill("작성 중인 키워드");
        const expanded = page.getByTestId("system-keyword-group-1").locator("button[aria-expanded]");
        await expanded.click();
        const keyword = page.getByTestId("system-keyword-2");
        await keyword.evaluate((element) => element.scrollIntoView({ block: "center" }));
        const scrollArea = page.locator("main.overflow-y-auto");
        const scrollTop = await scrollArea.evaluate((element) => element.scrollTop);
        const originalSettings = (await settings.elementHandle())!;

        // 실행 / 검증: 서버가 재조회에 응답하기 전에도 기존 DOM·펼침·초안·스크롤을 보존한다.
        await keyword.click();
        await expect.poll(() => refreshStarted).toBe(true);
        expect(await originalSettings.evaluate((element) => element.isConnected)).toBe(true);
        await expect(expanded).toHaveAttribute("aria-expanded", "true");
        await expect(draft).toHaveValue("작성 중인 키워드");
        await expect(page.getByTestId("system-keyword-primary-2")).toHaveText("배포");
        await expect.poll(async () => Math.abs((await scrollArea.evaluate((element) => element.scrollTop)) - scrollTop)).toBeLessThanOrEqual(2);
        releaseRefresh();

        if (scenario.failRefresh) {
            // 검증: 저장 성공 뒤 조회만 실패해도 선택 결과와 화면은 유지하고 그 자리에서 재시도한다.
            const retryNotice = settings.getByRole("alert").filter({ hasText: "키워드 목록을 갱신하지 못했어요" });
            await expect(retryNotice).toBeVisible();
            await expect(keyword).toHaveAttribute("aria-pressed", "true");
            expect(await originalSettings.evaluate((element) => element.isConnected)).toBe(true);
            failRefresh = false;
            await retryNotice.getByRole("button", { name: "다시 시도" }).click();
            await expect(retryNotice).toHaveCount(0);
        }

        // 검증: 최종 응답 후에도 상태가 유지되고 페이지 탐색은 발생하지 않는다.
        await expect(keyword).toHaveAttribute("aria-pressed", "true");
        await expect(expanded).toHaveAttribute("aria-expanded", "true");
        await expect(draft).toHaveValue("작성 중인 키워드");
        expect(await originalSettings.evaluate((element) => element.isConnected)).toBe(true);
        if (!scenario.failRefresh) {
            await expect.poll(async () => Math.abs((await scrollArea.evaluate((element) => element.scrollTop)) - scrollTop)).toBeLessThanOrEqual(2);
        }
        await expect(page).toHaveURL(/\/language-learning\/settings$/);
    });
}
