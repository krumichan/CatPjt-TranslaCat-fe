import fs from "node:fs";
import { test, expect, installMockAuthCookie } from "../fixtures/mock-test";
import { fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";
import { installNativeMediaObserver, nativeMediaObservation, nativeClickToPlaying } from "../support/novel-media-observer";

const wavPath = process.env.NOVEL_TEST_WAV ?? "C:/workspace/project-cat/.codex-workspace/verification/shared/novel-20261004/ai/openai-speech-ko.wav";
function wavFixture() {
    if (fs.existsSync(wavPath)) return fs.readFileSync(wavPath).toString("base64");
    // 일반 CI는 유료 API 없이 4.55초 PCM fixture를 사용한다. 실제 provider 검증은 live suite가 담당한다.
    const pcm = Buffer.alloc(44 + 145600);
    pcm.write("RIFF", 0); pcm.writeUInt32LE(pcm.length - 8, 4); pcm.write("WAVEfmt ", 8);
    pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
    pcm.writeUInt32LE(16000, 24); pcm.writeUInt32LE(32000, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
    pcm.write("data", 36); pcm.writeUInt32LE(pcm.length - 44, 40);
    return pcm.toString("base64");
}
const sentence = (id: string, order: number, done = true) => ({ id, order, paragraphId: `p${order}`, paragraphIndex: order, startOffset: 0, endOffset: 3, rawJa: "猫だ。", plainJa: "猫だ。", ko: done ? "고양이다." : null, status: done ? "SUCCEEDED" : "PENDING", errorCode: null });
const snapshot = (done = true) => ({ revision: "revision1", segmentationVersion: "v1", title: { rawJa: "猫の一日", ja: "猫の一日", ko: null }, pagerInfo: { prevIdentifier: "1", nextIdentifier: "3", listIdentifier: "n-test" }, segments: [sentence("one", 0, done), sentence("two", 1, done)], totalSegments: 2, completedSegments: done ? 2 : 0, state: done ? "SUCCEEDED" : "SOURCE_READY", jobId: done ? "job1" : null, eventSequence: done ? 2 : 0, durableComplete: done });

test.beforeEach(async ({ page, context }) => {
    await installMockAuthCookie(context, "ADMIN");
    await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
    await mockIdleWebSocket(page);
});

test("NOVEL-READER-01 partial updates preserve source and only record full completion after every sentence", async ({ page }) => {
    // 준비: 원문은 즉시, 번역은 검증된 첫 문장과 전체 완료를 서로 다른 응답으로 반환한다.
    await page.addInitScript(() => localStorage.setItem("reader_font_size", "not-a-number"));
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(snapshot(false))));
    await page.route("**/episodes/2/translations", route => fulfillJson(route, responseDto({ ...snapshot(false), jobId: "job1", state: "RUNNING", eventSequence: 1 })));
    let polls = 0;
    await page.route("**/episodes/2/translations/job1", async route => {
        polls++;
        await fulfillJson(route, responseDto(polls === 1 ? { ...snapshot(false), segments: [sentence("one", 0), sentence("two", 1, false)], completedSegments: 1, state: "RUNNING", jobId: "job1", eventSequence: 2 } : { ...snapshot(), eventSequence: 3 }));
    });
    // 실행
    await page.goto("/novel/syosyetu/novels/n-test/episode/2");
    await expect(page.getByTestId("novel-sentence")).toHaveCount(2);
    await expect(page.locator("article")).toHaveCSS("font-size", "18px");
    await page.getByRole("button", { name: "전체 번역 시작", exact: true }).click();
    // 검증: 부분 표시에서 전체 완료 타이머가 기록되면 실패한다.
    const state = page.getByTestId("novel-translation-state");
    await expect(state).toContainText("1/2");
    await expect(state).not.toHaveAttribute("data-all-translations-ms");
    await expect(state).toHaveAttribute("data-state", "SUCCEEDED");
    await expect(state).toHaveAttribute("data-all-translations-ms", /\d/);
    const times = await state.evaluate(el => ({ first: Number(el.getAttribute("data-first-translation-ms")), all: Number(el.getAttribute("data-all-translations-ms")) }));
    expect(times.all).toBeGreaterThan(times.first);
    await expect(page.getByTestId("novel-sentence").first()).toHaveAttribute("data-segment-id", "one");
});

test("NOVEL-READER-02 WAV decodes in Chromium, single/from/full share one player and keyboard menu", async ({ page }, testInfo) => {
    // 준비: 실제 생성 WAV를 mock 전송한다. API 통합 결과로 해석하지 않는다.
    const wav = wavFixture();
    const calls: string[] = [];
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(snapshot())));
    await page.route("**/episodes/2/audio", route => {
        const request = route.request().postDataJSON();
        calls.push(request.segmentId);
        return fulfillJson(route, responseDto({ ...request, partCount: 1, audioBase64: wav, contentType: "audio/wav", provider: "openai", model: "gpt-4o-mini-tts", durationSeconds: 4.55 }));
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/novel/syosyetu/novels/n-test/episode/2");
    const first = page.getByTestId("novel-sentence").first();
    // 실행 / 검증: Enter/Escape, 실제 media event 기반 강조 및 일시정지.
    const trigger = first.getByRole("button", { name: /문장 메뉴/ });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(first.getByRole("group")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await page.getByRole("button", { name: "현재 회차 전체 읽기", exact: true }).click();
    await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "playing");
    await expect(first).toHaveAttribute("data-active", "true");
    await page.getByRole("button", { name: "일시정지", exact: true }).click();
    await expect(first).toHaveAttribute("data-active", "false");
    await page.getByRole("button", { name: "재개", exact: true }).click();
    await page.getByLabel("낭독 속도").selectOption("2");
    await trigger.click();
    await first.getByRole("button", { name: "한국어 번역: 이 문장 읽기", exact: true }).click();
    await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "ended", { timeout: 12000 });
    expect(calls).toEqual(["one"]);
    const last = page.getByTestId("novel-sentence").last();
    await last.getByRole("button", { name: /문장 메뉴/ }).click();
    await last.getByRole("button", { name: "여기부터 읽기", exact: true }).click();
    await expect(last).toHaveAttribute("data-active", "true");
    await page.getByRole("button", { name: "정지", exact: true }).click();
    await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "idle");
    expect(calls.at(-1)).toBe("two");
    await page.screenshot({ path: testInfo.outputPath("reader-mobile.png"), fullPage: true });
});

test("NOVEL-READER-03 stale revisions fail closed and Japanese fallback is labelled", async ({ page }) => {
    // 준비
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(snapshot(false))));
    await page.route("**/episodes/2/translations", route => fulfillJson(route, responseDto({ ...snapshot(), revision: "old" })));
    // 실행
    await page.goto("/novel/syosyetu/novels/n-test/episode/2");
    await expect(page.getByRole("button", { name: "현재 회차 전체 읽기", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "전체 번역 시작", exact: true }).click();
    // 검증
    await expect(page.getByRole("alert").filter({ hasText: "번역 상태" })).toBeVisible();
    await expect(page.getByText("원문 · 번역 대기")).toHaveCount(2);
    await expect(page.getByTestId("novel-translation-state")).not.toHaveAttribute("data-all-translations-ms");
});

test("NOVEL-READER-04 reenter running job polls without another paid POST and preserves safe ruby", async ({ page }) => {
    // 준비: 새로고침 전에 다른 탭에서 시작한 작업을 조회한다.
    const initial = { ...snapshot(false), state: "RUNNING", jobId: "job1", eventSequence: 1 };
    const source = { ...initial.segments[0], rubyTokens: [{ startOffset: 0, endOffset: 1, text: "猫", reading: "ねこ" }] };
    let posts = 0;
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto({ ...initial, segments: [source, initial.segments[1]] })));
    await page.route("**/episodes/2/translations", route => { posts++; return fulfillJson(route, responseDto(snapshot())); });
    await page.route("**/episodes/2/translations/job1", async route => {
        await new Promise(resolve => setTimeout(resolve, 700));
        return fulfillJson(route, responseDto({ ...snapshot(), segments: [{ ...snapshot().segments[0], rubyTokens: source.rubyTokens }, snapshot().segments[1]] }));
    });
    // 실행 / 검증
    await page.goto("/novel/syosyetu/novels/n-test/episode/2");
    await expect(page.locator("ruby rt")).toHaveText("ねこ");
    await expect(page.getByTestId("novel-translation-state")).toHaveAttribute("data-state", "SUCCEEDED");
    expect(posts).toBe(0);
});

test("NOVEL-READER-05 entering, menu, selection, scroll and display toggles never request audio", async ({ page }) => {
    // 준비
    let calls = 0;
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(snapshot())));
    await page.route("**/episodes/2/audio", route => { calls++; return route.abort(); });
    await page.goto("/novel/syosyetu/novels/n-test/episode/2");
    const first = page.getByTestId("novel-sentence").first();
    // 실행: 재생 의사가 없는 모든 읽기 동작이다.
    await first.getByRole("button", { name: /문장 메뉴/ }).click();
    await page.keyboard.press("Escape");
    await first.locator("p").first().selectText();
    await page.mouse.wheel(0, 400);
    await page.getByLabel("보기").selectOption("parallel");
    await page.getByLabel("낭독 언어").selectOption("ja");
    await page.getByLabel("낭독 속도").selectOption("1.5");
    // 검증: API 호출0은 mock 회귀이며 실제 과금0은 live ledger로 별도 판정한다.
    expect(calls).toBe(0);
});

test("NOVEL-READER-06 duplicate click shares pending audio and pause fences delayed playback", async ({ page }) => {
    // 준비: 취소를 무시하고 늦게 응답하는 서버를 재현한다.
    let calls = 0;
    let deliver: (() => void) | undefined;
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(snapshot())));
    await page.route("**/episodes/2/audio", async route => {
        calls++;
        const request = route.request().postDataJSON();
        await new Promise<void>(resolve => { deliver = resolve; });
        await fulfillJson(route, responseDto({ ...request, partCount: 1, audioBase64: wavFixture(), contentType: "audio/wav", provider: "openai" })).catch(() => undefined);
    });
    await page.goto("/novel/syosyetu/novels/n-test/episode/2");
    const state = page.getByTestId("novel-playback-state");
    // 실행 / 검증: 준비 중 취소를 제공하고 늦은 응답은 재생을 시작하지 않는다.
    await page.getByRole("button", { name: "현재 회차 전체 읽기", exact: true }).dblclick();
    await expect(state).toHaveAttribute("data-state", "loading");
    await expect.poll(() => calls).toBe(1);
    await page.getByRole("button", { name: "일시정지", exact: true }).click();
    deliver?.();
    await expect(state).toHaveAttribute("data-state", "paused");
    await page.getByRole("button", { name: "정지", exact: true }).click();
    await expect(state).toHaveAttribute("data-state", "idle");
    expect(calls).toBe(1);
});

test("NOVEL-READER-07 language change and logout stop the player without synthesizing later sentences", async ({ page }) => {
    // 준비
    let calls = 0;
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(snapshot())));
    await page.route("**/episodes/2/audio", route => {
        calls++;
        return fulfillJson(route, responseDto({ ...route.request().postDataJSON(), partCount: 1, audioBase64: wavFixture(), contentType: "audio/wav", provider: "openai" }));
    });
    await page.goto("/novel/syosyetu/novels/n-test/episode/2");
    const state = page.getByTestId("novel-playback-state");
    // 실행 / 검증: 언어 선택은 정지이며 다른 언어의 합성 의사가 아니다.
    await page.getByRole("button", { name: "현재 회차 전체 읽기", exact: true }).click();
    await expect(state).toHaveAttribute("data-state", "playing");
    await page.getByLabel("낭독 언어").selectOption("ja");
    await expect(state).toHaveAttribute("data-state", "idle");
    expect(calls).toBe(1);
    await page.getByRole("button", { name: "현재 회차 전체 읽기", exact: true }).click();
    await expect(state).toHaveAttribute("data-state", "playing");
    // 합성 인증 세션의 logout을 전달한다. 실제 사용자 세션은 사용하지 않는다.
    await page.route("**/api/auth/session", route => fulfillJson(route, {}));
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(page.locator('[data-testid="novel-playback-state"][data-state="playing"]')).toHaveCount(0);
    await page.waitForTimeout(700);
    expect(calls).toBe(2);
});

test("NOVEL-READER-10 real logout UI clears only the local synthetic session during native playback", async ({ page, context }) => {
    // 준비: 음성 전송만 mock이며 HTMLAudioElement와 NextAuth 로그아웃은 로컬 실제 경로다.
    let calls = 0;
    await installNativeMediaObserver(page);
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(snapshot())));
    await page.route("**/episodes/2/audio", route => {
        calls++;
        return fulfillJson(route, responseDto({ ...route.request().postDataJSON(), partCount: 1, audioBase64: wavFixture(), contentType: "audio/wav", provider: "openai" }));
    });
    await page.goto("/novel/syosyetu/novels/n-test/episode/2");
    expect(await page.evaluate(() => new Audio() instanceof HTMLAudioElement && Function.prototype.toString.call(Audio).includes("[native code]"))).toBe(true);
    await page.getByRole("button", { name: "현재 회차 전체 읽기", exact: true }).click();
    await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "playing");
    const nativeTiming = nativeClickToPlaying(null, await nativeMediaObservation(page));
    expect(nativeTiming.clickToPlayingMs).toBeGreaterThanOrEqual(0);
    expect(nativeTiming.readClickCount).toBe(1);

    // 실행: 계정 store/event를 주입하지 않고 실제 메뉴와 NextAuth signout을 거친다.
    await page.unroute("**/api/auth/session");
    await page.route("**/api/auth/signout", async route => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        await route.continue();
    });
    const signout = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/signout" && response.request().method() === "POST");
    const signoutRequested = page.waitForRequest(request => new URL(request.url()).pathname === "/api/auth/signout" && request.method() === "POST");
    await page.getByTestId("user-menu-toggle").click();
    await page.getByRole("menuitem", { name: "로그아웃", exact: true }).click();
    await signoutRequested;
    const callsAtLogoutRequest = calls;

    // 검증: redirect/unmount와 session cookie 제거를 모두 확인한다. 실제 사용자 계정은 사용하지 않는다.
    expect((await signout).status()).toBe(200);
    await expect(page).not.toHaveURL(/\/episode\/2/);
    expect((await context.cookies()).filter(cookie => cookie.name.includes("next-auth.session-token"))).toHaveLength(0);
    await expect(page.locator('[data-testid="novel-playback-state"][data-state="playing"]')).toHaveCount(0);
    await page.waitForTimeout(700);
    expect(callsAtLogoutRequest).toBe(1);
    expect(calls).toBe(callsAtLogoutRequest);
});

test("NOVEL-READER-11 reader next action stops synthesis before a delayed route completes", async ({ page }) => {
    // 준비: 다음 회차의 네트워크만 지연시켜 이전 화면이 남는 실제 router 전환을 확인한다.
    await page.setViewportSize({ width: 1280, height: 1200 });
    let calls = 0;
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(snapshot())));
    await page.route("**/episodes/2/audio", route => {
        calls++;
        return fulfillJson(route, responseDto({ ...route.request().postDataJSON(), partCount: 1, audioBase64: wavFixture(), contentType: "audio/wav", provider: "openai" }));
    });
    await page.route("**/novel/syosyetu/novels/n-test/episode/3**", async route => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        await route.abort();
    });
    await page.goto("/novel/syosyetu/novels/n-test/episode/2");
    await page.getByRole("button", { name: "현재 회차 전체 읽기", exact: true }).click();
    await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "playing");

    // 실행 / 검증: navigation이 실패하더라도 명시적으로 떠나려던 순간 재생 의사는 취소돼야 한다.
    await page.getByRole("button", { name: "NEXT →", exact: true }).click();
    await page.waitForTimeout(2200);
    expect(calls).toBe(1);
    await expect(page.locator('[data-testid="novel-playback-state"][data-state="playing"]')).toHaveCount(0);
});

for (const destination of ["locale", "anchor"] as const) {
    test(`NOVEL-READER-12 ${destination} intent stops synthesis before delayed navigation`, async ({ page }) => {
        // 준비: native 재생은 유지하고 이동 대상의 로컬 라우터 응답만 지연한다.
        let calls = 0;
        await page.setViewportSize({ width: 1280, height: 1200 });
        await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(snapshot())));
        await page.route("**/episodes/2/audio", route => {
            calls++;
            return fulfillJson(route, responseDto({ ...route.request().postDataJSON(), partCount: 1, audioBase64: wavFixture(), contentType: "audio/wav", provider: "openai" }));
        });
        await page.route(url => destination === "locale" ? url.pathname.startsWith("/ja/novel/") : url.pathname === "/ko", async route => {
            await new Promise(resolve => setTimeout(resolve, 3000));
            await route.abort();
        });
        await page.goto("/novel/syosyetu/novels/n-test/episode/2");
        await page.getByRole("button", { name: "현재 회차 전체 읽기", exact: true }).click();
        await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "playing");

        // 실행: 실제 공통 언어 메뉴 또는 같은 탭 anchor를 사용한다. 이벤트를 주입하지 않는다.
        if (destination === "locale") {
            await page.getByRole("button", { name: "Language", exact: true }).click();
            await page.getByRole("menuitem", { name: "🇯🇵", exact: true }).click();
        } else {
            await page.getByRole("link", { name: "TranslaCat", exact: true }).click();
        }

        // 검증: unmount가 늦어도 다음 문장 합성은 시작하지 않는다.
        await page.waitForTimeout(2200);
        expect(calls).toBe(1);
        await expect(page.locator('[data-testid="novel-playback-state"][data-state="playing"]')).toHaveCount(0);
    });
}

test("NOVEL-READER-08 identical polls retain one rendered publication per event sequence", async ({ page }) => {
    // 준비: 같은본문/상태의 진단값만 변하는 두 응답은 조회하되 화면을 다시 적용하지 않는다.
    const running = { ...snapshot(false), state: "RUNNING", jobId: "job1", eventSequence: 1 };
    let polls = 0;
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(snapshot(false))));
    await page.route("**/episodes/2/translations", route => fulfillJson(route, responseDto(running)));
    await page.route("**/episodes/2/translations/job1", route => {
        polls++;
        return fulfillJson(route, responseDto(polls < 3 ? { ...running, execution: { jobElapsedMs: polls * 600 } } : { ...snapshot(), eventSequence: 2 }));
    });
    // 실행
    await page.goto("/novel/syosyetu/novels/n-test/episode/2");
    await page.getByRole("button", { name: "전체 번역 시작", exact: true }).click();
    const status = page.getByTestId("novel-translation-state");
    await expect(status).toHaveAttribute("data-all-translations-ms", /\d/);
    // 검증: 실제 polling은3회이며, DOM 적용/paint는 seq1과seq2 각각1회다.
    const spans = JSON.parse((await status.getAttribute("data-reader-metrics"))!).renderSpans;
    expect(polls).toBe(3);
    expect(spans.map((item: { eventSequence: number }) => item.eventSequence)).toEqual([1, 2]);
});

test("NOVEL-READER-09 changing from single to full reading shares the pending first part", async ({ page }) => {
    // 준비: 서버 응답이 늦어도 같은 첫 문장을 다시 요청하지 않는다.
    let calls = 0;
    let deliver: (() => void) | undefined;
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(snapshot())));
    await page.route("**/episodes/2/audio", async route => {
        calls++;
        const request = route.request().postDataJSON();
        await new Promise<void>(resolve => { deliver = resolve; });
        await fulfillJson(route, responseDto({ ...request, partCount: 1, audioBase64: wavFixture(), contentType: "audio/wav", provider: "openai" }));
    });
    await page.goto("/novel/syosyetu/novels/n-test/episode/2");
    const first = page.getByTestId("novel-sentence").first();

    // 실행: 첫 문장의 단일 읽기에서 전체 큐로 의사를 변경한다.
    await first.getByRole("button", { name: /문장 메뉴/ }).click();
    await first.getByRole("button", { name: "한국어 번역: 이 문장 읽기", exact: true }).click();
    await expect.poll(() => calls).toBe(1);
    await page.getByRole("button", { name: "현재 회차 전체 읽기", exact: true }).click();
    deliver?.();

    // 검증: 늦은 옛 큐가 재생되지 않으며 새 큐의 첫 음성은 동일 요청을 소비한다.
    await expect(first).toHaveAttribute("data-active", "true");
    expect(calls).toBe(1);
    await page.getByRole("button", { name: "정지", exact: true }).click();
    await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "idle");
});
