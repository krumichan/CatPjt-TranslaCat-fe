import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";
import { openNovelReleaseSession, releaseAppUrl, releaseApiUrl } from "../support/novel-release-live";

test.use({ trace: "off", video: "off" });

test("NOVEL-LEGACY-OFF actual cached reader survives without Novel service", async ({ page, context, request }) => {
    test.skip(process.env.NOVEL_LEGACY_OFF_LIVE_E2E !== "1", "Explicit local OFF image and isolated legacy DB fixture required");
    const root = process.env.NOVEL_LIVE_ARTIFACT_DIR ?? "";
    const preparedFile = process.env.NOVEL_LEGACY_OFF_FIXTURE ?? "";
    if (!path.isAbsolute(root) || !path.isAbsolute(preparedFile)) throw new Error("LOCAL_LEGACY_EVIDENCE_REQUIRED");
    const file = path.join(root, "actual-legacy-off-reader.json");
    if (fs.existsSync(file)) throw new Error("PRESERVE_LEGACY_EVIDENCE");
    const hash = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");
    const prepared = JSON.parse(fs.readFileSync(preparedFile, "utf8"));
    const bytes = fs.readFileSync(prepared.frozenResult);
    expect(hash(bytes)).toBe(prepared.frozenSha256.toLowerCase());
    const source = JSON.parse(bytes.toString("utf8")).final;
    const expected = source.segments.filter((segment: { plainJa: string }) => segment.plainJa.trim());
    expect(expected).toHaveLength(21);
    let newNovelRequests = 0, legacyGets = 0, status: number | null = null, failure: string | null = null;
    const actualHashes: { jaSha256: string; koSha256: string }[] = [];
    try {
        // 준비: 정상 BE 로그인만 사용하며 공개 원문 수집은 승인된 exact HTML fixture 경계다.
        await openNovelReleaseSession(context, request, 900101);
        await page.route(`${releaseApiUrl}/**`, async route => {
            const endpoint = new URL(route.request().url()).pathname;
            if (/\/reader$|\/translations(?:\/|$)|\/audio$|\/novels\/catalog(?:\/|$)/.test(endpoint)) {
                newNovelRequests++;
                return route.abort();
            }
            await route.continue();
        });
        const endpoint = `${releaseApiUrl}/syosetu/n2604off/episodes/1`;
        page.on("request", req => { if (req.url() === endpoint && req.method() === "GET") legacyGets++; });
        const responsePromise = page.waitForResponse(response => response.url() === endpoint && response.request().method() === "GET");

        // 실행: 기본 OFF 이미지의 기존 페이지에서 실제 FE→BE→DB 응답과 렌더링을 함께 확인한다.
        await page.goto(`${releaseAppUrl}/ko/novel/syosetu/novels/n2604off/episode/1`);
        const response = await responsePromise;
        status = response.status();
        expect(status).toBe(200);
        const body = (await response.json()).body;
        expect(body.contents).toHaveLength(expected.length);
        for (let index = 0; index < expected.length; index++) {
            expect(body.contents[index].ja).toBe(expected[index].plainJa);
            expect(body.contents[index].ko).toBe(expected[index].ko);
            actualHashes.push({ jaSha256: hash(body.contents[index].ja), koSha256: hash(body.contents[index].ko) });
        }
        await expect(page.locator("article > div")).toHaveCount(expected.length);
        for (let index = 0; index < expected.length; index++) {
            await expect(page.locator("article > div").nth(index)).toHaveText(expected[index].ko);
        }
        expect(legacyGets).toBeGreaterThan(0);
        expect(newNovelRequests).toBe(0);
        await expect(page.getByTestId("novel-translation-state")).toHaveCount(0);
    } catch (error) {
        failure = error instanceof Error ? error.message.slice(0, 1200) : "UNKNOWN_FAILURE";
        throw error;
    } finally {
        fs.writeFileSync(file, JSON.stringify({ status, failure, legacyGets, newNovelRequests, sourceFileSha256: hash(bytes),
            actualHashes, boundary: "Actual local OFF FE/BE/MySQL legacy reader; raw external source HTML is an exact local fixture. Synthetic NextAuth packaging with real BE login. No real Google completion or public scraping claim.",
            finishedAt: new Date().toISOString() }, null, 2), { flag: "wx" });
    }
});
