import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";
import { openNovelReleaseSession, releaseAppUrl, releaseApiUrl } from "../support/novel-release-live";
import { installNativeMediaObserver, nativeMediaObservation, nativeClickToPlaying, setNativeMediaPhase } from "../support/novel-recovery-media-observer";
import { safeSpeechAttempts, verifyPaidAudioKeys, verifyAudioRequestPositions, verifyNativeEnded } from "../support/novel-recovery-audio-proof";
import type { ReaderSnapshot } from "../../src/types/novel/reader";

test.use({ trace: "off", video: "off" });

test("NOVEL-FINAL-AUDIO-SINGLE final images JA KO selected cold and cache only", async ({ page, context, request }) => {
    test.skip(process.env.NOVEL_FINAL_AUDIO_SINGLE_E2E !== "1", "Root-controlled final two-key speech window required");
    test.setTimeout(150_000);
    const root = process.env.NOVEL_LIVE_ARTIFACT_DIR ?? "";
    if (!path.isAbsolute(root)) throw new Error("LOCAL_AUDIO_EVIDENCE_REQUIRED");
    const file = path.join(root, "final-single-audio.json");
    if (fs.existsSync(file)) throw new Error("PRESERVE_PAID_EVIDENCE_NO_RERUN");
    const priorFile = process.env.NOVEL_FINAL_AUDIO_BINDING ?? "";
    const priorBytes = fs.readFileSync(priorFile);
    const prior = JSON.parse(priorBytes.toString("utf8"));
    const scenario = prior.case;
    if (scenario.actorId !== 900102 || String(scenario.episode) !== "1" || scenario.novel !== "n2604qg"
        || scenario.targetId !== "752b6321ede2e9eb-p1-s12" || !["syosetu", "syosyetu"].includes(scenario.platform)
        || !prior.audioFunctionalComplete) throw new Error("COMPLETED_AUDIO_BINDING_REQUIRED");
    const original = prior.after as ReaderSnapshot;
    const frozenTarget = original.segments.find(item => item.id === scenario.targetId)!;
    const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
    const rawLedger = () => JSON.parse(fs.readFileSync(process.env.NOVEL_LIVE_LEDGER_FILE ?? "", "utf8")) as { calls: { attempt: number; task: string }[] };
    const ledger = () => safeSpeechAttempts(rawLedger());
    const allBefore = rawLedger().calls;
    const previousCalls = ledger();
    const addedCalls = () => ledger().filter(call => !previousCalls.some(previous => previous.attempt === call.attempt));
    const calls: { segmentId: string; language: string; partIndex: number; traceId: string | null }[] = [];
    const measurements: Record<string, unknown> = {};
    let snapshot: ReaderSnapshot | null = null, failure: string | null = null, proofs: unknown = null;
    const base = `${releaseApiUrl}/${scenario.platform}/${scenario.novel}/episodes/${scenario.episode}`;
    try {
        expect(allBefore).toHaveLength(2259);
        // 준비: 이전에 완료한 동일 actor·회차·문장·번역만 허용한다. 복구/번역 POST는 전부 차단한다.
        const headers = await openNovelReleaseSession(context, request, scenario.actorId);
        const response = await request.get(`${base}/reader`, { headers });
        expect(response.ok()).toBe(true);
        snapshot = (await response.json()).body as ReaderSnapshot;
        expect(snapshot.revision).toBe(original.revision);
        expect(snapshot.segments.map(item => [item.id, item.plainJa, item.ko, item.status]))
            .toEqual(original.segments.map(item => [item.id, item.plainJa, item.ko, item.status]));
        expect(frozenTarget.status).toBe("SUCCEEDED");
        for (const text of [frozenTarget.plainJa, frozenTarget.ko!]) expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(1200);
        await installNativeMediaObserver(page);
        await page.route(`${releaseApiUrl}/**`, async route => {
            const req = route.request();
            if (req.method() === "POST") {
                const body = req.postDataJSON();
                if (req.url() !== `${base}/audio` || body.segmentId !== scenario.targetId || body.revision !== snapshot?.revision
                    || !["ja", "ko"].includes(body.language) || body.partIndex !== 0 || calls.length >= 4) {
                    await route.abort(); throw new Error("FINAL_TWO_KEY_AUDIO_SCOPE_EXCEEDED");
                }
                calls.push({ segmentId: body.segmentId, language: body.language, partIndex: body.partIndex, traceId: req.headers()["x-novel-trace-id"] ?? null });
            }
            await route.continue();
        });
        await page.goto(`${releaseAppUrl}/ko/novel/${scenario.platform}/novels/${scenario.novel}/episode/${scenario.episode}`);
        const target = page.locator(`[data-testid="novel-sentence"][data-segment-id="${scenario.targetId}"]`);
        await expect(target).toHaveAttribute("data-status", "SUCCEEDED");
        await target.getByRole("button", { name: /문장 메뉴/ }).click();
        await page.keyboard.press("Escape");
        await target.locator("p").first().selectText();
        await page.waitForTimeout(250);
        expect(calls).toHaveLength(0); expect(addedCalls()).toHaveLength(0);

        // 실행: 각 언어의 single만 끝까지 재생하고 동일 single을 캐시로 다시 재생한다.
        const state = page.getByTestId("novel-playback-state");
        for (const language of ["ja", "ko"] as const) {
            const read = async (phase: string) => {
                await setNativeMediaPhase(page, phase);
                await page.getByLabel("낭독 언어").selectOption(language);
                await target.getByRole("button", { name: /문장 메뉴/ }).click();
                await target.getByRole("button", { name: `${language === "ja" ? "일본어 원문" : "한국어 번역"}: 이 문장 읽기`, exact: true }).click();
            };
            const before = await nativeMediaObservation(page);
            await read(`cold-${language}`);
            await expect(state).toHaveAttribute("data-state", "playing", { timeout: 45_000 });
            measurements[`cold-${language}`] = nativeClickToPlaying(before, await nativeMediaObservation(page));
            await expect(state).toHaveAttribute("data-state", "ended", { timeout: 45_000 });
            verifyNativeEnded((await nativeMediaObservation(page))!, `cold-${language}`, [scenario.targetId]);
            const paidCount = addedCalls().length;
            expect(addedCalls().filter(call => call.language === language)).toHaveLength(1);
            const cacheBefore = await nativeMediaObservation(page);
            await read(`cache-${language}`);
            await expect(state).toHaveAttribute("data-state", "playing");
            measurements[`cache-${language}`] = nativeClickToPlaying(cacheBefore, await nativeMediaObservation(page));
            await page.getByRole("button", { name: "정지", exact: true }).click();
            expect(addedCalls()).toHaveLength(paidCount);
        }

        // 검증: 실제 provider 텍스트 hash·trace·언어를 키마다 정확히1회로 연결한다.
        expect(addedCalls()).toHaveLength(2);
        const allAfter = rawLedger().calls;
        expect(allAfter).toHaveLength(2261);
        expect(allAfter.filter(call => !allBefore.some(previous => previous.attempt === call.attempt)).map(call => call.task))
            .toEqual(["OPENAI_TTS", "OPENAI_TTS"]);
        const observation = (await nativeMediaObservation(page))!;
        proofs = { keys: verifyPaidAudioKeys(["ja", "ko"].map(language => ({ segmentId: scenario.targetId, language,
            partIndex: 0, textSha256: hash(language === "ja" ? frozenTarget.plainJa : frozenTarget.ko!) })),
            calls, addedCalls(), [...new Set(calls.map(call => call.traceId!))], [scenario.targetId]),
            positions: verifyAudioRequestPositions(observation.audioRequests, snapshot.segments.map(item => item.id)) };
    } catch (error) { failure = error instanceof Error ? error.message.slice(0, 1500) : "UNKNOWN_FAILURE"; throw error; }
    finally {
        fs.writeFileSync(file, JSON.stringify({ version: 1, failure, actorId: scenario.actorId, targetId: scenario.targetId,
            priorEvidenceSha256: hash(priorBytes), revision: snapshot?.revision, measurements, calls, proofs,
            providerCalls: addedCalls(), ledgerBefore: allBefore.length, ledgerAfter: rawLedger().calls.length,
            observation: await nativeMediaObservation(page).catch(() => null),
            media: "Native HTMLAudioElement with trusted playing/ended; LISTENING_NOT_VERIFIED",
            scope: "Same completed target only; JA/KO one cold key each, cached replay; no repair, translation or continuous lookahead", finishedAt: new Date().toISOString() }, null, 2), { flag: "wx" });
    }
});
