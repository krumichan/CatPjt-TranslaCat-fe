import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";
import { openNovelReleaseSession, releaseApiUrl, releaseAppUrl } from "../support/novel-release-live";
import type { ReaderSnapshot, ReaderTimings } from "../../src/types/novel/reader";

const enabled = process.env.NOVEL_RELEASE_REGRESSION_LIVE_E2E === "1";
const digest = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
function evidenceFile(name: string) {
    const root = process.env.NOVEL_LIVE_ARTIFACT_DIR ?? "";
    if (!path.isAbsolute(root)) throw new Error("ABSOLUTE_EVIDENCE_REQUIRED");
    fs.mkdirSync(root, { recursive: true });
    const file = path.join(root, `${name}.json`);
    if (fs.existsSync(file)) throw new Error("EXISTING_EVIDENCE_NO_PAID_RERUN");
    return file;
}

test.use({ trace: "off", video: "off" });
test.describe("unchanged A and explicit tail recovery on the final stack", () => {
    test.skip(!enabled, "Root-controlled final A/tail regression stage required");
    test.describe.configure({ timeout: 240_000, retries: 0 });
    for (const episode of ["1", "10"]) {
        test(`NOVEL-RELEASE-A-${episode} actual A progressive prefix, saved body and600cpm simulation`, async ({ page, context, request }) => {
            const file = evidenceFile(`a-episode-${episode}`);
            const base = `${releaseApiUrl}/syosyetu/n2604qg/episodes/${episode}`;
            let before: ReaderSnapshot | null = null, after: ReaderSnapshot | null = null, metrics: ReaderTimings | null = null;
            let failure: string | null = null, posts = 0, audio = 0;
            let firstState: string | null = null;
            let firstKo: string[] = [];
            let simulation: unknown = null;
            try {
                const headers = await openNovelReleaseSession(context, request, 900105);
                const initial = await request.get(`${base}/reader`, { headers }); expect(initial.ok()).toBe(true);
                before = (await initial.json()).body;
                expect(before?.state).toBe("SOURCE_READY"); expect(before?.jobId).toBeNull();
                await page.route(`${base}/**`, async route => {
                    const req = route.request();
                    if (req.url().endsWith("/audio")) { audio++; await route.abort(); throw new Error("UNREQUESTED_AUDIO"); }
                    if (req.method() === "POST" && (req.url() !== `${base}/translations` || ++posts !== 1 || req.postDataJSON().revision !== before?.revision)) {
                        await route.abort(); throw new Error("A_PAID_SCOPE_VIOLATION");
                    }
                    await route.continue();
                });
                await page.goto(`${releaseAppUrl}/ko/novel/syosyetu/novels/n2604qg/episode/${episode}`);
                const state = page.getByTestId("novel-translation-state");
                await expect(state).toHaveAttribute("data-state", "SOURCE_READY");
                await page.getByRole("button", { name: "전체 번역 시작", exact: true }).click();
                const ko = page.locator('[data-testid="novel-sentence"] p[lang="ko"]');
                await expect.poll(() => ko.count(), { timeout: 90_000 }).toBeGreaterThan(0);
                firstState = await state.getAttribute("data-state");
                firstKo = await ko.allTextContents();
                expect(firstState).toBe("RUNNING");
                await page.evaluate(() => window.scrollTo(0, 250));
                const scroll = await page.evaluate(() => window.scrollY);
                await expect(state).toHaveAttribute("data-state", "SUCCEEDED", { timeout: 180_000 });
                expect(Math.abs((await page.evaluate(() => window.scrollY)) - scroll)).toBeLessThanOrEqual(5);
                metrics = JSON.parse((await state.getAttribute("data-reader-metrics"))!);
                expect(metrics?.firstTranslation).toBeGreaterThan(0);
                expect(metrics?.readReady200).toBeGreaterThan(0);
                expect(metrics?.allTranslations).toBeGreaterThan(metrics!.readReady200!);
                expect(metrics?.durableObserved).toBeGreaterThanOrEqual(0);
                const saved = await request.get(`${base}/reader`, { headers }); expect(saved.ok()).toBe(true);
                after = (await saved.json()).body as ReaderSnapshot;
                expect(after.durableComplete).toBe(true);
                expect(after.revision).toBe(before!.revision);
                const finalKo = await ko.allTextContents();
                expect(finalKo).toEqual(after.segments.filter(item => item.plainJa.trim()).map(item => item.ko));
                expect(finalKo.slice(0, firstKo.length)).toEqual(firstKo);
                expect(posts).toBe(1); expect(audio).toBe(0);

                // 실제 낭독이 아닌 관측된 KO prefix 공급량을600자/분 소비자와 비교하는 별도 시뮬레이션이다.
                const history = metrics!.translatedPrefixHistory ?? [];
                const origin = metrics!.readReady200!;
                const finalChars = history.at(-1)?.translatedCodePoints ?? 0;
                const gaps = history.filter(item => item.elapsedMs >= origin).map((item, index, eligible) => {
                    const previous = index ? eligible[index - 1] : history.filter(value => value.elapsedMs <= origin).at(-1);
                    const neededBeforeArrival = Math.min(finalChars, Math.max(0, (item.elapsedMs - origin) / 100));
                    return { elapsedMs: item.elapsedMs, availableBefore: previous?.translatedCodePoints ?? 0, neededBeforeArrival,
                        deficit: Math.max(0, neededBeforeArrival - (previous?.translatedCodePoints ?? 0)) };
                });
                simulation = { mode: "OBSERVED_PREFIX_SIMULATION_NOT_AUDIO", charactersPerMinute: 600, startReadReady200Ms: origin,
                    underflowObserved: gaps.some(item => item.deficit > 0), gaps };
                expect(gaps.every(item => item.deficit === 0)).toBe(true);
            } catch (error) { failure = error instanceof Error ? error.message.slice(0, 1800) : "UNKNOWN_FAILURE"; throw error; }
            finally {
                if (!metrics && !page.isClosed()) {
                    const value = await page.getByTestId("novel-translation-state").getAttribute("data-reader-metrics", { timeout: 1000 }).catch(() => null);
                    if (value) metrics = JSON.parse(value);
                }
                fs.writeFileSync(file, JSON.stringify({ version: 1, actorId: 900105, episode, before, after, posts, audio, firstState, firstKo, metrics, simulation, failure,
                    auth: "Real BE auth/ADMIN, synthetic local NextAuth packaging; Google excluded", finishedAt: new Date().toISOString() }, null, 2), { flag: "wx" });
            }
        });
    }

    test("NOVEL-RELEASE-TAIL explicit remaining three failures only", async ({ page, context, request }) => {
        const file = evidenceFile("explicit-tail-three");
        const receipt = JSON.parse(fs.readFileSync(process.env.NOVEL_RECOVERY_TAIL_RECEIPT ?? "", "utf8")).cases[0];
        expect(receipt.actorId).toBe(900101); expect(receipt.sourceKey).toBe("syosyetu:n2604qg:4");
        const base = `${releaseApiUrl}/syosyetu/n2604qg/episodes/4`;
        let before: ReaderSnapshot | null = null, after: ReaderSnapshot | null = null, metrics: unknown = null;
        let failure: string | null = null, posts = 0;
        try {
            const headers = await openNovelReleaseSession(context, request, 900101);
            const response = await request.get(`${base}/reader`, { headers }); expect(response.ok()).toBe(true);
            before = (await response.json()).body as ReaderSnapshot;
            expect(before.revision).toBe(receipt.revision); expect(before.jobId).toBe(receipt.jobId);
            expect(before.segments.filter(item => item.status === "FAILED").map(item => item.id)).toEqual(receipt.excludedIds);
            expect(before.segments.slice(-3).map(item => item.id)).toEqual(receipt.excludedIds);
            for (const [id, hash] of Object.entries(receipt.expectedNormalHashes as Record<string, string>)) expect(digest(before.segments.find(item => item.id === id)?.ko ?? "")).toBe(hash);
            await page.route(`${base}/**`, async route => {
                const req = route.request();
                if (req.method() === "POST" && (req.url() !== `${base}/translations/${receipt.jobId}/repair` || ++posts !== 1 || req.postDataJSON().segmentId !== undefined || req.postDataJSON().revision !== receipt.revision)) {
                    await route.abort(); throw new Error("TAIL_PAID_SCOPE_VIOLATION");
                }
                await route.continue();
            });
            await page.goto(`${releaseAppUrl}/ko/novel/syosyetu/novels/n2604qg/episode/4`);
            await page.getByRole("button", { name: "미완료 부분 이어 번역", exact: true }).click();
            await expect(page.getByTestId("novel-repair-state")).toContainText("복구 저장 완료", { timeout: 140_000 });
            metrics = JSON.parse((await page.getByTestId("novel-repair-state").getAttribute("data-repair-metrics"))!);
            const saved = await request.get(`${base}/translations/${receipt.jobId}`, { headers }); expect(saved.ok()).toBe(true);
            after = (await saved.json()).body as ReaderSnapshot;
            expect(after.recovery?.targetIds).toEqual(receipt.excludedIds);
            expect(after.recovery?.committedIds).toEqual(receipt.excludedIds);
            expect(after.durableComplete).toBe(true); expect(posts).toBe(1);
            for (const [id, hash] of Object.entries(receipt.expectedNormalHashes as Record<string, string>)) expect(digest(after.segments.find(item => item.id === id)?.ko ?? "")).toBe(hash);
        } catch (error) { failure = error instanceof Error ? error.message.slice(0, 1800) : "UNKNOWN_FAILURE"; throw error; }
        finally { fs.writeFileSync(file, JSON.stringify({ version: 1, caseId: receipt.caseId, before, after, metrics, posts, failure, finishedAt: new Date().toISOString() }, null, 2), { flag: "wx" }); }
    });
});
