import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";
import { openNovelReleaseSession, releaseAppUrl, releaseApiUrl } from "../support/novel-release-live";
import { installNativeMediaObserver, nativeMediaObservation, nativePlaybackPosition, nativeClickToPlaying, setNativeMediaPhase } from "../support/novel-recovery-media-observer";
import { safeSpeechAttempts, verifyPaidAudioKeys, verifyAudioRequestPositions, verifyNativeEnded } from "../support/novel-recovery-audio-proof";
import type { ReaderSnapshot, RepairTimings } from "../../src/types/novel/reader";

const enabled = process.env.NOVEL_RECOVERY_AUDIO_LIVE_E2E === "1";
const root = process.env.NOVEL_LIVE_ARTIFACT_DIR ?? "";
const digest = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const ledger = () => safeSpeechAttempts(JSON.parse(fs.readFileSync(process.env.NOVEL_LIVE_LEDGER_FILE ?? "", "utf8")));

test.use({ trace: "off", video: "off" });
test.describe("reserved recovery fixture with actual body-only Japanese and Korean speech", () => {
    test.skip(!enabled, "Root-controlled mixed repair/TTS stage and six-call reservation required");
    test.describe.configure({ timeout: 300_000, retries: 0 });

    test("NOVEL-RECOVERY-AUDIO real gap, one repair, native playback and intent cancellation", async ({ page, context, request }) => {
        const manifest = JSON.parse(fs.readFileSync(process.env.NOVEL_RECOVERY_CASES_FILE ?? "", "utf8"));
        const scenario = manifest.cases.find((item: { caseId: string }) => item.caseId === "recovery-dialogue_continuation-r2");
        if (!scenario || scenario.actorId !== 900102 || !path.isAbsolute(root)) throw new Error("RESERVED_AUDIO_RECOVERY_CASE_REQUIRED");
        fs.mkdirSync(root, { recursive: true });
        const file = path.join(root, `${scenario.caseId}.json`);
        if (fs.existsSync(file)) throw new Error("EXISTING_EVIDENCE_NO_PAID_RERUN");
        const receipts = JSON.parse(fs.readFileSync(process.env.NOVEL_RECOVERY_SEED_RECEIPT ?? "", "utf8"));
        const receipt = receipts.cases.find((item: { caseId: string }) => item.caseId === scenario.caseId);
        if (!receipt) throw new Error("SEED_RECEIPT_REQUIRED");
        const beforeLedger = ledger();
        const calls: { segmentId: string; language: string; partIndex: number; traceId: string | null }[] = [];
        const observations = new Map<string, NonNullable<Awaited<ReturnType<typeof nativeMediaObservation>>>>();
        const cancellations: unknown[] = [];
        const measurements: Record<string, unknown> = {};
        let before: ReaderSnapshot | null = null;
        let after: ReaderSnapshot | null = null;
        let failure: string | null = null;
        let repairPosts = 0;
        let proofs: unknown = null;
        let repairClick: { eventTimeStamp: number; trusted: boolean } | null = null;
        let functionalComplete = false;
        const base = `${releaseApiUrl}/${scenario.platform}/${scenario.novel}/episodes/${scenario.episode}`;
        const readerUrl = `${releaseAppUrl}/ko/novel/${scenario.platform}/novels/${scenario.novel}/episode/${scenario.episode}`;
        const collect = async () => {
            const value = await nativeMediaObservation(page);
            if (value) observations.set(value.documentId, value);
            return value;
        };
        try {
            const headers = await openNovelReleaseSession(context, request, scenario.actorId);
            const response = await request.get(`${base}/reader`, { headers });
            expect(response.ok()).toBe(true);
            before = (await response.json()).body as ReaderSnapshot;
            expect(before.jobId).toBe(receipt.jobId); expect(before.revision).toBe(receipt.revision);
            expect(createHash("sha256").update(fs.readFileSync(scenario.snapshotFile)).digest("hex")).toBe(scenario.snapshotSha256.toLowerCase());
            const original = JSON.parse(fs.readFileSync(scenario.snapshotFile, "utf8")).final as ReaderSnapshot;
            expect(before.segments.map(item => [item.id, item.plainJa])).toEqual(original.segments.map(item => [item.id, item.plainJa]));
            expect(Object.keys(receipt.expectedNormalHashes).sort()).toEqual(before.segments.filter(item => item.id !== scenario.targetId && item.status === "SUCCEEDED").map(item => item.id).sort());
            for (const [id, hash] of Object.entries(receipt.expectedNormalHashes as Record<string, string>)) expect(digest(before.segments.find(item => item.id === id)?.ko ?? "")).toBe(hash);
            expect(before.segments[scenario.order].id).toBe(scenario.targetId);
            expect(before.segments.filter(item => item.status === "FAILED").map(item => item.id)).toEqual([scenario.targetId]);
            const selected = before.segments.slice(scenario.order, scenario.order + 3);
            expect(selected).toHaveLength(3);
            for (const item of selected) {
                expect(Buffer.byteLength(item.plainJa, "utf8")).toBeLessThanOrEqual(1200);
                if (item.ko) expect(Buffer.byteLength(item.ko, "utf8")).toBeLessThanOrEqual(1200);
            }
            const ids = selected.map(item => item.id);
            const target = page.locator(`[data-testid="novel-sentence"][data-segment-id="${ids[0]}"]`);
            const state = page.getByTestId("novel-playback-state");
            const priorCount = () => ledger().filter(call => !beforeLedger.some(previous => previous.attempt === call.attempt));
            await installNativeMediaObserver(page);
            await page.route(`${base}/**`, async route => {
                const req = route.request();
                if (req.method() === "POST") {
                    const body = req.postDataJSON();
                    if (req.url() === `${base}/audio`) {
                        if (!ids.includes(body.segmentId) || !["ja", "ko"].includes(body.language) || body.partIndex !== 0 || body.revision !== before?.revision) {
                            await route.abort(); throw new Error("AUDIO_SCOPE_EXCEEDED");
                        }
                        calls.push({ segmentId: body.segmentId, language: body.language, partIndex: body.partIndex, traceId: req.headers()["x-novel-trace-id"] ?? null });
                    } else if (req.url() === `${base}/translations/${receipt.jobId}/repair` && ++repairPosts === 1 && body.segmentId === ids[0] && body.revision === receipt.revision) {
                        // 사전 예약된20번째 복구 표본이다. 음성이 번역 명령을 자동 생성하지 않는다.
                    } else { await route.abort(); throw new Error("UNAPPROVED_PAID_COMMAND"); }
                }
                await route.continue();
            });
            const read = async (mode: "single" | "from", language: "ja" | "ko", phase: string) => {
                await setNativeMediaPhase(page, phase);
                await page.getByLabel("낭독 언어").selectOption(language);
                await target.getByRole("button", { name: /문장 메뉴/ }).click();
                const button = target.getByRole("button", { name: mode === "from" ? "여기부터 읽기" : `${language === "ja" ? "일본어 원문" : "한국어 번역"}: 이 문장 읽기`, exact: true });
                await button.click();
            };
            await page.goto(readerUrl);
            await expect(target).toHaveAttribute("data-status", "FAILED");
            await target.getByRole("button", { name: /문장 메뉴/ }).click();
            await page.keyboard.press("Escape");
            await target.locator("p").first().selectText();
            await page.mouse.wheel(0, 120);
            expect(calls).toHaveLength(0); expect(priorCount()).toHaveLength(0);
            await read("from", "ko", "gap-repair");
            await expect(state).toHaveAttribute("data-state", "waiting");
            expect(calls).toHaveLength(0); expect(repairPosts).toBe(0);

            // 명시 복구 하나가 commit된 후에만 살아 있는 KO 이어읽기 의사가 gap 위치에서 재개한다.
            await page.evaluate(id => {
                document.addEventListener("click", event => {
                    const element = event.target instanceof Element ? event.target.closest("button") : null;
                    if (!element?.closest(`[data-segment-id="${id}"]`) || !element.textContent?.includes("이 문장 다시 번역")) return;
                    Object.assign(window, { __novelRepairClick: { eventTimeStamp: event.timeStamp, trusted: event.isTrusted } });
                }, true);
            }, ids[0]);
            await target.getByRole("button", { name: "이 문장 다시 번역", exact: true }).click();
            await expect(page.getByTestId("novel-repair-state")).toHaveAttribute("data-state", "SUCCEEDED", { timeout: 140_000 });
            measurements.repair = JSON.parse((await page.getByTestId("novel-repair-state").getAttribute("data-repair-metrics"))!);
            repairClick = await page.evaluate(() => (window as unknown as { __novelRepairClick: { eventTimeStamp: number; trusted: boolean } }).__novelRepairClick);
            expect((measurements.repair as RepairTimings).startedAt).toBe(repairClick.eventTimeStamp);
            expect(repairClick.trusted).toBe(true);
            expect((measurements.repair as RepairTimings).repairReadyMs).toBeGreaterThanOrEqual((measurements.repair as RepairTimings).committedObservedMs!);
            await expect(state).toHaveAttribute("data-state", "playing");
            measurements.gapReadClickToPlaying = nativeClickToPlaying(null, await collect());
            measurements.gapReadIncludesTranslationAndWait = true;
            const cold = await nativePlaybackPosition(page);
            expect(cold?.duration).toBeGreaterThan(3.5);
            expect(calls.map(item => item.segmentId)).toEqual([ids[0]]);
            await page.getByRole("button", { name: "정지", exact: true }).click();

            const final = await request.get(`${base}/translations/${receipt.jobId}`, { headers });
            expect(final.ok()).toBe(true); after = (await final.json()).body as ReaderSnapshot;
            expect(after.recovery?.committedIds).toContain(ids[0]);
            for (const [id, hash] of Object.entries(receipt.expectedNormalHashes as Record<string, string>)) expect(digest(after.segments.find(item => item.id === id)?.ko ?? "")).toBe(hash);
            expect(Buffer.byteLength(after.segments.find(item => item.id === ids[0])?.ko ?? "", "utf8")).toBeLessThanOrEqual(1200);

            // 미생성 다음 문장이 아직 남은 재생 위치에서 각 중단 의사를 검증한다. cache 때문에 자명한0이 아니다.
            for (const action of ["pause", "stop", "navigate", "language", "logout"] as const) {
                await read("from", "ko", `cancel-${action}`);
                await expect(state).toHaveAttribute("data-state", "playing");
                const position = await nativePlaybackPosition(page);
                if (!position || position.duration - position.currentTime <= 3.5) throw new Error("UNCACHED_LOOKAHEAD_WINDOW_REQUIRED");
                expect(calls.filter(item => item.segmentId !== ids[0])).toHaveLength(0);
                const atRequests = calls.length, atProvider = priorCount().length;
                await collect();
                if (action === "pause" || action === "stop") await page.getByRole("button", { name: action === "pause" ? "일시정지" : "정지", exact: true }).click();
                else if (action === "navigate") await page.getByRole("link", { name: "TranslaCat", exact: true }).click();
                else if (action === "language") await page.getByLabel("낭독 언어").selectOption("ja");
                else {
                    await page.getByTestId("user-menu-toggle").click();
                    await page.getByRole("menuitem", { name: "로그아웃", exact: true }).click();
                    await expect(page).not.toHaveURL(/\/episode\//);
                    expect((await context.cookies()).filter(cookie => cookie.name.includes("next-auth.session-token"))).toHaveLength(0);
                }
                await page.waitForTimeout(Math.ceil((position.duration - position.currentTime) / position.playbackRate * 1000) + 750);
                expect(calls.length).toBe(atRequests); expect(priorCount().length).toBe(atProvider);
                cancellations.push({ action, position, uncreatedNextId: ids[1], newAudioRequests: 0, newProviderAttempts: 0 });
                if (action === "pause") await page.getByRole("button", { name: "정지", exact: true }).click();
                if (action === "navigate" || action === "logout") {
                    if (action === "logout") await openNovelReleaseSession(context, request, scenario.actorId);
                    await page.goto(readerUrl);
                    await expect(target).toHaveAttribute("data-status", "SUCCEEDED");
                }
            }

            for (const language of ["ja", "ko"] as const) {
                const start = await collect();
                const requestsBefore = calls.length;
                await read("single", language, `single-${language}`);
                await expect(state).toHaveAttribute("data-state", "playing");
                measurements[`single-${language}`] = nativeClickToPlaying(start, await collect());
                await expect(state).toHaveAttribute("data-state", "ended", { timeout: 45_000 });
                expect(calls.slice(requestsBefore).every(item => item.segmentId === ids[0])).toBe(true);
                verifyNativeEnded((await collect())!, `single-${language}`, [ids[0]]);
                const count = priorCount().length;
                const cachedBefore = await collect();
                await read("single", language, `cached-${language}`);
                await expect(state).toHaveAttribute("data-state", "playing");
                measurements[`cached-${language}`] = nativeClickToPlaying(cachedBefore, await collect());
                await page.getByRole("button", { name: "정지", exact: true }).click();
                expect(priorCount().length).toBe(count);

                await read("from", language, `continuous-${language}`);
                await expect(page.locator(`[data-segment-id="${ids[1]}"]`)).toHaveAttribute("data-active", "true", { timeout: 45_000 });
                await page.getByRole("button", { name: "정지", exact: true }).click();
                verifyNativeEnded((await collect())!, `continuous-${language}`, [ids[0]]);
            }
            const newCalls = priorCount();
            expect(newCalls.length).toBeLessThanOrEqual(6);
            const entries = selected.flatMap(item => ["ja", "ko"].map(language => ({ segmentId: item.id, language, partIndex: 0,
                textSha256: digest(language === "ja" ? item.plainJa : after!.segments.find(value => value.id === item.id)!.ko!) })));
            proofs = {
                keys: verifyPaidAudioKeys(entries, calls, newCalls, [...new Set(calls.map(call => call.traceId!).filter(Boolean))], [ids[0], ids[1]]),
                positions: [...observations.values()].flatMap(value => verifyAudioRequestPositions(value.audioRequests, before!.segments.map(item => item.id))),
            };
            expect(repairPosts).toBe(1);
            functionalComplete = true;
            // 지연 실패와 음성 기능 완료를 분리한다. 지연 때문에 이미 승인된 음성 검증을 생략하지 않는다.
            expect((measurements.repair as RepairTimings).repairReadyMs).toBeLessThanOrEqual(5000);
        } catch (error) {
            failure = error instanceof Error ? error.message.slice(0, 1800) : "UNKNOWN_FAILURE";
            throw error;
        } finally {
            await collect().catch(() => null);
            if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ version: 1, case: scenario, outcome: failure ? functionalComplete ? "LATENCY_NOT_MET" : "FUNCTIONAL_FAILURE" : "PASS", failure, audioFunctionalComplete: functionalComplete,
                auth: "Real BE login/ADMIN; synthetic local NextAuth packaging; actual NextAuth logout; Google OAuth excluded", media: "Native HTMLAudioElement; no audio mock; LISTENING_NOT_VERIFIED",
                nativeClick: repairClick, metrics: measurements.repair, measurements, repairPosts, before, after, calls, cancellations, proofs, observations: [...observations.values()],
                providerCalls: ledger().filter(call => !beforeLedger.some(previous => previous.attempt === call.attempt)), finishedAt: new Date().toISOString() }, null, 2));
        }
    });
});
