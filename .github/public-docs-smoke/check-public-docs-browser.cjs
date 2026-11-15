const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const origin = new URL(process.argv[2]);
const playwright = require(resolve(process.argv[3] || "node_modules/playwright"));
const executablePath = process.argv[4] || undefined;
const example = "#translacat/fn/7412c9839c884502a289-47842e71fbcf/implementation";
const headings = {
    ko: "가계부 등록 상세설계",
    ja: "家計簿登録の詳細設計",
    en: "Account book creation design",
};

// セッションのないブラウザーで公開ルートと各言語の表示を検証する。
async function designPage(browser, locale) {
    const context = await browser.newContext({ viewport: { width: 1360, height: 980 }, acceptDownloads: true });
    const page = await context.newPage();
    const failures = [];
    try {
        assert.deepEqual(await context.cookies(), []);
        page.on("pageerror", (error) => failures.push(error.name));
        page.on("response", (response) => {
            const url = new URL(response.url());
            if (url.pathname.startsWith("/design-docs-assets/") && response.status() >= 400) {
                failures.push(url.pathname);
            }
        });
        await page.addInitScript(() => {
            window.docFlowLabels = [];
            const fill = CanvasRenderingContext2D.prototype.fillText;
            CanvasRenderingContext2D.prototype.fillText = function (label, x, y, ...rest) {
                const bounds = this.measureText(label);
                const { a, d } = this.getTransform();
                if (x - bounds.actualBoundingBoxLeft >= 0 && x + bounds.actualBoundingBoxRight <= this.canvas.width / a &&
                    y - bounds.actualBoundingBoxAscent >= 0 && y + bounds.actualBoundingBoxDescent <= this.canvas.height / d) {
                    window.docFlowLabels.push(String(label));
                }
                return fill.call(this, label, x, y, ...rest);
            };
        });

        const entry = new URL(locale === "ko" ? "/docs" : `/docs?lang=${locale}`, origin);
        const design = await page.goto(entry.href + "#translacat/detail/account-book-create", { waitUntil: "domcontentloaded" });
        assert.equal(design.status(), 200);
        assert.equal(new URL(page.url()).pathname, "/docs");
        await page.locator("main h1").filter({ hasText: headings[locale] }).waitFor();
        assert.equal(await page.locator("html").getAttribute("lang"), locale);
        assert.equal(await page.locator("[data-user-guide]").getAttribute("href"), `/${locale}/guides`);

        await page.goto(entry.href + example, { waitUntil: "domcontentloaded" });
        const diagram = page.locator(".diagram[data-implementation][data-render-state=done]").first();
        const image = diagram.locator("img");
        await image.waitFor();
        if (locale === "ja") {
            const labels = await page.evaluate(() => window.docFlowLabels.join("").replace(/\s/g, ""));
            assert(labels.includes("家計簿へのアクセス権限確認"));
        }
        const [download] = await Promise.all([
            page.waitForEvent("download"),
            diagram.locator("a[download]").click(),
        ]);
        const file = readFileSync(await download.path());
        const data = Buffer.from((await image.getAttribute("src")).split(",")[1], "base64");
        assert.equal(file.subarray(1, 4).toString(), "PNG");
        assert(file.equals(data));
        if (locale === "en") {
            await page.selectOption("#language", "ja");
            await page.waitForFunction(() => document.documentElement.lang === "ja");
            assert.equal(new URL(page.url()).hash, example);
            assert.equal(new URL(page.url()).searchParams.get("lang"), "ja");
        }
        const guide = await page.goto(new URL(`/${locale}/guides`, origin).href, { waitUntil: "domcontentloaded" });
        assert.equal(guide.status(), 200);
        assert.deepEqual(failures, []);
        return { locale, publicDesign: true, guide: true, pngMatches: true, ...(locale === "ja" ? { s01FullyPainted: true } : {}) };
    } finally {
        await context.close();
    }
}

// 以前に共有されたガイドの目次 URL をブラウザーで開き、クエリとハッシュを確認する。
async function verifyGuideAnchor(browser) {
    const page = await browser.newPage();
    try {
        const hash = "#" + encodeURIComponent("화면-언어-바꾸기");
        const legacy = new URL("/ko/docs/getting-started?ref=help&ref=share", origin);
        const response = await page.goto(legacy.href + hash, { waitUntil: "domcontentloaded" });
        assert.equal(response.status(), 200);
        const link = new URL(page.url());
        assert.equal(link.pathname, "/ko/guides/getting-started");
        assert.deepEqual(link.searchParams.getAll("ref"), ["help", "share"]);
        assert.equal(link.hash, hash);
        await page.getByRole("heading", { name: "화면 언어 바꾸기", exact: true }).waitFor();
        return true;
    } finally {
        await page.close();
    }
}

// ロケールごとの認証状態を分離して結果を記録する。
async function main() {
    const browser = await playwright.chromium.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
    try {
        const results = [];
        for (const locale of Object.keys(headings)) {
            results.push(await designPage(browser, locale));
        }
        const legacyGuideAnchor = await verifyGuideAnchor(browser);
        console.log(JSON.stringify({ origin: origin.origin, results, legacyGuideAnchor }, null, 2));
    } finally {
        await browser.close();
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
