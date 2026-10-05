import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";
import type { ReaderSnapshot, RepairTimings } from "../../src/types/novel/reader";
import { openNovelReleaseSession } from "../support/novel-release-live";

// 실제 유료 실행 승인은 외부 고정 manifest/장부가 소유한다. 기본 테스트에서는 실행하지 않는다.
const enabled = process.env.NOVEL_RECOVERY_LIVE_E2E === "1";
const artifactRoot = process.env.NOVEL_LIVE_ARTIFACT_DIR ?? "";
const manifestFile = process.env.NOVEL_RECOVERY_CASES_FILE ?? "";
const receiptsFile = process.env.NOVEL_RECOVERY_SEED_RECEIPT ?? "";
const appUrl = process.env.E2E_BASE_URL ?? "http://localhost:19890";
const apiUrl = process.env.NOVEL_LIVE_API_URL ?? "http://127.0.0.1:19892/api/v1";
const sha = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
interface RepairCase {
    caseId: string; sourceId: string; snapshotFile: string; snapshotSha256: string; actorId: number; platform: string; novel: string; episode: string;
    targetId: string; order: number; category: string; repeat: number; sourceCharacters: number; expectedNormalHashes?: Record<string, string>;
}
interface SeedReceipt { caseId: string; actorId: number; jobId: string; revision: string; expectedNormalHashes: Record<string, string> }
const manifest = enabled ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : { cases: [] };
const cases: RepairCase[] = manifest.cases;
const reservedTtsCase = process.env.NOVEL_RECOVERY_TTS_CASE_ID ?? "recovery-dialogue_continuation-r2";
if (enabled) {
    if (!process.env.NEXTAUTH_SECRET || !path.isAbsolute(artifactRoot) || !Array.isArray(cases) || !cases.length || cases.length > 24) throw new Error("EXPLICIT_RECOVERY_FIXTURES_REQUIRED");
    if (!["http://localhost:19890", "http://127.0.0.1:19890"].includes(appUrl) || apiUrl !== "http://127.0.0.1:19892/api/v1") throw new Error("LOCAL_RECOVERY_STACK_REQUIRED");
    fs.mkdirSync(artifactRoot, { recursive: true });
    const ids = new Set();
    for (const value of cases) {
        if (!/^[\w-]{1,120}$/.test(value.caseId) || ids.has(value.caseId) || ![value.platform, value.novel, String(value.episode), value.targetId].every(id => /^[\w-]{1,160}$/.test(id))) throw new Error("INVALID_RECOVERY_CASE");
        if (!Number.isSafeInteger(value.actorId) || value.actorId < 900101 || value.actorId > 900120) throw new Error("LOCAL_RECOVERY_ACTOR_REQUIRED");
        ids.add(value.caseId);
    }
}

// 인증 cookie/Authorization이 Playwright trace에 저장되지 않게 한다. worker 옵션은 파일 최상위에 둔다.
test.use({ trace: "off", video: "off" });
test.describe("actual selective recovery through local production FE and MySQL BE", () => {
    test.skip(!enabled, "Explicit root-controlled recovery ledger window required");
    test.describe.configure({ mode: "default", timeout: 180_000, retries: 0 });

    // 동일 실패 fixture를 다시 만들지 않는다. 이 한 표본은 실제 TTS와 합친 명시 복구에서 측정한다.
    for (const scenario of cases.filter(value => value.caseId !== reservedTtsCase)) {
        test(`NOVEL-RECOVERY-LIVE ${scenario.caseId}`, async ({ page, context, request }) => {
            const evidenceFile = path.join(artifactRoot, `${scenario.caseId}.json`);
            const guardFile = path.join(artifactRoot, "functional-failure.guard.json");
            let before: ReaderSnapshot | null = null;
            let latest: ReaderSnapshot | null = null;
            let metrics: RepairTimings | null = null;
            let nativeClick: unknown = null;
            let functionalComplete = false;
            let failure: string | null = null;
            let posts = 0;
            const requests: { method: string; suffix: string; traceId: string | null; status?: number }[] = [];
            const responseReads: Promise<void>[] = [];
            const base = `${apiUrl}/${scenario.platform}/${scenario.novel}/episodes/${scenario.episode}`;
            try {
                if (fs.existsSync(evidenceFile)) throw new Error("EVIDENCE_ALREADY_EXISTS_NO_RERUN");
                if (fs.existsSync(guardFile)) throw new Error("NOT_RUN_FUNCTIONAL_GUARD");
                const receipts = JSON.parse(fs.readFileSync(receiptsFile, "utf8"));
                const receipt = (Array.isArray(receipts) ? receipts : receipts.cases).find((item: SeedReceipt) => item.caseId === scenario.caseId) as SeedReceipt | undefined;
                if (!receipt || receipt.actorId !== scenario.actorId) throw new Error("SEED_AND_ACCOUNT_BINDING_REQUIRED");
                const headers = await openNovelReleaseSession(context, request, scenario.actorId);
                const sourceResponse = await request.get(`${base}/reader`, { headers });
                expect(sourceResponse.ok()).toBe(true);
                before = (await sourceResponse.json()).body as ReaderSnapshot;
                expect(before.revision).toBe(receipt.revision); expect(before.jobId).toBe(receipt.jobId);
                expect(createHash("sha256").update(fs.readFileSync(scenario.snapshotFile)).digest("hex")).toBe(scenario.snapshotSha256.toLowerCase());
                const original = JSON.parse(fs.readFileSync(scenario.snapshotFile, "utf8")).final as ReaderSnapshot;
                expect(before.segments.map(item => [item.id, item.plainJa])).toEqual(original.segments.map(item => [item.id, item.plainJa]));
                expect(before.segments.filter(item => item.status === "FAILED").map(item => item.id)).toEqual([scenario.targetId]);
                expect(before.segments[scenario.order].id).toBe(scenario.targetId);
                const normalHashes = scenario.expectedNormalHashes ?? receipt.expectedNormalHashes;
                expect(Object.keys(normalHashes).sort()).toEqual(before.segments.filter(item => item.id !== scenario.targetId && item.status === "SUCCEEDED").map(item => item.id).sort());
                for (const [id, hash] of Object.entries(normalHashes)) {
                    expect(sha(before.segments.find(item => item.id === id)?.ko ?? "")).toBe(hash);
                    expect(receipt.expectedNormalHashes[id]).toBe(hash);
                }

                // 원래 API 응답은 변경하지 않는다. 잘못된 paid 범위나 두 번째 POST만 전송 전에 차단한다.
                await page.route(`${base}/**`, async route => {
                    const req = route.request();
                    const suffix = req.url().slice(base.length);
                    if (req.method() === "POST") {
                        if (suffix !== `/translations/${receipt.jobId}/repair` || ++posts > 1
                            || req.postDataJSON().segmentId !== scenario.targetId || req.postDataJSON().revision !== receipt.revision) {
                            await route.abort(); throw new Error("UNAPPROVED_RECOVERY_POST");
                        }
                    }
                    requests.push({ method: req.method(), suffix, traceId: req.headers()["x-novel-trace-id"] ?? null });
                    await route.continue();
                });
                page.on("response", response => {
                    if (!response.url().startsWith(base) || !response.ok()) return;
                    responseReads.push(response.json().then(envelope => {
                        if (envelope.body?.segments && (!latest || envelope.body.eventSequence >= latest.eventSequence)) latest = envelope.body;
                    }).catch(() => {}));
                });
                await page.goto(`${appUrl}/ko/novel/${scenario.platform}/novels/${scenario.novel}/episode/${scenario.episode}`);
                const target = page.locator(`[data-testid="novel-sentence"][data-segment-id="${scenario.targetId}"]`);
                await expect(target).toHaveAttribute("data-status", "FAILED");
                await page.evaluate(id => {
                    document.addEventListener("click", event => {
                        const element = event.target instanceof Element ? event.target.closest("button") : null;
                        if (!element?.closest(`[data-segment-id="${id}"]`) || !element.textContent?.includes("이 문장 다시 번역")) return;
                        Object.assign(window, { __novelRepairClick: { eventTimeStamp: event.timeStamp, documentTime: performance.now(), trusted: event.isTrusted } });
                    }, true);
                }, scenario.targetId);
                await target.getByRole("button", { name: "이 문장 다시 번역", exact: true }).click();
                await expect(target).toHaveAttribute("data-status", "SUCCEEDED", { timeout: 140_000 });
                const measurement = page.getByTestId("novel-repair-state");
                await expect(measurement).toContainText("복구 저장 완료");
                metrics = JSON.parse((await measurement.getAttribute("data-repair-metrics"))!) as RepairTimings;
                nativeClick = await page.evaluate(() => (window as unknown as { __novelRepairClick: unknown }).__novelRepairClick);
                expect(metrics.repairReadyMs).toBeGreaterThanOrEqual(metrics.committedObservedMs!);
                expect(metrics.startedAt).toBe((nativeClick as { eventTimeStamp: number }).eventTimeStamp);
                expect((nativeClick as { trusted: boolean }).trusted).toBe(true);
                expect(posts).toBe(1);

                // 저장 재조회는 유료 생성이 아니다. 정상 문장 전체와 target commit을 같은 실제 job에서 대조한다.
                const finalResponse = await request.get(`${base}/translations/${receipt.jobId}`, { headers: { ...headers, "X-Novel-Trace-Id": metrics.traceId } });
                expect(finalResponse.ok()).toBe(true);
                latest = (await finalResponse.json()).body as ReaderSnapshot;
                expect(latest.recovery?.committedIds).toContain(scenario.targetId);
                expect(latest.recovery?.traceId).toBe(metrics.runTraceId ?? metrics.traceId);
                for (const [id, hash] of Object.entries(normalHashes)) expect(sha(latest.segments.find(item => item.id === id)?.ko ?? "")).toBe(hash);
                expect(latest.segments.find(item => item.id === scenario.targetId)?.ko?.trim()).toBeTruthy();
                functionalComplete = true;
                // 5초 실패도 결과와 비용을 보존하고 다음 사전 등록 표본은 계속한다. 기능 실패만 후속을 차단한다.
                expect(metrics.repairReadyMs).toBeLessThanOrEqual(5000);
            } catch (error) {
                failure = error instanceof Error ? error.message.slice(0, 1800) : "UNKNOWN_FAILURE";
                if (!functionalComplete && !fs.existsSync(guardFile)) fs.writeFileSync(guardFile, JSON.stringify({ caseId: scenario.caseId, reason: "FUNCTIONAL_FAILURE", at: new Date().toISOString() }));
                throw error;
            } finally {
                await Promise.allSettled(responseReads);
                if (!metrics && !page.isClosed()) {
                    const value = await page.getByTestId("novel-repair-state").getAttribute("data-repair-metrics", { timeout: 1000 }).catch(() => null);
                    if (value) metrics = JSON.parse(value);
                }
                if (!fs.existsSync(evidenceFile)) fs.writeFileSync(evidenceFile, JSON.stringify({ version: 1, case: scenario, sourceFileSha256: createHash("sha256").update(fs.readFileSync(scenario.snapshotFile)).digest("hex"),
                    auth: "Real BE /auth/login and MySQL ADMIN; synthetic local NextAuth session packaging; Google OAuth not covered", transport: "Original HTTP through loopback FE/BE/Novel/AI; Playwright request guard overhead included; no response mock",
                    outcome: failure ? functionalComplete ? "LATENCY_NOT_MET" : failure.includes("NOT_RUN_FUNCTIONAL_GUARD") ? "NOT_RUN_FUNCTIONAL_GUARD" : "FUNCTIONAL_FAILURE" : "PASS",
                    nativeClick, metrics, requests, repairPosts: posts, before, after: latest, failure, finishedAt: new Date().toISOString() }, null, 2));
            }
        });
    }
});
