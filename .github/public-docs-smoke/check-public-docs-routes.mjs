import assert from "node:assert/strict";

const origin = new URL(process.argv[2] ?? "https://translacat.vercel.app");
const locales = ["ko", "ja", "en"];
const checks = [];

// リダイレクトを追わず、署名なしの実際の HTTP 応答を確認する。
async function request(path) {
    return fetch(new URL(path, origin), {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
    });
}

// 文書ルートが匿名ユーザーにも HTML を返すことを確認する。
async function publicPage(path) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/i, path);
    await response.body?.cancel();
    checks.push({ path, status: response.status });
}

// レガシーリンクがクエリを保持し、直接新しいガイドに着くことを確認する。
async function legacyGuide(path, expectedPath) {
    const original = new URL(path, origin);
    original.searchParams.set("migration_check", "한글 日本語");
    const response = await request(original.pathname + original.search);
    assert.equal(response.status, 307, path);
    const location = new URL(response.headers.get("location") ?? "", origin);
    assert.equal(location.origin, origin.origin, path);
    assert.equal(location.pathname, expectedPath, path);
    assert.equal(location.searchParams.get("migration_check"), "한글 日本語", path);
    await publicPage(location.pathname + location.search);
    checks.push({ path, status: response.status, destination: location.pathname });
}

// 公開範囲の拡張後も、既存のサービス画面にはログインが必要なことを確認する。
async function protectedPage() {
    const path = "/ko/boards?board=MEMBER";
    const response = await request(path);
    assert.equal(response.status, 307, path);
    const location = new URL(response.headers.get("location") ?? "", origin);
    assert.equal(location.pathname, "/ko/login", path);
    assert.equal(location.searchParams.get("callbackUrl"), path);
    checks.push({ path, status: response.status, destination: location.pathname });
}

// 既存言語別ルートが公開設計サイトの同じ言語入口につながることを確認する。
async function designEntrance(locale) {
    const path = `/${locale}/docs?migration_check=1`;
    const response = await request(path);
    assert.equal(response.status, 307, path);
    const location = new URL(response.headers.get("location") ?? "", origin);
    assert.equal(location.origin, origin.origin, path);
    assert.equal(location.pathname, "/docs", path);
    assert.equal(location.searchParams.get("lang"), locale, path);
    assert.equal(location.searchParams.get("migration_check"), "1", path);
    await publicPage(location.pathname + location.search);
    checks.push({ path, status: response.status, destination: location.pathname + location.search });
}

// ガイド検索が公開され、検索結果から新しい URL が返されることを確認する。
async function guideSearch() {
    const path = "/api/guides/search?query=account&locale=en&limit=10";
    const response = await request(path);
    assert.equal(response.status, 200, path);
    const matches = await response.json();
    assert(Array.isArray(matches) && matches.some((item) =>
        typeof item.url === "string" && new URL(item.url, origin).pathname.startsWith("/en/guides"),
    ), path);
    checks.push({ path, status: response.status, matches: matches.length });
}

for (const locale of locales) {
    await Promise.all([
        designEntrance(locale),
        publicPage(`/${locale}/guides`),
        legacyGuide(`/${locale}/docs/account-books/create`, `/${locale}/guides/account-books/create`),
    ]);
}
await Promise.all([
    publicPage("/docs"),
    legacyGuide("/guides", "/ko/guides"),
    legacyGuide("/ko/docs/learning/writing", "/ko/guides/language-learning/writing"),
    legacyGuide("/ja/docs/learning/writing", "/ja/guides/language-learning/writing"),
    protectedPage(),
    guideSearch(),
]);

console.log(JSON.stringify({ origin: origin.origin, pass: true, checks }, null, 2));
