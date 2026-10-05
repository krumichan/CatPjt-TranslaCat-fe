import { test, expect, installMockAuthCookie } from "../fixtures/mock-test";
import { fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

test("NOVEL-DEFAULT-OFF production preserves legacy reader, ranking and search", async ({ page, context }) => {
    test.skip(process.env.NOVEL_DEFAULT_OFF_E2E !== "1", "Separate local default-OFF production artifact required");
    await installMockAuthCookie(context, "ADMIN");
    await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
    await mockIdleWebSocket(page);
    const text = (ko: string) => ({ rawJa: "原文", ja: "原文", ko });
    const novel = { identifier: "n-test", rank: 1, isShortStory: false, title: text("기존 목록 작품"), author: text("작가"), synopsis: text("기존 소개"), status: text("완결") };
    let newRequests = 0, legacyReader = 0, ranking = 0, search = 0;
    await page.route("**/novels/catalog**", route => { newRequests++; return route.abort(); });
    await page.route("**/episodes/2/reader", route => { newRequests++; return route.abort(); });
    await page.route("**/episodes/2", route => {
        legacyReader++;
        return fulfillJson(route, responseDto({ title: text("기존 회차"), contents: [text("기존 본문이 유지됩니다.")], pagerInfo: null }));
    });
    await page.route("**/ranking/periods", route => fulfillJson(route, responseDto([{ code: "daily", label: "매일" }])));
    await page.route("**/ranking/novels/daily/total?page=1", route => { ranking++; return fulfillJson(route, responseDto({ rankings: [novel], pageInfo: null })); });
    await page.route("**/api/v1/syosyetu/search/novels?keyword=sample&page=1", route => { search++; return fulfillJson(route, responseDto({ novels: [novel], pageInfo: null })); });

    // 실행 / 검증: 같은 URL은 기본 OFF 빌드에서 보존된 기존 GET 계약만 사용한다.
    await page.goto("/ko/novel/syosyetu/novels/n-test/episode/2");
    await expect(page.getByText("기존 본문이 유지됩니다.", { exact: true })).toBeVisible();
    await expect(page.getByTestId("novel-translation-state")).toHaveCount(0);
    await page.goto("/ko/novel/syosyetu/genres/total?period=daily&page=1");
    await expect(page.getByText("기존 목록 작품", { exact: true })).toBeVisible();
    await page.goto("/ko/novel/syosyetu/search/novels?keyword=sample&page=1");
    await expect(page.getByText("기존 목록 작품", { exact: true })).toBeVisible();
    expect(legacyReader).toBeGreaterThan(0); expect(ranking).toBeGreaterThan(0); expect(search).toBeGreaterThan(0); expect(newRequests).toBe(0);
});
