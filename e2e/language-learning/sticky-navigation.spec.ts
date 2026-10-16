import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test } from "../fixtures/mock-test";
import { mockLanguageLearningBase } from "../support/language-learning-mocks";

const QA_DIRECTORY = path.resolve("..", ".codex-workspace", "verification", "fe", "learning-sticky-tabs-20261016");
const SCENARIOS = [
    { name: "PC", width: 1280, height: 900, locale: "ko", dark: false, screenshot: "desktop-sticky.png" },
    { name: "모바일", width: 390, height: 844, locale: "ko", dark: true, screenshot: "mobile-sticky.png" },
    { name: "좁은 일본어 모바일", width: 320, height: 740, locale: "ja", dark: false, screenshot: "mobile-ja-menu.png" },
    { name: "일본어 태블릿 경계", width: 640, height: 800, locale: "ja", dark: false, screenshot: "tablet-ja-menu.png" },
    { name: "모바일 가로 화면", width: 740, height: 360, locale: "ja", dark: true, screenshot: "landscape-ja-menu.png" },
] as const;

for (const scenario of SCENARIOS) {
    test(`학습 탭 고정 — ${scenario.name}에서 스크롤·앵커·메뉴 이동을 유지한다`, async ({ page }) => {
        // 준비: 실제 서비스 데이터 변경 없이 공통 학습 설정 화면을 표시한다.
        await mockLanguageLearningBase(page);
        await page.setViewportSize({ width: scenario.width, height: scenario.height });
        await page.addInitScript((theme) => localStorage.setItem("theme", theme), scenario.dark ? "dark" : "light");
        await page.goto(`/${scenario.locale}/language-learning/settings`);
        await expect(page.getByTestId("language-learning-settings")).toBeVisible();

        const scrollArea = page.locator("main.overflow-y-auto");
        const tabs = page.getByTestId("language-learning-tabs");
        const appHeader = page.getByTestId("app-header");
        const headerBounds = (await appHeader.boundingBox())!;
        const headerBottom = headerBounds.y + headerBounds.height;
        expect((await tabs.boundingBox())!.y).toBeGreaterThan(headerBottom + 20);

        // 실행 / 검증: 제목은 사라지고 메뉴 한 줄만 헤더 바로 아래에 남는다.
        await scrollArea.evaluate((element) => element.scrollTo({ top: 550 }));
        await expect.poll(async () => Math.round((await tabs.boundingBox())!.y)).toBe(Math.round(headerBottom));
        await scrollArea.evaluate((element) => element.scrollTo({ top: 950 }));
        await expect.poll(async () => Math.round((await tabs.boundingBox())!.y)).toBe(Math.round(headerBottom));
        const tabBounds = (await tabs.boundingBox())!;
        expect(tabBounds.height).toBeLessThanOrEqual(60);
        const primaryLinks = ["dashboard", "history", "settings"].map((key) => page.getByTestId(`language-learning-tab-${key}`));
        for (const link of primaryLinks) {
            const bounds = (await link.boundingBox())!;
            expect(bounds.y).toBeGreaterThanOrEqual(tabBounds.y);
            expect(bounds.y + bounds.height).toBeLessThanOrEqual(tabBounds.y + tabBounds.height);
            expect(bounds.x).toBeGreaterThanOrEqual(tabBounds.x);
            expect(bounds.x + bounds.width).toBeLessThanOrEqual(tabBounds.x + tabBounds.width);
        }
        await expect(page.getByTestId("language-learning-tab-settings")).toHaveAttribute("aria-current", "page");

        // 실행 / 검증: 설정 바로가기의 제목이 고정 헤더와 메뉴에 가려지지 않는다.
        const keywords = page.locator("#learning-keywords");
        await keywords.evaluate((element) => element.scrollIntoView({ block: "start" }));
        await expect.poll(async () => Math.round((await keywords.boundingBox())!.y)).toBeGreaterThanOrEqual(Math.round(tabBounds.y + tabBounds.height));

        // 실행 / 검증: 좁은 화면에서도 펼친 학습 메뉴가 화면 밖으로 잘리지 않고 클릭된다.
        const todayMenu = page.getByTestId("language-learning-today-menu");
        await todayMenu.locator("summary").focus();
        await page.keyboard.press("Enter");
        const popup = todayMenu.locator(":scope > div");
        await expect(popup).toBeVisible();
        const popupBounds = (await popup.boundingBox())!;
        expect(popupBounds.x).toBeGreaterThanOrEqual(0);
        expect(popupBounds.x + popupBounds.width).toBeLessThanOrEqual(scenario.width);
        expect(popupBounds.y).toBeGreaterThanOrEqual(headerBottom + tabBounds.height);
        for (const mode of ["writing", "speaking", "listening", "reading"]) {
            await expect(page.getByTestId(`language-learning-tab-${mode}`)).toBeVisible();
        }
        // 검증: 가로 화면에서도 마지막 메뉴까지 내부 스크롤로 접근할 수 있다.
        const reading = page.getByTestId("language-learning-tab-reading");
        await reading.click({ trial: true });
        const readingBounds = (await reading.boundingBox())!;
        expect(readingBounds.y + readingBounds.height).toBeLessThanOrEqual(scenario.height);
        const overflows = await scrollArea.evaluate((element) => element.scrollWidth > element.clientWidth);
        expect(overflows).toBe(false);
        mkdirSync(QA_DIRECTORY, { recursive: true });
        await page.screenshot({ path: path.join(QA_DIRECTORY, scenario.screenshot) });

        // 검증: 스크롤 위치에서 이력으로 곧바로 이동하고 활성 메뉴가 바뀐다.
        await todayMenu.locator("summary").click();
        await page.getByTestId("language-learning-tab-history").click();
        await expect(page).toHaveURL(/\/language-learning\/history$/);
        await expect(page.getByTestId("language-learning-tab-history")).toHaveAttribute("aria-current", "page");
    });
}
