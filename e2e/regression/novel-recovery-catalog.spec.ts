import { test, expect, installMockAuthCookie } from "../fixtures/mock-test";
import { fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const unit = (value: string) => ({ rawJa: value, ja: value, ko: `${value} 번역` });
const card = (rank: number, arrival: number) => ({ itemId: `i${rank}`, identifier: `n${rank}`, rank, sourcePosition: rank - 1, status: "READY", title: unit(`題${rank}`), author: unit("作家"), synopsis: unit("夜空を見る物語。"), statusText: unit("完結"), genreText: "", isShortStory: false, arrivalSequence: arrival, errorCode: null as string | null, cached: arrival === 0 });
const selector = { kind: "RANKING", period: "daily", genreId: "all", keyword: "", page: 1, language: "ko" };
const catalog = (items: ReturnType<typeof card>[], selected = selector, snapshotId = "list1") => ({ snapshotId, eventSequence: items.length, state: items.length === 50 ? "SUCCEEDED" : "RUNNING", total: 50, ready: items.filter(i => i.status === "READY").length, failed: items.filter(i => i.status === "FAILED").length, pageInfo: null, selector: selected, items });
const source = (size = 100) => ({ revision: "repair-source", segmentationVersion: "v1", title: unit("本文"), pagerInfo: null,
    segments: Array.from({ length: size }, (_, order) => ({ id: `s${order}`, order, paragraphId: `p${order}`, paragraphIndex: order, startOffset: 0, endOffset: 5, rawJa: "猫が眠る。", plainJa: "猫が眠る。", ko: order === 1 ? null : `고양이가 잔다 ${order}.`, status: order === 1 ? "FAILED" : "SUCCEEDED", errorCode: order === 1 ? "PROVIDER_TIMEOUT" : null })),
    totalSegments: size, completedSegments: size - 1, state: "PARTIAL", jobId: "job1", eventSequence: 5, durableComplete: false });

test.beforeEach(async ({ page, context }) => {
    await installMockAuthCookie(context, "ADMIN");
    await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
    await mockIdleWebSocket(page);
    await page.route("**/ranking/periods", route => fulfillJson(route, responseDto([{ code: "daily", label: "매일" }])));
});

test("NOVEL-CATALOG-ERROR-01 rejected genre request stops loading and can reconnect", async ({ page }) => {
    // 준비: 사용자가 보고한 기존 _201 장르 주소와 API 오류를 재현한다.
    let rejected = true;
    await page.route("**/novels/catalog", route => {
        const body = route.request().postDataJSON();
        expect(body.genreId).toBe("_201");
        if (rejected) return route.fulfill({ status: 400, contentType: "application/json",
            body: JSON.stringify(responseDto({ code: "NOVEL_REQUEST_INVALID", retryable: false })) });
        return fulfillJson(route, responseDto(catalog(Array.from({ length: 50 }, (_, index) => card(index + 1, index)), body)));
    });
    await page.route("**/novels/catalog/*/cancel", route => fulfillJson(route, responseDto({})));

    // 실행 / 검증: 오류가 난 작업을 계속 로딩 중이라고 표시하지 않는다.
    await page.goto("/novel/syosetu/genres/_201?period=daily");
    await expect(page.getByRole("alert").filter({ hasText: "NOVEL_REQUEST_INVALID" })).toBeVisible();
    await expect(page.getByText("원본 목록을 가져오는 중", { exact: true })).toHaveCount(0);

    // 실행 / 검증: 명시 재연결로 정상 목록을 받고 기존 장르 selector를 유지한다.
    rejected = false;
    await page.getByRole("button", { name: "상태 다시 확인", exact: true }).click();
    await expect(page.getByTestId("novel-catalog-card")).toHaveCount(50);
    await expect(page.getByRole("alert").filter({ hasText: "NOVEL_REQUEST_INVALID" })).toHaveCount(0);
});

test("NOVEL-CATALOG-PERIOD-01 legacy period API uses canonical platform for alias and switches period", async ({ page }) => {
    const periodPaths: string[] = [];
    let starts = 0;
    await page.route("**/ranking/periods", route => {
        const pathname = new URL(route.request().url()).pathname;
        periodPaths.push(pathname);
        if (pathname.includes("/syosyetu/")) return route.fulfill({ status: 400, contentType: "application/json", body: "{}" });
        return fulfillJson(route, responseDto([{ code: "DAILY", label: "매일" }, { code: "WEEKLY", label: "매주" }]));
    });
    await page.route("**/novels/catalog", route => {
        starts++;
        return fulfillJson(route, responseDto(catalog(Array.from({ length: 50 }, (_, index) => card(index + 1, index)), route.request().postDataJSON())));
    });
    await page.route("**/novels/catalog/*/cancel", route => fulfillJson(route, responseDto({})));
    await page.goto("/novel/syosyetu/genres/all?period=daily&page=1");
    await expect(page.getByTestId("novel-catalog-card")).toHaveCount(50);
    await expect(page.getByRole("button", { name: "매주", exact: true })).toBeVisible();
    expect(periodPaths).toEqual(["/api/v1/syosetu/ranking/periods"]);
    await page.getByRole("button", { name: "매주", exact: true }).click();
    await expect(page).toHaveURL(/period=weekly/);
    await expect.poll(() => starts).toBe(2);
});

for (const unavailable of ["error", "empty"] as const) {
    test(`NOVEL-CATALOG-PERIOD-02 ${unavailable} periods show bounded error and retry without restarting cards`, async ({ page }) => {
        let ready = false, starts = 0;
        await page.route("**/ranking/periods", route => {
            if (ready) return fulfillJson(route, responseDto([{ code: "DAILY", label: "매일" }]));
            return unavailable === "empty" ? fulfillJson(route, responseDto([]))
                : route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
        });
        await page.route("**/novels/catalog", route => { starts++; return fulfillJson(route, responseDto(catalog(Array.from({ length: 50 }, (_, i) => card(i + 1, i))))); });
        await page.route("**/novels/catalog/*/cancel", route => fulfillJson(route, responseDto({})));
        await page.goto("/novel/syosyetu/genres/all?period=daily&page=1");
        await expect(page.getByTestId("novel-catalog-card")).toHaveCount(50);
        const periodError = page.getByRole("alert").filter({ hasText: "기간을 불러오지 못했습니다" });
        await expect(periodError).toBeVisible();
        ready = true;
        await page.getByRole("button", { name: "기간 다시 불러오기", exact: true }).click();
        await expect(page.getByRole("button", { name: "매일", exact: true })).toBeVisible();
        await expect(periodError).toHaveCount(0);
        expect(starts).toBe(1);
    });
}

test("NOVEL-CATALOG-01 50카드의 준비 순 append, 원rank·focus·스크롤·음성0", async ({ page }) => {
    // 준비: 첫4개의 완성 순서는 실제 rank와 다르며 나머지46개는 아직 대기한다.
    const order = [1, 7, 15, 3, ...Array.from({ length: 50 }, (_, i) => i + 1).filter(rank => ![1, 7, 15, 3].includes(rank))];
    let count = 1, posts = 0, audio = 0;
    const snapshot = () => catalog(order.slice(0, count).map(card));
    await page.route("**/novels/catalog", route => { posts++; return fulfillJson(route, responseDto(snapshot())); });
    await page.route("**/novels/catalog/list1", route => fulfillJson(route, responseDto(snapshot())));
    await page.route("**/novels/catalog/list1/cancel", route => fulfillJson(route, responseDto({})));
    await page.route("**/audio", route => { audio++; return route.abort(); });
    await page.goto("/novel/syosyetu/genres/all?period=daily&page=1");
    const cards = page.getByTestId("novel-catalog-card");
    await expect(cards).toHaveCount(1);
    await expect(page.getByTestId("novel-catalog-state")).toBeHidden();
    await expect(page.getByText(/준비 \d+ · 실패 \d+ · 확보한 전체/)).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "표시 순서", exact: true })).toBeVisible();
    await cards.first().getByRole("link").focus();
    count = 4;
    // 실행 / 검증: 전부50준비 이전에도1,7,15,3이 보이며 현재 링크의 DOM과 focus가 유지된다.
    await expect(cards).toHaveCount(4);
    expect(await cards.evaluateAll(elements => elements.map(el => el.getAttribute("data-rank")))).toEqual(["1", "7", "15", "3"]);
    await expect(cards.first().getByRole("link")).toBeFocused();
    await page.evaluate(() => window.scrollTo(0, 300));
    const scroll = await page.evaluate(() => window.scrollY);
    count = 50;
    await expect(cards).toHaveCount(50);
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
    const sort = page.getByRole("combobox", { name: "표시 순서", exact: true });
    await sort.focus();
    await expect(sort).toBeFocused();
    await sort.selectOption("source");
    await expect(cards.nth(2)).toHaveAttribute("data-rank", "3");
    expect(posts).toBe(1); expect(audio).toBe(0);
});

test("NOVEL-CATALOG-02 failed card retry keeps prior ready card and arrival position", async ({ page }) => {
    // 준비: 준비된 캐시와 원문만 보이는 실패 카드가 같은 snapshot에 있다.
    let retried = false, retries = 0;
    const snapshot = () => {
        const failed = { ...card(3, 1), status: retried ? "READY" : "FAILED", errorCode: retried ? null : "PROVIDER_TIMEOUT" };
        return { ...catalog([card(7, 0), failed]), state: "PARTIAL", eventSequence: retried ? 3 : 2 };
    };
    await page.route("**/novels/catalog", route => fulfillJson(route, responseDto(snapshot())));
    await page.route("**/novels/catalog/list1", route => fulfillJson(route, responseDto(snapshot())));
    await page.route("**/novels/catalog/list1/items/n3/retry", route => { retries++; retried = true; return fulfillJson(route, responseDto(snapshot())); });
    await page.route("**/novels/catalog/list1/cancel", route => fulfillJson(route, responseDto({})));
    await page.goto("/novel/syosyetu/genres/all?period=daily&page=1");
    const cards = page.getByTestId("novel-catalog-card");
    await expect(cards).toHaveCount(2);
    await cards.nth(1).getByRole("button", { name: "이 작품 다시 번역" }).dblclick();
    // 검증: 명령 연타는 하나이며 이미 준비된 카드와 rank는 그대로다.
    await expect(cards.nth(1)).toHaveAttribute("data-status", "READY");
    await expect(cards.nth(1).getByRole("button", { name: "준비 완료", exact: true })).toBeFocused();
    expect(await cards.evaluateAll(elements => elements.map(el => el.getAttribute("data-rank")))).toEqual(["7", "3"]);
    expect(retries).toBe(1);
});

test("NOVEL-CATALOG-03 search generation rejects late old-list response and retains query/page", async ({ page }) => {
    // 준비: old 검색의 진행 조회를 늦게 보내는 실제 SPA 경쟁을 재현한다.
    let release: (() => void) | undefined;
    const search = (keyword: string) => ({ ...selector, kind: "SEARCH", period: "", genreId: "", keyword });
    await page.route("**/novels/catalog", route => {
        const body = route.request().postDataJSON();
        return fulfillJson(route, responseDto(catalog([card(body.keyword === "old" ? 1 : 7, 0)], search(body.keyword), body.keyword)));
    });
    await page.route("**/novels/catalog/old", async route => {
        await new Promise<void>(resolve => { release = resolve; });
        await fulfillJson(route, responseDto(catalog([card(1, 0), card(3, 1)], search("old"), "old"))).catch(() => undefined);
    });
    await page.route("**/novels/catalog/new", route => fulfillJson(route, responseDto(catalog([card(7, 0)], search("new"), "new"))));
    await page.route("**/novels/catalog/*/cancel", route => fulfillJson(route, responseDto({})));
    await page.goto("/novel/syosyetu/search/novels?keyword=old&page=1");
    await expect(page.getByTestId("novel-catalog-card")).toHaveAttribute("data-identifier", "n1");
    await expect.poll(() => !!release).toBe(true);
    await page.getByRole("textbox").fill("new");
    await page.getByRole("button", { name: "검색", exact: true }).click();
    await expect(page.getByTestId("novel-catalog-card")).toHaveAttribute("data-identifier", "n7");
    release?.();
    await page.waitForTimeout(800);
    await expect(page.getByTestId("novel-catalog-card")).toHaveCount(1);
    await expect(page).toHaveURL(/keyword=new.*page=1/);
});

test("NOVEL-REPAIR-01 repair one gap preserves other99, focus and measures commit plus DOM", async ({ page }) => {
    // 준비: 후반98문장은 저장돼 있고 두번째 문장 하나만 확정 실패다.
    const initial = source();
    let trace = "", repaired = false, posts = 0;
    const recovery = () => ({ repairId: "repair1", state: repaired ? "SUCCEEDED" : "RUNNING", targetIds: ["s1"], committedIds: repaired ? ["s1"] : [], errorCode: null, traceId: trace });
    const value = () => ({ ...initial, recovery: recovery(), eventSequence: repaired ? 7 : 6, state: repaired ? "SUCCEEDED" : "RUNNING", durableComplete: repaired, completedSegments: repaired ? 100 : 99,
        segments: initial.segments.map(item => repaired && item.id === "s1" ? { ...item, status: "SUCCEEDED", errorCode: null, ko: "고양이가 잔다 1." } : item) });
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(initial)));
    await page.route("**/episodes/2/translations/job1/repair", route => {
        posts++; trace = route.request().headers()["x-novel-trace-id"];
        expect(route.request().postDataJSON().segmentId).toBe("s1");
        return fulfillJson(route, responseDto(value()));
    });
    await page.route("**/episodes/2/translations/job1", route => fulfillJson(route, responseDto(value())));
    await page.goto("/novel/syosyetu/novels/n-test/episode/2");
    const sentences = page.getByTestId("novel-sentence");
    await expect(sentences).toHaveCount(100);
    const stableBefore = await sentences.evaluateAll(nodes => nodes.filter(el => el.getAttribute("data-segment-id") !== "s1").map(el => el.textContent));
    const target = sentences.nth(1);
    await target.getByRole("button", { name: "이 문장 다시 번역", exact: true }).dblclick();
    await expect(page.getByTestId("novel-repair-state")).toContainText("복구 중");
    repaired = true;
    await expect(target).toHaveAttribute("data-status", "SUCCEEDED");
    await expect(page.getByTestId("novel-repair-state")).toHaveAttribute("data-state", "SUCCEEDED");
    // 검증: 동일trace commit 관측과 DOM paint 이후의 완료만 기록하며 정상99개는 불변이다.
    const metrics = JSON.parse((await page.getByTestId("novel-repair-state").getAttribute("data-repair-metrics"))!);
    expect(metrics.traceId).toBe(trace); expect(metrics.repairReadyMs).toBeGreaterThanOrEqual(metrics.committedObservedMs);
    expect(metrics.targetIds).toEqual(["s1"]); expect(posts).toBe(1);
    expect(await sentences.evaluateAll(nodes => nodes.filter(el => el.getAttribute("data-segment-id") !== "s1").map(el => el.textContent))).toEqual(stableBefore);
    await expect(target.getByRole("button", { name: "복구 저장 완료", exact: true })).toBeFocused();
});

for (const interrupt of ["none", "pause", "stop"] as const) {
    test(`NOVEL-REPAIR-TTS ${interrupt} gap waits without translation and resumes only with valid intent`, async ({ page }) => {
        // 준비: 무료 PCM 전송 fixture이며 브라우저의 실제 HTMLAudioElement를 재생한다.
        const pcm = Buffer.alloc(44 + 32000);
        pcm.write("RIFF"); pcm.writeUInt32LE(pcm.length - 8, 4); pcm.write("WAVEfmt ", 8); pcm.writeUInt32LE(16, 16);
        pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(16000, 24); pcm.writeUInt32LE(32000, 28);
        pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write("data", 36); pcm.writeUInt32LE(32000, 40);
        const initial = source(3);
        let repairs = 0;
        const calls: string[] = [];
        await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(initial)));
        await page.route("**/episodes/2/translations/job1/repair", route => {
            repairs++;
            return fulfillJson(route, responseDto({ ...initial, state: "SUCCEEDED", durableComplete: true, completedSegments: 3, eventSequence: 7,
                segments: initial.segments.map(item => ({ ...item, status: "SUCCEEDED", errorCode: null, ko: `고양이가 잔다 ${item.order}.` })),
                recovery: { repairId: "repair1", state: "SUCCEEDED", targetIds: ["s1"], committedIds: ["s1"], errorCode: null, traceId: route.request().headers()["x-novel-trace-id"] } }));
        });
        await page.route("**/episodes/2/audio", route => {
            const request = route.request().postDataJSON(); calls.push(request.segmentId);
            return fulfillJson(route, responseDto({ ...request, partCount: 1, audioBase64: pcm.toString("base64"), contentType: "audio/wav", provider: "openai" }));
        });
        await page.goto("/novel/syosyetu/novels/n-test/episode/2");
        const gap = page.getByTestId("novel-sentence").nth(1);
        // 전체 읽기만 제공한다. 앞의 확정 문장을 읽고 실패 문장 앞에서 기다려야 한다.
        await page.getByRole("button", { name: "OPEN", exact: true }).click();
        await page.getByRole("button", { name: "번역문 전체 읽기", exact: true }).click();
        const state = page.getByTestId("novel-playback-state");
        await expect(state).toHaveAttribute("data-state", "waiting");
        expect(repairs).toBe(0); expect(calls).toEqual(["s0"]);

        // 실행: 음성 재생과 별개의 명시 복구 명령만 보낸다.
        if (interrupt !== "none") await page.getByRole("button", { name: interrupt === "pause" ? "일시정지" : "정지", exact: true }).click();
        // OPEN 팝오버를 닫아 본문 복구 버튼을 가리지 않게 한 뒤 명시 복구한다.
        await page.getByRole("button", { name: "CLOSE", exact: true }).click();
        await gap.getByRole("button", { name: "이 문장 다시 번역", exact: true }).click();
        await expect(gap).toHaveAttribute("data-status", "SUCCEEDED");

        // 검증: 유효한 기존 의사만 gap 위치에서 재개하고 pause/stop은 복구 이벤트로 풀리지 않는다.
        if (interrupt === "none") {
            await expect(state).toHaveAttribute("data-state", "playing");
            expect(calls[1]).toBe("s1");
            await page.getByRole("button", { name: "OPEN", exact: true }).click();
            await page.getByRole("button", { name: "정지", exact: true }).click();
        } else {
            await page.waitForTimeout(800);
            expect(calls).toEqual(["s0"]);
            await expect(state).toHaveAttribute("data-state", interrupt === "pause" ? "paused" : "idle");
        }
        expect(repairs).toBe(1);
    });
}

test("NOVEL-REPAIR-02 five seconds means delayed, never fake success or a duplicate repair", async ({ page }) => {
    // 준비: 확정 실패의 재생성 작업이5초를 넘기되 안전deadline 내에서 계속되는 상황이다.
    const initial = source(3);
    let trace = "", posts = 0, cancels = 0;
    const pending = () => ({ ...initial, state: "RUNNING", eventSequence: 6, recovery: { repairId: "r", state: "RUNNING", targetIds: ["s1"], committedIds: [], errorCode: null, traceId: trace } });
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(initial)));
    await page.route("**/episodes/2/translations/job1/repair", route => { posts++; trace = route.request().headers()["x-novel-trace-id"]; return fulfillJson(route, responseDto(pending())); });
    await page.route("**/episodes/2/translations/job1", route => fulfillJson(route, responseDto(pending())));
    await page.route("**/episodes/2/translations/job1/cancel", route => { cancels++; return fulfillJson(route, responseDto({ ...pending(), state: "CANCELLED", eventSequence: 7, recovery: { ...pending().recovery, state: "CANCELLED" } })); });
    await page.goto("/novel/syosyetu/novels/n-test/episode/2");
    await page.getByTestId("novel-sentence").nth(1).getByRole("button", { name: "이 문장 다시 번역", exact: true }).click();
    await expect(page.getByText("복구가 지연되고 있습니다", { exact: false })).toBeVisible();
    const metrics = JSON.parse((await page.getByTestId("novel-repair-state").getAttribute("data-repair-metrics"))!);
    expect(metrics.repairReadyMs).toBeUndefined(); expect(metrics.delayed).toBe(true); expect(posts).toBe(1);
    // 실행 / 검증: 중지는 기존 작업 cancel이며 성공이나 다른 유료 복구가 아니다.
    await page.getByRole("button", { name: "작업 중지", exact: true }).click();
    await expect(page.getByTestId("novel-translation-state")).toHaveAttribute("data-state", "CANCELLED");
    expect(cancels).toBe(1); expect(posts).toBe(1);
});
