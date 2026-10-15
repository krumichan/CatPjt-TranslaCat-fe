import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";
import { openNovelReleaseSession, releaseAppUrl, releaseApiUrl } from "../support/novel-release-live";
import type { CatalogSnapshot } from "../../src/types/novel/catalog";

const enabled = process.env.NOVEL_CATALOG_LIVE_E2E === "1";
test.use({ trace: "off", video: "off" });
test.describe("actual progressive catalogue through the release stack", () => {
    test.skip(!enabled, "Root-controlled catalogue stage required");
    test.describe.configure({ timeout: 600_000, retries: 0 });
    test("NOVEL-CATALOG-LIVE 50 actual cards, append order, same-list cache and no speech", async ({ page, context, request }) => {
        const root = process.env.NOVEL_LIVE_ARTIFACT_DIR ?? "";
        if (!path.isAbsolute(root)) throw new Error("ABSOLUTE_CATALOG_EVIDENCE_REQUIRED");
        fs.mkdirSync(root, { recursive: true });
        const file = path.join(root, "catalog-50.json");
        if (fs.existsSync(file)) throw new Error("EXISTING_EVIDENCE_NO_PAID_RERUN");
        const base = `${releaseApiUrl}/syosyetu/novels/catalog`;
        const url = `${releaseAppUrl}/ko/novel/syosyetu/genres/total?period=daily&page=1`;
        const searchKeyword = "侯爵に転生した俺の息子がクズでした。どうしてくれようか";
        const snapshots: { receivedAt: string; snapshot: CatalogSnapshot }[] = [];
        const arrivals: { atMs: number; identifiers: string[]; ranks: string[] }[] = [];
        let arrivalCapturePhase: string | null = null;
        const reads: Promise<void>[] = [];
        const partialFile = process.env.NOVEL_CATALOG_RETRY_PARTIAL_FILE;
        let previous: CatalogSnapshot | null = null;
        let partialSha256: string | null = null;
        const retryIds = new Set<string>();
        const retryEvents: { identifier: string; requestedAt: string }[] = [];
        let retrySnapshotId: string | null = null;
        let starts = 0, audio = 0, failure: string | null = null;
        let phase = partialFile ? "FAILED_ITEMS_RETRY" : "COLD";
        const expectCache = process.env.NOVEL_CATALOG_EXPECT_CACHE === "1";
        if (expectCache && !partialFile) phase = "CACHE_VALIDATION";
        const sourceIdentity = (value: CatalogSnapshot["items"][number]) => [value.identifier, value.rank, value.sourcePosition,
            value.title.rawJa, value.author.rawJa, value.synopsis.rawJa, value.statusText.rawJa, value.genreText, value.isShortStory];
        try {
            if (partialFile) {
                if (!path.isAbsolute(partialFile)) throw new Error("ABSOLUTE_PARTIAL_EVIDENCE_REQUIRED");
                const raw = fs.readFileSync(partialFile);
                partialSha256 = createHash("sha256").update(raw).digest("hex");
                const evidence = JSON.parse(raw.toString("utf8"));
                previous = evidence.snapshots?.at(-1)?.snapshot ?? null;
                expect(previous?.state).toBe("PARTIAL"); expect(previous?.total).toBe(50);
                expect(previous?.ready).toBe(43); expect(previous?.failed).toBe(7);
                expect(previous?.items).toHaveLength(50);
                expect(new Set(previous!.items.map(item => item.identifier)).size).toBe(50);
                expect(previous!.items.filter(item => item.status === "FAILED")).toHaveLength(7);
                expect(previous!.items.filter(item => item.status === "READY")).toHaveLength(43);
            }
            await openNovelReleaseSession(context, request, 900101);
            // 목록2회와 사전 확인된 동일 작품 검색1회 외 생성 명령은 전송 전 차단한다.
            await page.route(`${releaseApiUrl}/**`, async route => {
                const req = route.request();
                if (req.url().endsWith("/audio")) { audio++; await route.abort(); throw new Error("CATALOG_AUDIO_FORBIDDEN"); }
                if (req.method() === "POST" && req.url() === base) {
                    const body = req.postDataJSON();
                    const selectorAllowed = starts < 2 ? body.kind === "RANKING" && body.period === "daily" && body.genreId === "total"
                        : body.kind === "SEARCH" && body.keyword === searchKeyword;
                    if (++starts > 3 || !selectorAllowed || body.language !== "ko" || body.page !== 1) {
                        await route.abort(); throw new Error("CATALOG_PAID_SCOPE_VIOLATION");
                    }
                } else if (req.method() === "POST" && req.url().startsWith(base) && !req.url().endsWith("/cancel")) {
                    const match = /\/([^/]+)\/items\/([^/]+)\/retry$/.exec(req.url());
                    const identifier = match?.[2];
                    if (!previous || !match || match[1] !== retrySnapshotId || !identifier || retryIds.has(identifier)
                        || !previous.items.some(item => item.identifier === identifier && item.status === "FAILED") || retryIds.size >= 7) {
                        await route.abort(); throw new Error("CATALOG_UNAPPROVED_RETRY");
                    }
                    retryIds.add(identifier); retryEvents.push({ identifier, requestedAt: new Date().toISOString() });
                }
                await route.continue();
            });
            page.on("response", response => {
                if (!response.ok() || !response.url().startsWith(base) || response.url().endsWith("/cancel")) return;
                reads.push(response.json().then(value => {
                    if (value.body?.items) snapshots.push({ receivedAt: new Date().toISOString(), snapshot: value.body });
                }).catch(() => {}));
            });
            await page.addInitScript(() => {
                const history: { atMs: number; identifiers: string[]; ranks: string[] }[] = [];
                Object.assign(window, { __catalogPaints: history });
                new MutationObserver(() => requestAnimationFrame(() => {
                    const cards = [...document.querySelectorAll('[data-testid="novel-catalog-card"]')];
                    const identifiers = cards.map(item => item.getAttribute("data-identifier")!);
                    if (!identifiers.length || JSON.stringify(identifiers) === JSON.stringify(history.at(-1)?.identifiers)) return;
                    history.push({ atMs: performance.now(), identifiers, ranks: cards.map(item => item.getAttribute("data-rank")!) });
                })).observe(document, { subtree: true, childList: true });
            });
            await page.goto(url);
            for (const label of ["일간", "주간", "월간", "분기", "연간", "누적"]) {
                await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
                await expect(page.getByRole("button", { name: label, exact: true })).toBeEnabled();
            }
            await expect(page.getByRole("button", { name: "일간", exact: true })).toHaveClass(/bg-blue-600/);
            const cards = page.getByTestId("novel-catalog-card");
            await expect(cards.first()).toBeVisible({ timeout: 120_000 });
            const first = { observedAt: new Date().toISOString(), count: await cards.count(), identifier: await cards.first().getAttribute("data-identifier") };
            fs.writeFileSync(path.join(root, "catalog-first-card-ready.json"), JSON.stringify(first, null, 2), { flag: "wx" });
            await cards.first().getByRole("link").focus();
            const focusedIdentifier = first.identifier;
            await page.evaluate(() => window.scrollTo(0, 150));
            let scroll = await page.evaluate(() => window.scrollY);
            let focusedRetry: string | null = null;
            if (previous) {
                await expect(cards).toHaveCount(50);
                await expect.poll(() => snapshots.at(-1)?.snapshot.state).toBe("PARTIAL");
                const current = snapshots.at(-1)!.snapshot;
                expect(current.ready).toBe(43); expect(current.failed).toBe(7);
                expect([...current.items].sort((a, b) => a.identifier.localeCompare(b.identifier)).map(sourceIdentity))
                    .toEqual([...previous.items].sort((a, b) => a.identifier.localeCompare(b.identifier)).map(sourceIdentity));
                for (const old of previous.items.filter(item => item.status === "READY")) {
                    const item = current.items.find(value => value.identifier === old.identifier)!;
                    expect(item.status).toBe("READY"); expect(item.cached).toBe(true);
                    expect([item.title.ko, item.author.ko, item.synopsis.ko, item.statusText.ko])
                        .toEqual([old.title.ko, old.author.ko, old.synopsis.ko, old.statusText.ko]);
                }
                expect(current.items.filter(item => item.status === "FAILED").map(item => item.identifier).sort())
                    .toEqual(previous.items.filter(item => item.status === "FAILED").map(item => item.identifier).sort());
                retrySnapshotId = current.snapshotId;
                const orderBefore = await cards.evaluateAll(elements => elements.map(el => el.getAttribute("data-identifier")));
                for (const item of previous.items.filter(value => value.status === "FAILED")) {
                    const button = page.locator(`[data-testid="novel-catalog-card"][data-identifier="${item.identifier}"]`)
                        .getByRole("button", { name: "이 작품 다시 번역", exact: true });
                    const sent = page.waitForResponse(response => response.request().method() === "POST"
                        && response.url() === `${base}/${current.snapshotId}/items/${item.identifier}/retry`);
                    await button.click(); expect((await sent).ok()).toBe(true);
                    await Promise.allSettled(reads);
                    focusedRetry = item.identifier;
                }
                expect(retryIds.size).toBe(7);
                expect(await cards.evaluateAll(elements => elements.map(el => el.getAttribute("data-identifier")))).toEqual(orderBefore);
                scroll = await page.evaluate(() => window.scrollY);
            }
            const deadline = Date.now() + 540_000;
            while (await cards.count() !== 50 || snapshots.at(-1)?.snapshot.ready !== 50) {
                const terminal = snapshots.at(-1)?.snapshot.state;
                if (terminal && terminal !== "RUNNING" && terminal !== "SUCCEEDED") throw new Error(`CATALOG_TERMINAL_${terminal}`);
                if (Date.now() >= deadline) throw new Error("CATALOG_ALL_CARDS_DEADLINE");
                await page.waitForTimeout(250);
            }
            await expect(page.getByTestId("novel-catalog-state")).toHaveAttribute("data-ready", "50");
            if (focusedRetry) await expect(page.locator(`[data-testid="novel-catalog-card"][data-identifier="${focusedRetry}"]`).getByRole("button")).toBeFocused();
            else await expect(page.locator(`[data-testid="novel-catalog-card"][data-identifier="${focusedIdentifier}"]`).getByRole("link")).toBeFocused();
            expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
            await Promise.allSettled(reads);
            const final = snapshots.at(-1)?.snapshot;
            expect(final?.state).toBe("SUCCEEDED"); expect(final?.ready).toBe(50); expect(final?.failed).toBe(0);
            if (expectCache) expect(final?.items.every(item => item.cached && item.status === "READY")).toBe(true);
            const painted = await page.evaluate(() => (window as unknown as { __catalogPaints: typeof arrivals }).__catalogPaints);
            arrivals.push(...painted);
            arrivalCapturePhase = phase;
            for (let index = 1; index < arrivals.length; index++) expect(arrivals[index].identifiers.slice(0, arrivals[index - 1].identifiers.length)).toEqual(arrivals[index - 1].identifiers);
            expect(await cards.evaluateAll(elements => elements.map(el => [el.getAttribute("data-identifier"), Number(el.getAttribute("data-rank"))]))).toEqual(final!.items.map(item => [item.identifier, item.rank]));
            await page.getByLabel("표시 순서").selectOption("source");
            expect(await cards.evaluateAll(elements => elements.map(el => Number(el.getAttribute("data-rank"))))).toEqual(Array.from({ length: 50 }, (_, index) => index + 1));
            expect(starts).toBe(1); expect(audio).toBe(0);

            // 새 목록 조회 자체는 정상 endpoint를 사용한다. cache 여부/새 provider0은 실제 장부와 후속 join한다.
            phase = "WARM";
            await page.goto(`${releaseAppUrl}/ko`);
            await page.goto(url);
            await expect(cards).toHaveCount(50, { timeout: 90_000 });
            await expect(page.getByTestId("novel-catalog-state")).toHaveAttribute("data-ready", "50");
            await Promise.allSettled(reads);
            expect(snapshots.at(-1)?.snapshot.items.every(item => item.cached && item.status === "READY")).toBe(true);
            expect(starts).toBe(2); expect(audio).toBe(0);

            phase = "SAME_WORK_SEARCH";
            await page.goto(`${releaseAppUrl}/ko/novel/syosyetu/search/novels?keyword=${encodeURIComponent(searchKeyword)}&page=1`);
            await expect(cards).toHaveCount(1, { timeout: 90_000 });
            await expect(cards).toHaveAttribute("data-identifier", "n0676mv");
            await expect(cards).toHaveAttribute("data-cached", "true");
            await Promise.allSettled(reads);
            expect(snapshots.at(-1)?.snapshot.selector.kind).toBe("SEARCH");
            expect(snapshots.at(-1)?.snapshot.selector.keyword).toBe(searchKeyword);
            expect(snapshots.at(-1)?.snapshot.items[0].status).toBe("READY");
            expect(starts).toBe(3); expect(audio).toBe(0);
        } catch (error) { failure = error instanceof Error ? error.message.slice(0, 1800) : "UNKNOWN_FAILURE"; throw error; }
        finally {
            await Promise.allSettled(reads);
            // 최초 준비 실패도 현재 페이지의 실제 관측 기록을 남긴다. 이전 실행의 유실 기록을 재구성하지 않는다.
            if (!arrivals.length && !page.isClosed() && (phase === "COLD" || phase === "FAILED_ITEMS_RETRY" || phase === "CACHE_VALIDATION")) {
                const observed = await page.evaluate(() => (window as unknown as { __catalogPaints?: typeof arrivals }).__catalogPaints ?? []).catch(() => []);
                arrivals.push(...observed); arrivalCapturePhase = `${phase}_FINALLY`;
            }
            fs.writeFileSync(file, JSON.stringify({ version: 3, phase, failure, starts, audio, arrivals, arrivalCapturePhase, snapshots, retryEvents, partialFile: partialFile ?? null, partialSha256, retrySnapshotId, finishedAt: new Date().toISOString(),
                limitations: "600ms status polling plus render; actual completion order is observed, not forced to fixture order. Provider cache proof requires root ledger join. Real BE auth with synthetic NextAuth packaging; Google excluded." }, null, 2), { flag: "wx" });
        }
    });
});
