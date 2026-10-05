import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Locator, Page } from "@playwright/test";
import { test, expect, installMockAuthCookie } from "../fixtures/mock-test";
import { mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { TEST_USERS } from "../support/test-users";
import { assertExecutableManifest, verifyFrozenParagraphs, verifySourceContract, type SourceContract } from "../support/novel-source-integrity";
import { installNativeMediaObserver, nativeMediaObservation, nativeClickToPlaying, nativePlaybackPosition } from "../support/novel-media-observer";
import { qualityPairSnapshot } from "../support/novel-quality-pairs";
import { audioBudgetPlan } from "../support/novel-audio-budget";
import { verifyCompletedCandidatePairBytes } from "../support/novel-audio-case-contract";
import { verifyExecutionContract, type ExpectedExecution } from "../support/novel-execution-contract";

// corpus/실행 정책과 예산 승인은 외부 manifest가 소유한다. 이 suite는 로컬 실제 경로만 허용한다.
const enabled = process.env.NOVEL_QUALITY_LIVE_E2E === "1";
const artifactRoot = process.env.NOVEL_LIVE_ARTIFACT_DIR ?? "";
const allowedGateways = new Set(["http://127.0.0.1:19782", "http://127.0.0.1:19785"]);
interface Case extends SourceContract {
    id: string;
    novel: string;
    episode: string;
    expectCold: boolean;
    stack?: "baseline" | "candidate";
    actorId?: string;
    executionDeadlineMs?: number;
    sourceFile?: string;
    sourceFileSha256?: string;
    sourceJsonSha256?: string;
    rawSourceCodePoints?: number;
    expectedExecution?: ExpectedExecution;
    expectedTranslationPairsSha256?: string;
    completedCandidatePairFile?: string;
    completedCandidatePairFileSha256?: string;
}
interface StackConfig { gateway: string; tokenBundleFile: string }
const stackConfigFile = process.env.NOVEL_QUALITY_STACKS_FILE;
const stacks: Record<string, StackConfig> = stackConfigFile ? JSON.parse(fs.readFileSync(stackConfigFile, "utf8")).stacks : {};

function localGateway(value: string) {
    const gateway = new URL(value);
    if (!allowedGateways.has(gateway.origin) || gateway.pathname !== "/" || gateway.search || gateway.hash || gateway.username || gateway.password) {
        throw new Error("LOCAL_QUALITY_GATEWAY_REQUIRED");
    }
    return gateway.origin;
}

function gatewayAccess(scenario?: Case | null) {
    if (scenario?.stack) {
        const stack = stacks[scenario.stack];
        const actor = Number(scenario.actorId);
        if (!stack || !/^\d{7}$/.test(scenario.actorId ?? "") || !Number.isSafeInteger(actor) || actor < 9000101 || actor > 9001100) throw new Error("LOCAL_SYNTHETIC_ACTOR_REQUIRED");
        const origin = localGateway(stack.gateway);
        const expected = scenario.stack === "baseline" ? "http://127.0.0.1:19782" : "http://127.0.0.1:19785";
        if (origin !== expected) throw new Error("LOCAL_STACK_ORIGIN_MISMATCH");
        const tokens = JSON.parse(fs.readFileSync(stack.tokenBundleFile, "utf8"));
        const token = tokens[String(actor)];
        if (typeof token !== "string" || token.length < 30) throw new Error("LOCAL_SYNTHETIC_TOKEN_REQUIRED");
        return { origin, token };
    }
    if (!process.env.NOVEL_LIVE_TOKEN_FILE) throw new Error("LOCAL_AUTH_FILE_REQUIRED");
    return {
        origin: localGateway(process.env.NOVEL_LIVE_GATEWAY_URL ?? "http://127.0.0.1:19782"),
        token: fs.readFileSync(process.env.NOVEL_LIVE_TOKEN_FILE, "utf8").trim(),
    };
}

const manifestFile = process.env.NOVEL_QUALITY_CASES_FILE;
const manifest = manifestFile ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : { cases: [] };
assertExecutableManifest(manifest);
const cases: Case[] = manifest.cases;
const caseIds = new Set<string>();
for (const value of cases) {
    if (![value.id, value.novel, value.episode].every(item => /^[a-zA-Z0-9_-]{1,100}$/.test(item))) throw new Error("INVALID_QUALITY_CASE");
    if (caseIds.has(value.id) || (value.stack !== undefined && !["baseline", "candidate"].includes(value.stack))) throw new Error("INVALID_QUALITY_CASE_ID_OR_STACK");
    if (typeof value.expectCold !== "boolean") throw new Error("EXPLICIT_CACHE_CONDITION_REQUIRED");
    if (value.executionDeadlineMs !== undefined && (!Number.isSafeInteger(value.executionDeadlineMs) || value.executionDeadlineMs < 100 || value.executionDeadlineMs > 600_000)) throw new Error("INVALID_CASE_DEADLINE");
    caseIds.add(value.id);
}
const audioCase = process.env.NOVEL_QUALITY_AUDIO_CASE_FILE ? JSON.parse(fs.readFileSync(process.env.NOVEL_QUALITY_AUDIO_CASE_FILE, "utf8")) as Case : null;
const audioAllowlists = new WeakMap<Page, Set<string>>();
if (audioCase && ![audioCase.novel, audioCase.episode].every(item => /^[a-zA-Z0-9_-]{1,100}$/.test(item))) throw new Error("INVALID_AUDIO_CASE");

async function metrics(status: Locator) {
    if (!await status.count()) return null;
    return status.evaluate(el => ({ state: el.getAttribute("data-state"), ...JSON.parse(el.getAttribute("data-reader-metrics") ?? "{}") }));
}
async function audioMetrics(status: Locator) {
    return status.evaluate(el => Object.fromEntries([...el.attributes].filter(item => item.name.startsWith("data-")).map(item => [item.name, item.value])));
}
function durationHeader(headers: Record<string, string>, name: string) {
    const value = headers[name];
    return value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
}
async function speechCalls(traceId: string | string[]) {
    const response = await fetch("http://127.0.0.1:19781/qa/stats");
    if (!response.ok) throw new Error("ACTUAL_PROVIDER_LEDGER_REQUIRED");
    const ledger = await response.json();
    if (!Array.isArray(ledger.calls)) throw new Error("INVALID_PROVIDER_LEDGER");
    // 원문/오디오/인증 헤더 없이 같은 trace의 실제 speech 시도만 집계한다.
    const traces = Array.isArray(traceId) ? traceId : [traceId];
    return ledger.calls.filter((item: { task?: string; traceId?: string }) => item.task === "OPENAI_TTS" && traces.includes(item.traceId ?? ""))
        .map((item: { attempt: unknown; task: unknown; model: unknown; status: unknown }) => ({ attempt: item.attempt, task: item.task, model: item.model, status: item.status }));
}

test.use({ trace: "off", screenshot: "off", video: "off" });
test.describe("quality first real gateway", () => {
    test.skip(!enabled, "Explicit quality-first live gateway/ledger authorization required");
    test.describe.configure({ mode: "default", timeout: 240_000, retries: 0 });
    test.beforeEach(async ({ page, context }, testInfo) => {
        if (!artifactRoot) throw new Error("LOCAL_ARTIFACT_REQUIRED");
        // 한 회차의 잘못된 실행 정책이 나머지 예약 회차의 유료 시작으로 번지지 않게 차단한다.
        if (fs.existsSync(path.join(artifactRoot, "POLICY_GUARD_STOP.json"))) throw new Error("EXECUTION_POLICY_GUARD_BLOCKED");
        const scenario = cases.find(item => testInfo.title === `NOVEL-QUALITY-PERF ${item.id}`) ?? audioCase;
        const { origin, token } = gatewayAccess(scenario);
        await installMockAuthCookie(context, "ADMIN");
        await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
        await mockIdleWebSocket(page);
        await page.route("**/api/v1/syosyetu/*/episodes/**", async route => {
            const requested = new URL(route.request().url());
            if (requested.pathname.endsWith("/audio")) {
                const body = route.request().postDataJSON();
                const key = `${body.revision}|${body.segmentId}|${body.language}|${body.partIndex}`;
                if (requested.pathname !== `/api/v1/syosyetu/${scenario?.novel}/episodes/${scenario?.episode}/audio` || !audioAllowlists.get(page)?.has(key)) {
                    await route.abort();
                    throw new Error("AUDIO_REQUEST_OUTSIDE_APPROVED_PREFLIGHT");
                }
            }
            try {
                // 같은 FE를 유지하면서 baseline/candidate의 실제 BE에 연결한다. 이 local routing 부하는 시간에서 빼지 않는다.
                const response = await route.fetch({ url: `${origin}${requested.pathname}`, headers: { ...route.request().headers(), Authorization: `Bearer ${token}` }, timeout: 180_000 });
                await route.fulfill({ response });
            } catch { throw new Error("LOCAL_QUALITY_GATEWAY_TRANSPORT_FAILED"); }
        });
    });
    test.afterEach(async ({ page }, testInfo) => {
        // 인증/fixture 준비에서 실패한 회차도 결과 집계에서 사라지지 않게 한다. 원래 assertion은 유지한다.
        if (!artifactRoot) return;
        const scenario = cases.find(item => testInfo.title === `NOVEL-QUALITY-PERF ${item.id}`);
        const language = /^NOVEL-QUALITY-AUDIO (ja|ko) /.exec(testInfo.title)?.[1];
        const filename = scenario ? `${scenario.id}.json` : language ? `audio-${language}.json` : null;
        if (scenario && !fs.existsSync(path.join(artifactRoot, "quality-pairs", filename!))) {
            fs.mkdirSync(path.join(artifactRoot, "quality-pairs"), { recursive: true });
            fs.writeFileSync(path.join(artifactRoot, "quality-pairs", filename!), JSON.stringify({ scenarioId: scenario.id,
                stack: scenario.stack, actorId: scenario.actorId, novel: scenario.novel, episode: scenario.episode,
                sourceFileSha256: scenario.sourceFileSha256 ?? null, outcome: "FAILED", phase: "SETUP_OR_HARNESS",
                captureStatus: "SNAPSHOT_UNAVAILABLE", frozenSourceProof: null, sourceContractProof: null,
                snapshotResponse: null, evidence: null, evaluationStatus: "NOT_EVALUATED", extraProviderCalls: 0 }, null, 2));
        }
        if (!filename || fs.existsSync(path.join(artifactRoot, filename))) return;
        const result = page.isClosed() ? null : await metrics(page.getByTestId("novel-translation-state")).catch(() => null);
        fs.writeFileSync(path.join(artifactRoot, filename), JSON.stringify({ scenario: scenario ?? audioCase, language,
            outcome: "FAILED", phase: "SETUP_OR_HARNESS", testStatus: testInfo.status, errorType: "HarnessSetupFailure",
            errorCode: fs.existsSync(path.join(artifactRoot, "POLICY_GUARD_STOP.json")) ? "EXECUTION_POLICY_GUARD_BLOCKED" : null, result }, null, 2));
    });

    for (const scenario of cases) {
        test(`NOVEL-QUALITY-PERF ${scenario.id}`, async ({ page }) => {
            const executionBudget = scenario.executionDeadlineMs ?? 300_000;
            test.setTimeout(executionBudget + 60_000);
            // 준비: 실패 표본도 보존하며 source 읽기와 명시적 번역 클릭은 각각 다른 trace다.
            const status = page.getByTestId("novel-translation-state");
            const spans: Record<string, unknown>[] = [];
            let phase = "SOURCE";
            let sourceProof: ReturnType<typeof verifyFrozenParagraphs> | null = null;
            let contractProof: ReturnType<typeof verifySourceContract> | null = null;
            let diagnosticOnly = false;
            let qualityOutcome = "FAILED";
            let snapshotEvidence: ReturnType<typeof qualityPairSnapshot> = null;
            let snapshotResponse: Record<string, unknown> | null = null;
            let latestExecutionBody: unknown = null;
            let latestSnapshotBody: unknown = null;
            let latestSnapshotOrdinal = -1;
            let responseOrdinal = 0;
            let executionProof: ReturnType<typeof verifyExecutionContract> | null = null;
            const assertExecution = (body: unknown) => {
                try {
                    executionProof = verifyExecutionContract(scenario.expectedExecution, body);
                } catch (error) {
                    const actual = body as { execution?: unknown; segmentationVersion?: unknown };
                    fs.writeFileSync(path.join(artifactRoot, "POLICY_GUARD_STOP.json"), JSON.stringify({ scenarioId: scenario.id,
                        reason: "EXECUTION_CONTRACT_MISMATCH", expectedExecution: scenario.expectedExecution,
                        actualExecution: actual?.execution ?? null, actualSegmentationVersion: actual?.segmentationVersion ?? null,
                        action: "Block every subsequent case before gateway access; preserve failed/planned denominator" }, null, 2));
                    throw error;
                }
            };
            const responseCaptures: Promise<void>[] = [];
            page.on("response", response => {
                if (!response.url().includes(`/syosyetu/${scenario.novel}/episodes/${scenario.episode}/`)) return;
                const isDiagnostic = diagnosticOnly;
                const ordinal = responseOrdinal++;
                const capture = async () => {
                    try {
                        const body = (await response.json()).body;
                        const headers = response.headers();
                        const snapshot = qualityPairSnapshot(body);
                        if (snapshot && ordinal > latestSnapshotOrdinal) {
                            snapshotEvidence = snapshot;
                            latestSnapshotBody = body;
                            latestExecutionBody = { execution: body.execution, segmentationVersion: body.segmentationVersion };
                            latestSnapshotOrdinal = ordinal;
                            snapshotResponse = { path: new URL(response.url()).pathname, status: response.status(),
                                requestTraceId: response.request().headers()["x-novel-trace-id"], diagnosticOnly: isDiagnostic, responseOrdinal: ordinal };
                        }
                        spans.push({ path: new URL(response.url()).pathname, method: response.request().method(), status: response.status(), diagnosticOnly: isDiagnostic, jobId: body.jobId,
                            requestTraceId: response.request().headers()["x-novel-trace-id"], traceId: body.traceId, runTraceId: body.runTraceId, eventSequence: body.eventSequence, state: body.state,
                            totalSegments: body.totalSegments, completedSegments: body.completedSegments, progress: body.progress, timings: body.timings, execution: body.execution,
                            gateway: {
                                traceId: headers["x-novel-trace-id"] ?? null,
                                durationMs: durationHeader(headers, "x-novel-be-duration-ms"),
                                authDispatchMs: durationHeader(headers, "x-novel-be-auth-dispatch-ms"),
                                upstreamHeadersMs: durationHeader(headers, "x-novel-upstream-headers-ms"),
                                upstreamDurationMs: durationHeader(headers, "x-novel-upstream-duration-ms"),
                                validationMs: durationHeader(headers, "x-novel-be-validation-ms"),
                            },
                            errorCode: typeof body.code === "string" && /^[A-Z0-9_:-]{1,120}$/.test(body.code) ? body.code : null });
                    } catch { /* 응답 중단은 최종 실패 표본과 상태에 남긴다. */ }
                };
                responseCaptures.push(capture());
            });
            try {
                // 원문 file byte hash와 paragraph만 읽는다. author/evaluation 정보는 브라우저나 provider에 전달하지 않는다.
                let expectedParagraphs: string[] | null = null;
                if (scenario.expectCold && !scenario.sourceFile) throw new Error("FROZEN_SOURCE_REQUIRED");
                if (scenario.sourceFile) {
                    if (!/^[0-9a-f]{64}$/i.test(scenario.sourceFileSha256 ?? "")) throw new Error("FROZEN_SOURCE_HASH_REQUIRED");
                    const sourceBytes = fs.readFileSync(scenario.sourceFile);
                    const sourceDigest = createHash("sha256").update(sourceBytes).digest("hex");
                    if (sourceDigest !== scenario.sourceFileSha256!.toLowerCase()) throw new Error("FROZEN_SOURCE_FILE_CHANGED");
                    expectedParagraphs = JSON.parse(sourceBytes.toString("utf8")).source.paragraphs;
                }
                const sourceResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith(`/syosyetu/${scenario.novel}/episodes/${scenario.episode}/reader`)).catch(() => null);
                await page.goto(`/novel/syosyetu/novels/${scenario.novel}/episode/${scenario.episode}`);
                await expect(status).toHaveAttribute("data-first-source-ms", /\d/, { timeout: 30_000 });
                const sourceRead = await metrics(status);
                const sourceResult = await sourceResponse;
                if (!sourceResult) throw new Error("SOURCE_RESPONSE_MISSING");
                const sourceBody = (await sourceResult.json()).body;
                phase = "SOURCE_CONTRACT";
                contractProof = verifySourceContract(scenario, sourceBody);
                if (expectedParagraphs) {
                    phase = "SOURCE_INTEGRITY";
                    sourceProof = verifyFrozenParagraphs(expectedParagraphs, sourceBody.segments);
                    if (scenario.rawSourceCodePoints !== undefined) expect(sourceProof.rawSourceCodePoints).toBe(scenario.rawSourceCodePoints);
                }
                const cached = sourceRead.state === "SUCCEEDED";
                if (scenario.expectCold) {
                    expect(sourceRead.state).toBe("SOURCE_READY");
                    expect(sourceBody.jobId).toBeNull();
                }
                if (!scenario.expectCold) expect(cached).toBe(true);
                let expectedJobId = sourceBody.jobId;
                let expectedRunTraceId = sourceBody.runTraceId;
                const assertResultBindings = () => {
                    const current = latestSnapshotBody as Parameters<typeof verifySourceContract>[1] & {
                        segments: Parameters<typeof verifyFrozenParagraphs>[1]; jobId: string; runTraceId: string;
                    };
                    verifySourceContract({ sourceRevision: sourceBody.revision, segmentationVersion: sourceBody.segmentationVersion,
                        canonicalIdsSha256: contractProof!.canonicalIdsSha256, sourceCodePoints: contractProof!.eligibleSourceCodePoints }, current);
                    if (expectedParagraphs) verifyFrozenParagraphs(expectedParagraphs, current.segments);
                    expect(current.jobId).toBe(expectedJobId);
                    expect(current.runTraceId).toBe(expectedRunTraceId);
                };
                phase = "TRANSLATION";
                if (!cached) {
                    const startedResponse = page.waitForResponse(response => response.request().method() === "POST"
                        && new URL(response.url()).pathname.endsWith(`/syosyetu/${scenario.novel}/episodes/${scenario.episode}/translations`));
                    await page.getByRole("button", { name: "전체 번역 시작", exact: true }).click();
                    const actualStartResponse = await startedResponse;
                    expect(actualStartResponse.status()).toBe(200);
                    const startBody = (await actualStartResponse.json()).body;
                    expectedJobId = startBody.jobId;
                    expectedRunTraceId = startBody.runTraceId;
                    expect(typeof expectedJobId).toBe("string");
                    expect(expectedRunTraceId).toBe(actualStartResponse.request().headers()["x-novel-trace-id"]);
                    phase = "EXECUTION_CONTRACT";
                    assertExecution(startBody);
                    phase = "TRANSLATION";
                } else {
                    assertExecution(sourceBody);
                }
                // 선언된 작업 deadline까지 관측하되 명시 실패는 즉시 기록한다. timeout/실패를 성공 표본에서 지우지 않는다.
                await expect(status).toHaveAttribute("data-state", /^(SUCCEEDED|FAILED|PARTIAL|CANCELLED)$/, { timeout: executionBudget + 10_000 });
                expect(await status.getAttribute("data-state")).toBe("SUCCEEDED");
                await expect(status).toHaveAttribute("data-all-translations-ms", /\d/);
                await Promise.allSettled(responseCaptures);
                assertExecution(latestExecutionBody);
                assertResultBindings();
                const result = await metrics(status);
                expect(result.progress.completed).toBe(result.progress.total);
                expect(result.progress.prefix).toBe(result.progress.total);
                if (scenario.sourceCodePoints !== undefined) expect(result.progress.total).toBe(scenario.sourceCodePoints);
                expect(result.durableObserved).toBeGreaterThanOrEqual(0);
                expect(result.allTranslations).toBeGreaterThanOrEqual(0);
                const readyMs = Math.max(result.allTranslations, result.durableObserved);
                // 완료 시각은 이미 고정했다. commit 진단값 후속 저장 race만 유료 없는 status1회로 보강한다.
                diagnosticOnly = true;
                const jobId = spans.findLast(item => typeof item.jobId === "string")?.jobId ?? sourceBody.jobId;
                const finalDiagnostics = typeof jobId === "string" ? await page.evaluate(async ({ url, traceId }) => {
                    const started = performance.now();
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 10_000);
                    try {
                        const response = await fetch(url, { headers: { "X-Novel-Trace-Id": traceId }, cache: "no-store", signal: controller.signal });
                        const body = (await response.json()).body;
                        return { diagnosticOnly: true, status: response.status, requestMs: performance.now() - started,
                            traceId: body?.traceId ?? null, runTraceId: body?.runTraceId ?? null,
                            segmentationVersion: body?.segmentationVersion ?? null, execution: body?.execution ?? null };
                    } catch {
                        return { diagnosticOnly: true, status: null, requestMs: performance.now() - started,
                            traceId: null, runTraceId: null, segmentationVersion: null, execution: null };
                    } finally {
                        clearTimeout(timeout);
                    }
                }, { url: `/api/v1/syosyetu/${scenario.novel}/episodes/${scenario.episode}/translations/${encodeURIComponent(jobId)}`, traceId: result.traceId }) : null;
                if (finalDiagnostics?.status === 200) {
                    expect(finalDiagnostics.traceId).toBe(result.traceId);
                    assertExecution(finalDiagnostics);
                    await Promise.allSettled(responseCaptures);
                    assertResultBindings();
                }
                phase = "TRACE_VALIDATION";
                // 중복 header를 단일 UUID처럼 처리하지 않는다. warm 응답의 원래 runTraceId는 별도 보존한다.
                const successfulSpans = spans.filter(item => item.status === 200);
                expect(successfulSpans.length).toBeGreaterThan(0);
                for (const span of successfulSpans) {
                    const headerTrace = (span.gateway as { traceId: unknown }).traceId;
                    expect(headerTrace).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                    expect(headerTrace).toBe(span.requestTraceId);
                    expect(span.traceId).toBe(span.requestTraceId);
                }
                if (scenario.expectCold) {
                    const terminal = successfulSpans.findLast(item => item.state === "SUCCEEDED");
                    expect(terminal?.runTraceId).toBe(result.traceId);
                }
                // 같은 브라우저의 resource clock 구간만 수집한다. 서버 clock와 차감하지 않는다.
                const browserTransport = await page.evaluate(({ novel, episode }) => performance.getEntriesByType("resource")
                    .filter(entry => entry.name.includes(`/syosyetu/${novel}/episodes/${episode}/`))
                    .map(entry => {
                        const resource = entry as PerformanceResourceTiming;
                        return { path: new URL(resource.name).pathname, startTimeMs: resource.startTime, durationMs: resource.duration,
                            requestStartMs: resource.requestStart, responseStartMs: resource.responseStart, responseEndMs: resource.responseEnd,
                            transferSize: resource.transferSize, decodedBodySize: resource.decodedBodySize };
                    }), scenario);
                fs.writeFileSync(path.join(artifactRoot, `${scenario.id}.json`), JSON.stringify({ scenario, outcome: "SUCCEEDED", sourceRead, sourceProof, contractProof, executionProof, result, readyMs, finalDiagnostics, spans, browserTransport, targetWithin5s: readyMs <= 5000, qualityVerdict: "SEPARATE_SOURCE_REVIEW_REQUIRED", providerPromptCacheCold: "NOT_ASSUMED" }, null, 2));
                qualityOutcome = "SUCCEEDED";
            } catch (error) {
                const errorCode = error instanceof Error && /^[A-Z0-9_]{1,100}$/.test(error.message) ? error.message : null;
                fs.writeFileSync(path.join(artifactRoot, `${scenario.id}.json`), JSON.stringify({ scenario, outcome: "FAILED", phase, errorType: error instanceof Error ? error.name : "Unknown", errorCode, sourceProof, contractProof, result: await metrics(status).catch(() => null), spans }, null, 2));
                throw error;
            } finally {
                // 성능 완료 시각을 바꾸지 않고 이미 받은 실제 응답만 보존한다. partial/timeout도 분모에 남긴다.
                await Promise.allSettled(responseCaptures);
                fs.mkdirSync(path.join(artifactRoot, "quality-pairs"), { recursive: true });
                fs.writeFileSync(path.join(artifactRoot, "quality-pairs", `${scenario.id}.json`), JSON.stringify({
                    scenarioId: scenario.id, stack: scenario.stack, actorId: scenario.actorId, novel: scenario.novel, episode: scenario.episode,
                    outcome: qualityOutcome, phase, captureStatus: snapshotEvidence ? "ACTUAL_HTTP_SNAPSHOT" : "SNAPSHOT_UNAVAILABLE",
                    sourceFileSha256: scenario.sourceFileSha256 ?? null, frozenSourceProof: sourceProof, sourceContractProof: contractProof,
                    snapshotResponse, evidence: snapshotEvidence, evaluationStatus: "NOT_EVALUATED", extraProviderCalls: 0,
                }, null, 2));
            }
        });
    }

    for (const language of ["ja", "ko"] as const) {
        test(`NOVEL-QUALITY-AUDIO ${language} intent, single cache, long limited playback and stop`, async ({ page, context }) => {
            if (!audioCase) throw new Error("PRESEEDED_LONG_AUDIO_CASE_REQUIRED");
            const scenario = audioCase!;
            // 새 campaign은 고정된 옛 계정 범위 대신 완료 결과 파일과 동일 계정·원문·번역을 바인딩한다.
            if (!scenario.completedCandidatePairFile || !path.isAbsolute(scenario.completedCandidatePairFile)) throw new Error("COMPLETED_AUDIO_FILE_REQUIRED");
            const completedTranslationProof = verifyCompletedCandidatePairBytes(scenario, fs.readFileSync(scenario.completedCandidatePairFile));
            const evidence: Record<string, unknown> = { language, listening: "LISTENING_NOT_VERIFIED", actualProviderLedger: true };
            evidence.completedTranslationProof = completedTranslationProof;
            evidence.translationCondition = "Already completed final candidate translation cache; no translation POST in audio suite";
            const traces: string[] = [];
            const playback = page.getByTestId("novel-playback-state");
            const requests: { revision: string; segmentId: string; language: string; partIndex: number; traceId: string | null }[] = [];
            const audioResponses: Record<string, unknown>[] = [];
            const audioResponseCaptures: Promise<void>[] = [];
            const audioContractErrors: string[] = [];
            let expectedAudioPolicyVersion: string | null = null;
            await installNativeMediaObserver(page);
            page.on("request", request => {
                if (!request.url().endsWith("/audio")) return;
                const traceId = request.headers()["x-novel-trace-id"] ?? null;
                requests.push({ ...request.postDataJSON(), traceId });
                if (traceId && !traces.includes(traceId)) traces.push(traceId);
            });
            page.on("response", response => {
                if (!response.url().endsWith("/audio")) return;
                const capture = async () => {
                    try {
                        const body = (await response.json()).body;
                        const request = response.request().postDataJSON();
                        const requestTraceId = response.request().headers()["x-novel-trace-id"];
                        const headerTraceId = response.headers()["x-novel-trace-id"];
                        // base64/인증값을 결과에 저장하지 않고 실제 응답의 정책·문장·추적 연결만 확인한다.
                        audioResponses.push({ status: response.status(), traceId: body?.traceId, requestTraceId, headerTraceId,
                            revision: body?.revision, segmentId: body?.segmentId, language: body?.language, partIndex: body?.partIndex,
                            cacheDisposition: body?.cacheDisposition, audioPolicyVersion: body?.audioPolicyVersion,
                            model: body?.model, provider: body?.provider, durationSeconds: body?.durationSeconds, timings: body?.timings });
                        if (response.status() !== 200 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(headerTraceId ?? "")
                            || headerTraceId !== requestTraceId || body?.traceId !== requestTraceId
                            || body?.audioPolicyVersion !== expectedAudioPolicyVersion
                            || ["revision", "segmentId", "language", "partIndex"].some(field => body?.[field] !== request[field])) {
                            audioContractErrors.push("AUDIO_TRACE_POLICY_OR_SENTENCE_MISMATCH");
                        }
                    } catch {
                        // 명시 취소로 중단한 응답은 요청/취소 증거로 남기며 읽기 성공으로 세지 않는다.
                    }
                };
                audioResponseCaptures.push(capture());
            });
            try {
                // 준비: 한국어는 이미 검증된 번역 cache만 사용한다. TTS 테스트가 대량 번역을 숨겨 시작하지 않는다.
                const sourceResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith(`/syosyetu/${scenario.novel}/episodes/${scenario.episode}/reader`));
                await page.goto(`/novel/syosyetu/novels/${scenario.novel}/episode/${scenario.episode}`);
                const audioSnapshot = (await (await sourceResponse).json()).body;
                if (!scenario.sourceFile || !/^[0-9a-f]{64}$/i.test(scenario.sourceFileSha256 ?? "")
                    || !scenario.expectedExecution || !/^[0-9a-f]{64}$/i.test(scenario.expectedTranslationPairsSha256 ?? "")) {
                    throw new Error("BOUND_AUDIO_SOURCE_AND_POLICY_REQUIRED");
                }
                const sourceBytes = fs.readFileSync(scenario.sourceFile);
                expect(createHash("sha256").update(sourceBytes).digest("hex")).toBe(scenario.sourceFileSha256!.toLowerCase());
                evidence.sourceContractProof = verifySourceContract(scenario, audioSnapshot);
                evidence.sourceProof = verifyFrozenParagraphs(JSON.parse(sourceBytes.toString("utf8")).source.paragraphs, audioSnapshot.segments);
                evidence.executionProof = verifyExecutionContract(scenario.expectedExecution, audioSnapshot);
                const pairs = qualityPairSnapshot(audioSnapshot);
                expect(pairs?.orderedTranslationsSha256).toBe(scenario.expectedTranslationPairsSha256!.toLowerCase());
                evidence.translationPairsSha256 = pairs?.orderedTranslationsSha256;
                const plan = audioBudgetPlan(audioSnapshot);
                expectedAudioPolicyVersion = plan.audioPolicyVersion;
                evidence.preflight = plan;
                // 과거 실패 재실행의 warm tail을 cold라고 판정하지 않는다. 기존 guard는 삭제/덮어쓰지 않는다.
                const guardDirectory = process.env.NOVEL_AUDIO_SCOPE_GUARD_DIR;
                if (!guardDirectory || !scenario.actorId || !scenario.stack) throw new Error("AUDIO_SCOPE_GUARD_REQUIRED");
                const scope = { stack: scenario.stack, actorId: scenario.actorId, novel: scenario.novel, episode: scenario.episode,
                    revision: plan.revision, audioPolicyVersion: plan.audioPolicyVersion, language };
                const scopeDigest = createHash("sha256").update(JSON.stringify(scope), "utf8").digest("hex");
                fs.mkdirSync(guardDirectory, { recursive: true });
                fs.writeFileSync(path.join(guardDirectory, `${scopeDigest}.json`), JSON.stringify({ scope, artifactRoot,
                    condition: "First harness attempt in this immutable actor/work/revision/policy/language scope; prior provider use must also be excluded by final actor allocation" }, null, 2), { flag: "wx" });
                evidence.scopeGuard = { scopeDigest, firstAttempt: true };
                audioAllowlists.set(page, new Set(plan.entries.filter(item => item.language === language)
                    .map(item => `${plan.revision}|${item.segmentId}|${item.language}|${item.partIndex}`)));
                evidence.mediaRuntime = await page.evaluate(() => ({ nativeAudioConstructor: Function.prototype.toString.call(Audio).includes("[native code]"),
                    nativeElement: new Audio() instanceof HTMLAudioElement }));
                expect(evidence.mediaRuntime).toEqual({ nativeAudioConstructor: true, nativeElement: true });
                evidence.playingMetricOrigin = "NovelPlayback.start performance.now after synchronous UI handler/queue planning; ends only on native onplaying, not play promise resolution";
                const translation = page.getByTestId("novel-translation-state");
                await expect(translation).toHaveAttribute("data-first-source-ms", /\d/, { timeout: 30_000 });
                if (language === "ko") await expect(translation).toHaveAttribute("data-state", "SUCCEEDED");
                const traceId = (await translation.getAttribute("data-run-trace-id"))!;
                evidence.traceId = traceId;
                traces.push(traceId);
                const sentences = page.getByTestId("novel-sentence").filter({ has: page.getByRole("button", { name: /문장 메뉴/ }) });
                expect(await sentences.count()).toBeGreaterThan(10);
                expect(await sentences.evaluateAll(items => items.map(item => item.getAttribute("data-segment-id")))).toEqual(plan.orderedSegmentIds);
                const before = (await speechCalls(traceId)).length;

                // 무의사 동작: 진입/선택/menu/scroll/toggle은 실제 provider 시도0이어야 한다.
                const selected = sentences.nth(1);
                await selected.getByRole("button", { name: /문장 메뉴/ }).click();
                await page.keyboard.press("Escape");
                await selected.locator("p").first().selectText();
                await page.mouse.wheel(0, 400);
                await page.getByLabel("본문 보기").selectOption("parallel");
                await page.getByLabel("낭독 언어").selectOption(language);
                await page.getByLabel("낭독 속도").selectOption("2");
                await page.waitForTimeout(1000);
                expect((await speechCalls(traceId)).length - before).toBe(0);
                expect(requests).toHaveLength(0);
                evidence.noIntentProviderDelta = 0;

                // 단일 읽기와 동일 음성 재생: 실제 playing/ended와 provider 장부를 함께 확인한다.
                const readSelected = async () => {
                    const beforeMedia = await nativeMediaObservation(page);
                    await selected.getByRole("button", { name: /문장 메뉴/ }).click();
                    await selected.getByRole("button", { name: `${language === "ja" ? "일본어 원문" : "한국어 번역"}: 이 문장 읽기`, exact: true }).click();
                    await expect(playback).toHaveAttribute("data-state", "playing", { timeout: 60_000 });
                    await expect(selected).toHaveAttribute("data-active", "true");
                    await expect(playback).toHaveAttribute("data-state", "ended", { timeout: 60_000 });
                    return nativeClickToPlaying(beforeMedia, await nativeMediaObservation(page));
                };
                evidence.singleColdNativeTiming = await readSelected();
                evidence.singleCold = await audioMetrics(playback);
                const singleCalls = (await speechCalls(traceId)).length;
                expect(singleCalls - before).toBe(1);
                expect(new Set(requests.map(item => item.segmentId)).size).toBe(1);
                evidence.singleCachedNativeTiming = await readSelected();
                evidence.singleCached = await audioMetrics(playback);
                expect((await speechCalls(traceId)).length).toBe(singleCalls);
                evidence.cachedProviderDelta = 0;

                // 취소 검증의 현재 문장만 single로 미리 만든다. 아직 미합성인 다음 문장은 모든 취소 시나리오에서 재사용한다.
                const cancellationCurrent = sentences.nth(3);
                const untouchedNextId = plan.orderedSegmentIds[4];
                await cancellationCurrent.getByRole("button", { name: /문장 메뉴/ }).click();
                await cancellationCurrent.getByRole("button", { name: `${language === "ja" ? "일본어 원문" : "한국어 번역"}: 이 문장 읽기`, exact: true }).click();
                await expect(cancellationCurrent).toHaveAttribute("data-active", "true", { timeout: 60_000 });
                await expect(playback).toHaveAttribute("data-state", "ended", { timeout: 60_000 });
                expect(requests.some(item => item.segmentId === untouchedNextId)).toBe(false);
                const cancellationEvidence: Record<string, unknown>[] = [];
                evidence.cancellationWithUncreatedNext = cancellationEvidence;
                for (const action of ["pause", "stop", "language", "locale", "navigation", "logout"] as const) {
                    await page.getByLabel("낭독 언어").selectOption(language);
                    await page.getByLabel("낭독 속도").selectOption("1");
                    const providerBefore = (await speechCalls(traces)).length;
                    await cancellationCurrent.getByRole("button", { name: /문장 메뉴/ }).click();
                    await cancellationCurrent.getByRole("button", { name: "여기부터 읽기", exact: true }).click();
                    await expect(cancellationCurrent).toHaveAttribute("data-active", "true");
                    const nativeBefore = await nativePlaybackPosition(page);
                    expect(nativeBefore?.nativeElement).toBe(true);
                    expect(nativeBefore?.paused).toBe(false);
                    const wouldReachLookaheadMs = (nativeBefore!.duration - 3 - nativeBefore!.currentTime) / nativeBefore!.playbackRate * 1000;
                    // 메뉴 조작 전 실제 재생 창을 확보한다. 짧아서 입증 불가한 표본을 성공 처리하지 않는다.
                    expect(wouldReachLookaheadMs).toBeGreaterThan(500);
                    expect(wouldReachLookaheadMs).toBeLessThan(20_000);
                    expect(requests.some(item => item.segmentId === untouchedNextId)).toBe(false);
                    const requestCountBefore = requests.length;

                    if (action === "pause" || action === "stop") {
                        await page.getByRole("button", { name: action === "pause" ? "일시정지" : "정지", exact: true }).click();
                    } else if (action === "language") {
                        await page.getByLabel("낭독 언어").selectOption(language === "ja" ? "ko" : "ja");
                    } else if (action === "locale") {
                        await page.getByRole("button", { name: "Language", exact: true }).click();
                        await page.getByRole("menuitem", { name: "🇯🇵", exact: true }).click();
                    } else if (action === "navigation") {
                        await page.getByRole("link", { name: "TranslaCat", exact: true }).click();
                    } else {
                        await page.unroute("**/api/auth/session");
                        const signout = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/signout" && response.request().method() === "POST");
                        await page.getByTestId("user-menu-toggle").click();
                        await page.getByRole("menuitem", { name: "로그아웃", exact: true }).click();
                        expect((await signout).status()).toBe(200);
                        await expect(page).not.toHaveURL(/\/episode\//);
                        expect((await context.cookies()).filter(cookie => cookie.name.includes("next-auth.session-token"))).toHaveLength(0);
                    }

                    const nativeAfterAction = await nativePlaybackPosition(page).catch(() => null);
                    if (nativeAfterAction) expect(nativeAfterAction.paused || nativeAfterAction.ended).toBe(true);
                    else expect(["navigation", "logout"].includes(action)).toBe(true);
                    await expect(page.locator('[data-testid="novel-playback-state"][data-state="playing"]')).toHaveCount(0);
                    await page.waitForTimeout(Math.ceil(wouldReachLookaheadMs) + 750);
                    expect(requests.length).toBe(requestCountBefore);
                    expect(requests.some(item => item.segmentId === untouchedNextId)).toBe(false);
                    expect((await speechCalls(traces)).length).toBe(providerBefore);
                    cancellationEvidence.push({ action, currentSegmentId: plan.orderedSegmentIds[3], untouchedNextId,
                        nativeBefore, nativeAfterAction, wouldReachLookaheadMs, providerDelta: 0, audioRequestDelta: 0,
                        nextWasUnrequested: true, currentCacheReuse: true, trigger: "actual user-facing UI action" });

                    // 실제 logout 뒤에는 검증용 로컬 UI 쿠키만 다시 준비한다. gateway actor/revision은 계속 같다.
                    if (action === "logout") {
                        await installMockAuthCookie(context, "ADMIN");
                        await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
                    }
                    if (["locale", "navigation", "logout"].includes(action)) {
                        await page.goto(`/ko/novel/syosyetu/novels/${scenario.novel}/episode/${scenario.episode}`);
                        await expect(translation).toHaveAttribute("data-first-source-ms", /\d/);
                        traces.push((await translation.getAttribute("data-run-trace-id"))!);
                    }
                }
                await page.getByLabel("낭독 언어").selectOption(language);
                await page.getByLabel("낭독 속도").selectOption("2");

                // 긴 회차의 시작부터4문장 연속 재생을 관측한 뒤 중지한다. 완료 연쇄 선생성은 허용하지 않는다.
                const beforeFullMedia = await nativeMediaObservation(page);
                await page.getByRole("button", { name: "현재 회차 전체 읽기", exact: true }).dblclick();
                await expect(sentences.nth(0)).toHaveAttribute("data-active", "true", { timeout: 60_000 });
                await expect(sentences.nth(1)).toHaveAttribute("data-active", "true", { timeout: 60_000 });
                await expect(sentences.nth(2)).toHaveAttribute("data-active", "true", { timeout: 90_000 });
                await expect(sentences.nth(3)).toHaveAttribute("data-active", "true", { timeout: 90_000 });
                evidence.longLimited = await audioMetrics(playback);
                evidence.longLimitedNativeTiming = nativeClickToPlaying(beforeFullMedia, await nativeMediaObservation(page));
                const playedAndNext = new Set(requests.map(item => item.segmentId));
                expect(playedAndNext.size).toBeLessThanOrEqual(5);
                await page.getByRole("button", { name: "일시정지", exact: true }).click();
                const pausedCalls = (await speechCalls(traces)).length;
                await page.waitForTimeout(1500);
                expect((await speechCalls(traces)).length).toBe(pausedCalls);
                await page.getByRole("button", { name: "정지", exact: true }).click();
                // 선택 위치부터 재개하는 큐도 실제 순서대로 진행한다. 재생 의사가 새로 생긴 때만 요청한다.
                const beforeFromMedia = await nativeMediaObservation(page);
                await selected.getByRole("button", { name: /문장 메뉴/ }).click();
                await selected.getByRole("button", { name: "여기부터 읽기", exact: true }).click();
                await expect(selected).toHaveAttribute("data-active", "true", { timeout: 30_000 });
                await expect(sentences.nth(2)).toHaveAttribute("data-active", "true", { timeout: 60_000 });
                evidence.fromSelection = await audioMetrics(playback);
                evidence.fromSelectionNativeTiming = nativeClickToPlaying(beforeFromMedia, await nativeMediaObservation(page));
                await page.getByRole("button", { name: "정지", exact: true }).click();
                // 전체/이어읽기를 마친 후에도 다음 합성이 새로 시작하지 않으며 두 언어의 키 예산을 지킨다.
                const stoppedCalls = (await speechCalls(traces)).length;
                await page.waitForTimeout(1500);
                expect((await speechCalls(traces)).length).toBe(stoppedCalls);
                expect(stoppedCalls - before).toBeLessThanOrEqual(plan.maximumUniqueColdCalls / 2);
                await Promise.allSettled(audioResponseCaptures);
                expect(audioResponses.length).toBeGreaterThan(0);
                expect(audioContractErrors).toEqual([]);
                evidence.pauseStopNavigateProviderDelta = 0;
                evidence.logoutPath = "Actual user menu→NextAuth CSRF/signout POST→redirect→synthetic local cookie removed; same gateway actor restored for remaining cache checks";
                evidence.outcome = "SUCCEEDED";
            } catch (error) {
                evidence.outcome = "FAILED";
                evidence.errorType = error instanceof Error ? error.name : "Unknown";
                throw error;
            } finally {
                // 실패한 음성 표본도 실제 시도와 요청 범위를 남긴다. UI assertion 실패가 비용 기록을 지우지 않는다.
                evidence.requestedParts = requests;
                await Promise.allSettled(audioResponseCaptures);
                evidence.audioResponses = audioResponses;
                evidence.audioContractErrors = audioContractErrors;
                evidence.traceIds = traces;
                if (traces.length) {
                    evidence.providerCalls = await speechCalls(traces).catch(() => null);
                }
                fs.writeFileSync(path.join(artifactRoot, `audio-${language}.json`), JSON.stringify(evidence, null, 2));
            }
        });
    }
});
