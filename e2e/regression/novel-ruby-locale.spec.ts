import { test, expect, installMockAuthCookie } from "../fixtures/mock-test";
import { fulfillApiJson, fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const ruby = "<ruby>猫<rt>ねこ</rt></ruby>の話";
const translated = "고양이 이야기";
const unit = () => ({ rawJa: "猫の話", ja: ruby, ko: translated });

test.beforeEach(async ({ page, context }) => {
    await installMockAuthCookie(context, "ADMIN");
    await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
    await mockIdleWebSocket(page);
});

for (const kind of ["RANKING", "SEARCH"] as const) {
    test(`NOVEL-RUBY-${kind} KRJP 카드에 요미가나와 한국어를 함께 표시한다`, async ({ page }) => {
        // 준비: 원문·ruby·번역을 서로 다르게 두어 필드 선택 오류를 드러낸다.
        let requestedLanguage = "";
        await page.route("**/ranking/periods", route => fulfillJson(route, responseDto([{ code: "daily", label: "매일" }])));
        await page.route("**/novels/catalog", route => {
            const selector = route.request().postDataJSON();
            requestedLanguage = selector.language;
            return fulfillJson(route, responseDto({
                snapshotId: "ruby-list", eventSequence: 1, state: "SUCCEEDED", total: 1, ready: 1, failed: 0,
                pageInfo: null, selector,
                items: [{ itemId: "ruby-item", identifier: "n-ruby", rank: kind === "RANKING" ? 1 : null,
                    sourcePosition: 0, status: "READY", title: unit(), author: unit(), synopsis: unit(), statusText: unit(),
                    genreText: "", isShortStory: false, arrivalSequence: 0, errorCode: null, cached: true }],
            }));
        });
        const path = kind === "RANKING" ? "/learning/novel/syosyetu/genres/all?period=daily"
            : "/learning/novel/syosyetu/search/novels?keyword=cat";

        // 실행
        await page.goto(path);
        const card = page.getByTestId("novel-catalog-card");
        await expect(card).toBeVisible();

        // 검증: KRJP는 한국어를 요청하고 제목·작품 정보·줄거리를 각각 분리해 병기한다.
        expect(requestedLanguage).toBe("ko");
        const title = card.getByTestId("novel-card-title");
        const metadata = card.getByTestId("novel-card-metadata");
        const synopsis = card.getByTestId("novel-card-synopsis");
        await expect(title.locator("ruby rt")).toHaveText("ねこ");
        await expect(title.locator("[lang=ko]")).toHaveText(translated);
        await expect(metadata).toContainText("연재");
        await expect(metadata.locator("[lang=ko]")).toHaveCount(2);
        await expect(synopsis.locator("ruby rt")).toHaveText("ねこ");
        await expect(synopsis.locator("[lang=ko]")).toHaveText(translated);
        await expect(card).not.toContainText("日本語 · 원문");
        await expect(card).not.toContainText("한국어 · 번역");
        // ruby의 textContent에는 rt도 포함되므로, 화면 원문은 base 텍스트 노드로 확인한다.
        expect(await title.locator("ruby").evaluate(element => element.firstChild?.textContent)).toBe("猫");
    });
}

test("NOVEL-RUBY-DETAIL KRJP 작품 소개와 에피소드 목록의 요미가나·한국어를 복구한다", async ({ page }) => {
    // 준비: 목록과 소개의 원문·ruby·번역을 분리한다.
    await page.route("**/syosyetu/novels/n-ruby?page=1", route => fulfillApiJson(route, responseDto({
        title: unit(), author: unit(), synopsis: unit(),
        pageInfo: { firstPage: null, prevPage: null, nextPage: null, lastPage: null, currentPage: 1, pages: [1] },
        episodes: [{ sequence: 1, identifier: "e-ruby", title: unit() }],
    })));
    await page.route("**/recent-views", route => fulfillJson(route, responseDto({})));

    // 실행
    await page.goto("/learning/novel/syosyetu/novels/n-ruby?page=1");
    const heading = page.getByRole("heading", { level: 1 });
    const episode = page.locator("#episode-list").getByText(translated, { exact: true });

    // 검증: 소개와 목록은 동일한 원문 ruby와 한국어 번역을 함께 가진다.
    await expect(heading.locator("ruby rt")).toHaveText("ねこ");
    await expect(heading.locator("[lang=ko]")).toHaveText(translated);
    await expect(episode).toBeVisible();
    await expect(page.locator("#episode-list ruby rt")).toHaveText("ねこ");
    await expect(heading).not.toContainText("日本語 · 원문");
    await expect(heading).not.toContainText("한국어 · 번역");
    await expect(page.locator("#episode-list")).not.toContainText("日本語 · 원문");
    await expect(page.locator("#episode-list")).not.toContainText("한국어 · 번역");
});
