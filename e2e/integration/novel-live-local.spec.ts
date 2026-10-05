import fs from "node:fs";
import path from "node:path";
import type { Locator } from "@playwright/test";
import { test, expect, installMockAuthCookie } from "../fixtures/mock-test";
import { mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { TEST_USERS } from "../support/test-users";

// 이 suite는 예산 ledger를 사용하는 로컬 BE→Novel→AI gateway에만 연결한다.
const enabled = process.env.NOVEL_LIVE_E2E === "1";
const artifacts = process.env.NOVEL_LIVE_ARTIFACT_DIR ?? "";
const gateway = new URL(process.env.NOVEL_LIVE_GATEWAY_URL ?? "http://127.0.0.1:18782");
if (gateway.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(gateway.hostname)
    || !["18782", "19782"].includes(gateway.port) || gateway.username || gateway.password || gateway.pathname !== "/") {
    throw new Error("LOCAL_NOVEL_GATEWAY_REQUIRED");
}

async function paintedMetrics(status: Locator) {
    if (await status.count() === 0) return null;
    return status.evaluate(el => {
        const elapsed = (attribute: string) => {
            const value = el.getAttribute(attribute);
            return value !== null && Number.isFinite(Number(value)) ? Number(value) : null;
        };
        return { state: el.getAttribute("data-state"), firstSourceMs: elapsed("data-first-source-ms"), firstTranslationMs: elapsed("data-first-translation-ms"), allTranslationsMs: elapsed("data-all-translations-ms"), durableCompleteMs: elapsed("data-durable-complete-ms"), readerMetrics: JSON.parse(el.getAttribute("data-reader-metrics") ?? "null"), count: el.textContent };
    });
}

function safeJobSummary(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object") return {};
    const dto = value as Record<string, unknown>;
    const safeCode = (code: unknown) => typeof code === "string" && /^[A-Z0-9_:-]{1,120}$/.test(code) ? code : null;
    // 원문/번역/서버 message는 기록하지 않고 개수, 작업 ID, 상태와 제한된 오류 코드만 남긴다.
    return {
        state: safeCode(dto.state), jobId: typeof dto.jobId === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(dto.jobId) ? dto.jobId : null,
        totalSegments: typeof dto.totalSegments === "number" ? dto.totalSegments : null,
        completedSegments: typeof dto.completedSegments === "number" ? dto.completedSegments : null,
        eventSequence: typeof dto.eventSequence === "number" ? dto.eventSequence : null,
        errorCode: safeCode(dto.errorCode ?? dto.code),
        segmentErrorCodes: Array.isArray(dto.segments) ? [...new Set(dto.segments.map(item => item && typeof item === "object" ? safeCode(item.errorCode) : null).filter(Boolean))] : [],
    };
}
test.use({ trace: "off", video: "off", screenshot: "off" });
test.describe("Novel real OpenAI local gateway", () => {
    test.skip(!enabled, "Opt-in local live verification requires the shared budget ledger gateway");
    // 각 회차는 독립된 표본이다. workers=1 실행으로 동시성을 제한하되 앞 표본 실패로 뒤 표본을 skip하지 않는다.
    test.describe.configure({ mode: "default", timeout: 240_000 });

    test.beforeEach(async ({ page, context }) => {
        const tokenFile = process.env.NOVEL_LIVE_TOKEN_FILE;
        if (!tokenFile || !artifacts) throw new Error("Local live gateway/token/artifact configuration required");
        const token = fs.readFileSync(tokenFile, "utf8").trim();
        await installMockAuthCookie(context, "ADMIN");
        await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
        await mockIdleWebSocket(page);
        await page.route("**/api/v1/syosyetu/n123aa/episodes/**", async route => {
            // 인증 세션만 합성하며 Novel 응답은 mock하지 않는다. 비밀은 브라우저 저장소/trace에 남기지 않는다.
            const source = new URL(route.request().url());
            try {
                const response = await route.fetch({ url: `${gateway.origin}${source.pathname}${source.search}`, headers: { ...route.request().headers(), Authorization: `Bearer ${token}` }, timeout: 180_000 });
                await route.fulfill({ response });
            } catch {
                // Playwright의 원래 오류에는 요청 헤더가 포함될 수 있으므로 저장하지 않는다.
                throw new Error("LOCAL_NOVEL_GATEWAY_TRANSPORT_FAILED");
            }
        });
    });

    for (const [episode, chars] of [[1, 501], [2, 2027], [3, 5032], [4, 10010]]) {
        test(`NOVEL-LIVE-${episode} full painted translation ${chars} Japanese characters`, async ({ page }) => {
            // 준비: 소스는 자체 작성 fixture로 이미 저장되어 있으며 첫 번역은 실제 OpenAI다.
            const status = page.getByTestId("novel-translation-state");
            let cached: boolean | null = null;
            let coldFinished = false;
            let phase = "SOURCE_LOAD";
            let job: Record<string, unknown> = {};
            page.on("response", async response => {
                if (!new URL(response.url()).pathname.includes(`/n123aa/episodes/${episode}/`)) return;
                try {
                    const envelope = await response.json();
                    const summary = safeJobSummary(envelope.body);
                    job = { ...job, ...Object.fromEntries(Object.entries(summary).filter(([, value]) => value !== null)) };
                } catch { /* 중단된 요청의 body는 읽을 수 없으므로 마지막 검증 가능한 상태를 보존한다. */ }
            });
            try {
                await page.goto(`/novel/syosyetu/novels/n123aa/episode/${episode}`);
                await expect(status).toHaveAttribute("data-first-source-ms", /\d/, { timeout: 30_000 });
                cached = await status.getAttribute("data-state") === "SUCCEEDED";
                if (process.env.NOVEL_LIVE_REQUIRE_WARM === "1" && !cached) throw new Error("FINAL_VALIDATION_REQUIRES_PRESERVED_TRANSLATION_CACHE");
                phase = "TRANSLATION_START";
                if (!cached) await page.getByRole("button", { name: "전체 번역 시작", exact: true }).click();

                // 실행 / 검증: 기존 assertion과 timeout은 유지하고 성공/실패 표본을 모두 보존한다.
                phase = "ALL_TRANSLATIONS_PAINTED";
                await expect(status).toHaveAttribute("data-state", "SUCCEEDED", { timeout: 180_000 });
                await expect(status).toHaveAttribute("data-all-translations-ms", /\d/);
                const metrics = await paintedMetrics(status);
                fs.writeFileSync(path.join(artifacts, `live-episode-${episode}.json`), JSON.stringify({ episode, chars, sourceCached: true, translationWasCached: cached, outcome: "SUCCEEDED", job, metrics, actualGateway: true, syntheticAuth: true, browser: "Chromium/Edge", targetMet: metrics?.allTranslationsMs != null && metrics.allTranslationsMs <= 5000 }, null, 2));
                coldFinished = true;

                phase = "WARM_CACHE_PAINTED";
                await page.reload();
                await expect(status).toHaveAttribute("data-all-translations-ms", /\d/, { timeout: 30_000 });
                const warm = await status.getAttribute("data-all-translations-ms");
                fs.writeFileSync(path.join(artifacts, `live-episode-${episode}-warm.json`), JSON.stringify({ episode, outcome: "SUCCEEDED", allTranslationsMs: Number(warm), cache: "warm" }, null, 2));
            } catch (error) {
                const metrics = await paintedMetrics(status).catch(() => null);
                const suffix = coldFinished ? "-warm" : "";
                fs.writeFileSync(path.join(artifacts, `live-episode-${episode}${suffix}.json`), JSON.stringify({ episode, chars, sourceCached: true, translationWasCached: cached, outcome: "FAILED", phase, errorType: error instanceof Error ? error.name : "UnknownError", job, metrics, actualGateway: true, syntheticAuth: true, browser: "Chromium/Edge", targetMet: false }, null, 2));
                throw error;
            }
        });
    }

    test("NOVEL-LIVE-AUDIO actual current-episode/single/from audio playback", async ({ page }) => {
        // 준비: 기본 JA 범위를 유지하며 KO opt-in은 검증된 번역 완료 후에만 합성한다.
        const language = process.env.NOVEL_LIVE_AUDIO_LANGUAGE === "ko" ? "ko" : "ja";
        await page.goto("/novel/syosyetu/novels/n123aa/episode/5");
        await expect(page.getByTestId("novel-sentence")).toHaveCount(3);
        const translation = page.getByTestId("novel-translation-state");
        let translationGeneratedBeforeSpeech = false;
        if (language === "ko" && await translation.getAttribute("data-state") !== "SUCCEEDED") {
            const state = await translation.getAttribute("data-state");
            if (state !== "QUEUED" && state !== "RUNNING") {
                if (process.env.NOVEL_LIVE_REQUIRE_WARM === "1") throw new Error("KO_AUDIO_REQUIRES_PREVIOUSLY_VALIDATED_TRANSLATION");
                await page.getByRole("button", { name: "전체 번역 시작", exact: true }).click();
                translationGeneratedBeforeSpeech = true;
            }
            await expect(translation).toHaveAttribute("data-state", "SUCCEEDED", { timeout: 180_000 });
            await expect(translation).toHaveAttribute("data-all-translations-ms", /\d/);
        }
        await page.getByLabel("낭독 언어").selectOption(language);
        const state = page.getByTestId("novel-playback-state");
        const audioResponses: { status: number; segmentId?: string; partIndex?: number; language?: string }[] = [];
        page.on("response", response => {
            if (response.url().endsWith("/audio")) {
                const request = response.request().postDataJSON();
                audioResponses.push({ status: response.status(), segmentId: request.segmentId, partIndex: request.partIndex, language: request.language });
            }
        });
        // 실행 / 검증: 실제 media ended까지 기다려 순서대로 전체/단일/이어읽기를 확인한다.
        await page.getByRole("button", { name: "현재 회차 전체 읽기", exact: true }).click();
        await expect(state).toHaveAttribute("data-state", "playing", { timeout: 60_000 });
        await expect(page.locator('[data-active="true"]')).toHaveCount(1);
        await expect(state).toHaveAttribute("data-state", "ended", { timeout: 90_000 });
        const firstPlayable = await state.getAttribute("data-first-audio-playable-ms");
        expect(audioResponses).toHaveLength(3);
        const sentences = page.getByTestId("novel-sentence");
        await sentences.nth(1).getByRole("button", { name: /문장 메뉴/ }).click();
        await sentences.nth(1).getByRole("button", { name: `${language === "ko" ? "한국어 번역" : "일본어 원문"}: 이 문장 읽기`, exact: true }).click();
        await expect(state).toHaveAttribute("data-state", "playing", { timeout: 30_000 });
        await expect(state).toHaveAttribute("data-state", "ended", { timeout: 30_000 });
        expect(audioResponses).toHaveLength(3);
        await sentences.nth(1).getByRole("button", { name: /문장 메뉴/ }).click();
        await sentences.nth(1).getByRole("button", { name: "여기부터 읽기", exact: true }).click();
        await expect(state).toHaveAttribute("data-state", "playing", { timeout: 30_000 });
        await expect(state).toHaveAttribute("data-state", "ended", { timeout: 60_000 });
        expect(audioResponses).toHaveLength(3);
        expect(audioResponses.every(item => item.status === 200)).toBe(true);
        expect(audioResponses.every(item => item.language === language)).toBe(true);
        expect(new Set(audioResponses.map(item => item.segmentId)).size).toBe(3);
        fs.writeFileSync(path.join(artifacts, "live-audio-browser.json"), JSON.stringify({ language, translationGeneratedBeforeSpeech, firstPlayableMs: Number(firstPlayable), audioResponses, completedScopes: ["current episode all", "selected sentence", "selected through end"], actualMediaEvents: true, listening: "LISTENING_NOT_VERIFIED" }, null, 2));
        await page.screenshot({ path: path.join(artifacts, "live-reader.png"), fullPage: true });
    });
});
