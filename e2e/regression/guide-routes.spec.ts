import { expect, test } from "@playwright/test";

const migrationCases = [
    ["/ko/docs/getting-started", "/ko/guides/getting-started"],
    ["/ja/docs/learning/reading", "/ja/guides/language-learning/reading"],
    ["/en/docs/novel/read-listen", "/en/guides/novel/read-listen"],
    ["/guides", "/ko/guides"],
] as const;

// 기존 공유 주소가 쿼리와 목차 링크를 보존하는지 검증한다.
test("GUIDE-ROUTE-01 이전 주소에서 공개 가이드로 이동한다", async ({ page, request }) => {
    const query = "?ref=help&ref=share";

    // 기존 경로는 각 언어의 최종 경로로 한 번에 이동해야 한다.
    for (const [source, destination] of migrationCases) {
        const redirect = await request.get(source + query, { maxRedirects: 0 });
        expect(redirect.status()).toBe(307);
        const target = new URL(redirect.headers().location, redirect.url());
        expect(target.pathname).toBe(destination);
        expect(target.searchParams.getAll("ref")).toEqual(["help", "share"]);

        const article = await request.get(target.href, { maxRedirects: 0 });
        expect(article.status()).toBe(200);
    }

    // 실제 가이드 목차 앵커로 새 주소에 도착했는지 확인한다.
    const anchor = "#" + encodeURIComponent("화면-언어-바꾸기");
    await page.goto(migrationCases[0][0] + query + anchor);
    expect(new URL(page.url()).hash).toBe(anchor);
    await expect(page.getByRole("heading", { name: "화면 언어 바꾸기", exact: true })).toBeVisible();
});

// 공개용 /docs와 동명의 다른 경로를 가이드가 가로채지 않는지 확인한다.
test("GUIDE-ROUTE-02 설계 문서 경로는 가이드로 이동하지 않는다", async ({ request }) => {
    for (const path of ["/docs", "/ko/docs", "/ja/docs", "/en/docs", "/ko/docs/project-architecture"]) {
        const response = await request.get(path, { maxRedirects: 0 });
        const location = response.headers().location;
        if (location) {
            expect(new URL(location, response.url()).pathname).not.toMatch(/^\/(?:ko|ja|en)\/guides(?:\/|$)/);
        }
    }
});
