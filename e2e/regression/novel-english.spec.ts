import { test, expect, installMockAuthCookie } from "../fixtures/mock-test";
import { fulfillApiJson, fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

type Target = "ko" | "en";
const text = (target: Target, translation: string | null = target === "en" ? "The cat's day" : "고양이의 하루") => ({
    rawJa: "猫の一日", ja: "<ruby>猫<rt>ねこ</rt></ruby>の一日", ko: target === "ko" ? translation : null,
    targetLanguage: target, translatedText: translation,
});
const sentence = (target: Target, id: string, order: number, status = "SUCCEEDED") => ({
    id, order, paragraphId: `p${order}`, paragraphIndex: order, startOffset: 0, endOffset: 3, rawJa: "猫だ。", plainJa: "猫だ。",
    ko: target === "ko" && status === "SUCCEEDED" ? "고양이다." : null,
    translatedText: status === "SUCCEEDED" ? target === "en" ? `A cat ${id}.` : "고양이다." : null,
    targetLanguage: target, status, errorCode: status === "FAILED" ? "PROVIDER_TIMEOUT" : null,
});
const snapshot = (target: Target, state = "SUCCEEDED") => {
    const done = state === "SUCCEEDED";
    const partial = state === "PARTIAL";
    return { revision: "same-revision", segmentationVersion: "v1", targetLanguage: target, title: text(target, null),
        pagerInfo: { prevIdentifier: "1", nextIdentifier: "3", listIdentifier: "n-english" },
        segments: [sentence(target, "one", 0, done || partial ? "SUCCEEDED" : "PENDING"), sentence(target, "two", 1, done ? "SUCCEEDED" : partial ? "FAILED" : "PENDING")],
        totalSegments: 2, completedSegments: done ? 2 : partial ? 1 : 0, state,
        jobId: state === "SOURCE_READY" ? null : `${target}-job`, eventSequence: done ? 4 : partial ? 2 : 0, durableComplete: done };
};
function silentWav() {
    const wav = Buffer.alloc(44 + 160_000);
    wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write("data", 36); wav.writeUInt32LE(wav.length - 44, 40);
    return wav.toString("base64");
}
const readerPath = "/learning/novel/syosyetu/novels/n-english/episode/2";

test.beforeEach(async ({ page, context }) => {
    await installMockAuthCookie(context, "ADMIN");
    await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
    await mockIdleWebSocket(page);
    await page.route("**/recent-views", route => fulfillJson(route, responseDto({})));
    await page.route("**/recent/save", route => fulfillJson(route, responseDto({})));
});

test("NOVEL-EN-01 목록 영어 선택과 목차·회차·이전다음 이동에서 target을 보존한다", async ({ page }, testInfo) => {
    // 준비: 실제 Next 화면에 합성 catalog/detail/reader API를 연결한다. 유료 번역 호출은 없다.
    const languages: string[] = [];
    await page.route("**/novels/catalog", route => {
        const selector = route.request().postDataJSON();
        languages.push(selector.language);
        const target: Target = selector.language === "en" ? "en" : "ko";
        return fulfillJson(route, responseDto({ snapshotId: `${target}-catalog`, eventSequence: 1, state: "SUCCEEDED", total: 1, ready: 1, failed: 0,
            pageInfo: null, selector, items: [{ itemId: "i1", identifier: "n-english", rank: null, sourcePosition: 0, arrivalSequence: 0,
                status: "READY", title: text(target), author: text(target, "Cat Author"), synopsis: text(target, "A quiet story about a cat."), statusText: text(target, "Ongoing"),
                genreText: "", isShortStory: false, cached: true, errorCode: null }] }));
    });
    await page.route("**/novels/catalog/*/cancel", route => fulfillJson(route, responseDto({})));
    await page.route("**/syosyetu/novels/n-english?*", route => {
        const target: Target = new URL(route.request().url()).searchParams.get("targetLanguage") === "en" ? "en" : "ko";
        return fulfillApiJson(route, responseDto({ title: text(target, null), author: text(target, null), synopsis: text(target, null),
            pageInfo: null, episodes: [{ sequence: 2, identifier: "2", title: text(target, null) }] }));
    });
    await page.route("**/episodes/*/reader?targetLanguage=en", route => fulfillJson(route, responseDto(snapshot("en"))));

    // 실행: UI는 KRJP를 유지하면서 영어를 골라 실제 링크를 따라간다.
    await page.goto("/learning/novel/syosyetu/search/novels?keyword=cat");
    await expect(page.getByTestId("novel-catalog-card")).toBeVisible();
    await page.getByLabel("번역 언어", { exact: true }).selectOption("en");
    const title = page.getByTestId("novel-card-title");
    await expect(title.locator('[lang="en"]')).toHaveText("The cat's day");
    await expect(title.locator("ruby rt")).toHaveText("ねこ");
    await page.screenshot({ path: testInfo.outputPath("synthetic-english-catalog.png"), fullPage: true });
    await title.getByRole("link").click();

    // 검증: 번역이 없는 목차는 일본어를 표시하며 영어 target은 그대로 전달한다.
    await expect(page).toHaveURL(/novels\/n-english\?novelTarget=en$/);
    await expect(page.getByLabel("번역 언어", { exact: true })).toHaveValue("en");
    await expect(page.getByRole("heading", { level: 1 }).locator('[lang="ko"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 }).locator("ruby rt")).toHaveText("ねこ");
    await page.locator("#episode-list").getByText("猫ねこの一日", { exact: true }).click();
    await expect(page).toHaveURL(/episode\/2\?novelTarget=en$/);
    await expect(page.locator('article p[lang="en"]')).toHaveCount(2);
    await page.reload();
    await expect(page.locator('article p[lang="en"]')).toHaveCount(2);
    await page.getByRole("button", { name: "OPEN", exact: true }).click();
    const next = page.getByRole("button", { name: /NEXT/ });
    await next.click();
    await expect(page).toHaveURL(/episode\/3\?novelTarget=en$/);
    await expect(page.locator('article p[lang="en"]')).toHaveCount(2);
    await page.getByRole("button", { name: /PREV/ }).click();
    await expect(page).toHaveURL(/episode\/1\?novelTarget=en$/);
    await expect(page.locator('article p[lang="en"]')).toHaveCount(2);
    await page.getByRole("button", { name: "OPEN", exact: true }).click();
    await page.getByRole("button", { name: "LIST", exact: true }).click();
    await expect(page).toHaveURL(/novels\/n-english\?novelTarget=en$/);
    expect(languages).toEqual(["ko", "en"]);
});

test("NOVEL-EN-02 영어 번역·복구·음성은 en 작업만 사용하고 일본어 UI를 유지한다", async ({ page }, testInfo) => {
    // 준비
    const starts: Target[] = [], audioCalls: { language: string; targetLanguage: string }[] = [];
    await page.route("**/episodes/2/reader?targetLanguage=en", route => fulfillJson(route, responseDto(snapshot("en", "SOURCE_READY"))));
    await page.route("**/episodes/2/translations", route => {
        starts.push(route.request().postDataJSON().targetLanguage);
        return fulfillJson(route, responseDto(snapshot("en", "PARTIAL")));
    });
    await page.route("**/episodes/2/translations/en-job/repair", route => {
        const trace = route.request().headers()["x-novel-trace-id"];
        return fulfillJson(route, responseDto({ ...snapshot("en"), recovery: { repairId: "en-repair", state: "SUCCEEDED", targetIds: ["two"], committedIds: ["two"], errorCode: null, traceId: trace } }));
    });
    await page.route("**/episodes/2/audio", route => {
        const body = route.request().postDataJSON();
        audioCalls.push({ language: body.language, targetLanguage: body.targetLanguage });
        return fulfillJson(route, responseDto({ ...body, partCount: 1, provider: "openai", contentType: "audio/wav", audioBase64: silentWav() }));
    });

    // 실행
    await page.goto("/ja/novel/syosyetu/novels/n-english/episode/2?novelTarget=en");
    await expect(page.getByLabel("翻訳言語", { exact: true })).toHaveValue("en");
    await expect(page.getByRole("button", { name: "全文翻訳を開始", exact: true })).toBeVisible();
    expect(starts).toHaveLength(0);
    expect(audioCalls).toHaveLength(0);
    await page.getByRole("button", { name: "全文翻訳を開始", exact: true }).click();
    await expect(page.locator('article p[lang="en"]')).toHaveCount(1);
    await page.getByRole("button", { name: "この文を再翻訳", exact: true }).click();

    // 검증: 복구 완료와 영어 본문을 확인한 뒤 명시 재생만 en 합성을 시작한다.
    await expect(page.getByTestId("novel-translation-state")).toHaveAttribute("data-state", "SUCCEEDED");
    await expect(page.locator('article p[lang="en"]')).toHaveCount(2);
    await expect(page.locator('article p[lang="ko"]')).toHaveCount(0);
    await page.getByRole("button", { name: "OPEN", exact: true }).click();
    await page.getByRole("button", { name: "翻訳を全文再生", exact: true }).click();
    await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "playing");
    expect(starts).toEqual(["en"]);
    expect(audioCalls[0]).toEqual({ language: "en", targetLanguage: "en" });
    await page.getByRole("button", { name: "停止", exact: true }).click();
    await page.getByRole("button", { name: "CLOSE", exact: true }).click();
    await expect(page.getByTestId("novel-playback-controls")).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath("synthetic-english-reader-ja-ui.png"), fullPage: true, animations: "disabled" });
});

test("NOVEL-EN-03 언어 전환 뒤 늦은 한국어 번역 완료는 영어 본문·완료를 바꾸지 않는다", async ({ page }) => {
    // 준비: 한국어 POST가 응답하기 전에 사용자가 영어로 전환한다.
    let release: () => void = () => {};
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(snapshot("ko", "SOURCE_READY"))));
    await page.route("**/episodes/2/reader?targetLanguage=en", route => fulfillJson(route, responseDto(snapshot("en", "SOURCE_READY"))));
    await page.route("**/episodes/2/translations", async route => {
        await held;
        await fulfillJson(route, responseDto(snapshot("ko"))).catch(() => {});
    });
    await page.goto(readerPath);
    const posted = page.waitForRequest(request => request.method() === "POST" && request.url().endsWith("/translations"));
    await page.getByRole("button", { name: "전체 번역 시작", exact: true }).click();
    await posted;

    // 실행
    await page.getByLabel("번역 언어", { exact: true }).selectOption("en");
    await expect(page).toHaveURL(/novelTarget=en$/);
    await expect(page.getByTestId("novel-translation-state")).toHaveAttribute("data-target-language", "en");
    release();

    // 검증: 새 영어 작업은 원문 대기로 남으며 한국어는 표시되지 않는다.
    await expect(page.getByTestId("novel-translation-state")).toHaveAttribute("data-state", "SOURCE_READY");
    await expect(page.locator('article p[lang="ko"]')).toHaveCount(0);
    await expect(page.locator('article p[lang="en"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "전체 번역 시작", exact: true })).toBeEnabled();
});

test("NOVEL-EN-04 늦은 ko 음성은 폐기하고 전환 후 명시 en 음성만 재생한다", async ({ page }) => {
    // 준비
    let release: () => void = () => {};
    const held = new Promise<void>(resolve => { release = resolve; });
    const calls: string[] = [];
    await page.route("**/episodes/2/reader", route => fulfillJson(route, responseDto(snapshot("ko"))));
    await page.route("**/episodes/2/reader?targetLanguage=en", route => fulfillJson(route, responseDto(snapshot("en"))));
    await page.route("**/episodes/2/audio", async route => {
        const body = route.request().postDataJSON();
        calls.push(body.language);
        if (body.language === "ko") await held;
        await fulfillJson(route, responseDto({ ...body, partCount: 1, provider: "openai", contentType: "audio/wav", audioBase64: silentWav() })).catch(() => {});
    });
    await page.goto(readerPath);
    await page.getByRole("button", { name: "OPEN", exact: true }).click();
    await page.getByRole("button", { name: "번역문 전체 읽기", exact: true }).click();
    await expect.poll(() => calls).toEqual(["ko"]);

    // 실행: 이전 음성을 기다리지 않고 영어 target으로 바꾼다.
    await page.getByLabel("번역 언어", { exact: true }).selectOption("en");
    await expect(page.getByTestId("novel-translation-state")).toHaveAttribute("data-target-language", "en");
    release();
    await page.getByRole("button", { name: "OPEN", exact: true }).click();
    await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "idle");
    await page.getByRole("button", { name: "번역문 전체 읽기", exact: true }).click();

    // 검증: 언어 전환은 자동 합성을 시작하지 않으며 en 재생 클릭으로만 새 요청한다.
    await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "playing");
    expect(calls).toEqual(["ko", "en"]);
    await page.getByRole("button", { name: "정지", exact: true }).click();
});

test("NOVEL-EN-05 영어 진행 작업 재진입은 해당 job만 조회하며 ko 완료 응답을 거절한다", async ({ page }) => {
    // 준비
    let posts = 0;
    await page.route("**/episodes/2/reader?targetLanguage=en", route => fulfillJson(route, responseDto(snapshot("en", "RUNNING"))));
    await page.route("**/episodes/2/translations", route => { posts++; return route.abort(); });
    await page.route("**/episodes/2/translations/en-job", route => fulfillJson(route, responseDto(snapshot("ko"))));

    // 실행
    await page.goto(`${readerPath}?novelTarget=en`);

    // 검증: 잘못된 응답은 실패로 보존하며 다른 언어의 완료를 인정하지 않는다.
    await expect(page.getByRole("alert").filter({ hasText: "번역 상태" })).toBeVisible();
    await expect(page.getByTestId("novel-translation-state")).toHaveAttribute("data-state", "RUNNING");
    await expect(page.locator('article p[lang="ko"]')).toHaveCount(0);
    expect(posts).toBe(0);
});

test("NOVEL-EN-06 영어 최근 방문은 영어 제목·원문 fallback과 target으로 재진입한다", async ({ page }, testInfo) => {
    // 준비: detail sourceGET의 BE 최근 기록 side effect를 합성한다. 과거 ko 제목도 함께 남아 있다.
    let recorded = false;
    let duplicatePosts = 0;
    await page.route("**/recent/save", route => { duplicatePosts++; return fulfillJson(route, responseDto({})); });
    await page.route("**/recent/top10**", route => fulfillJson(route, responseDto(recorded ? [
        { id: 1, platformCode: "syosyetu", type: "NOVEL", novelId: "n-english", title: text("ko", "이전 한국어 제목"), targetLanguage: "en", titleEn: "English recent novel", viewedAt: "2026-10-17T01:00:00Z" },
        { id: 2, platformCode: "syosyetu", type: "EPISODE", novelId: "n-english", episodeId: "2", title: { rawJa: "未訳の猫", ja: "未訳の猫", ko: "한국어를 영어로 표시하면 실패" }, targetLanguage: "en", titleEn: null, viewedAt: "2026-10-17T00:00:00Z" },
    ] : [])));
    await page.route("**/syosyetu/novels/n-english?*", route => {
        recorded = true;
        return fulfillApiJson(route, responseDto({ title: text("en", "English recent novel"), author: text("en", null), synopsis: text("en", null), pageInfo: null, episodes: [] }));
    });
    await page.route("**/episodes/2/reader?targetLanguage=en", route => fulfillJson(route, responseDto(snapshot("en"))));

    // 실행: 영어 조회 후 앱에 다시 들어와 서버가 돌려준 최근 방문을 누른다.
    await page.goto("/ko/novel/syosyetu/novels/n-english?novelTarget=en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("English recent novel");
    await page.goto("/ko");
    const sidebar = page.getByTestId("app-sidebar");
    await expect(sidebar.getByRole("button", { name: "English recent novel", exact: true })).toBeVisible();
    await expect(sidebar).not.toContainText("이전 한국어 제목");
    await expect(sidebar).not.toContainText("한국어를 영어로 표시하면 실패");
    await sidebar.getByRole("button", { name: "English recent novel", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("synthetic-english-recent-ko-ui.png"), fullPage: true });
    await sidebar.getByRole("button", { name: "English recent novel", exact: true }).click();
    await expect(page).toHaveURL(/novels\/n-english\?novelTarget=en$/);

    // 검증: 영어 제목이 없어도 일본어 원문으로 회차에 재진입하고 중복 FE 저장은 없다.
    await sidebar.getByRole("button", { name: "未訳の猫", exact: true }).click();
    await expect(page).toHaveURL(/episode\/2\?novelTarget=en$/);
    await expect(page.locator('article p[lang="en"]')).toHaveCount(2);
    expect(duplicatePosts).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("synthetic-english-reader-ko-ui.png"), fullPage: true });
});

test("NOVEL-EN-07 기존 legacy 플랫폼 목차에는 영어 선택을 약속하지 않는다", async ({ page }) => {
    // 준비: 실제 지원 사이트인 카쿠요무를 제외하고 미지원 플랫폼의 기존 한국어 계약을 검증한다.
    const requestedTargets: (string | null)[] = [];
    const readerTargets: (string | null)[] = [];
    await page.route("**/unsupported/novels/n-legacy?*", route => {
        if (route.request().resourceType() === "document") return route.fallback();
        requestedTargets.push(new URL(route.request().url()).searchParams.get("targetLanguage"));
        return fulfillApiJson(route, responseDto({ title: text("ko"), author: text("ko"), synopsis: text("ko"),
            pageInfo: null, episodes: [{ sequence: 1, identifier: "1", title: text("ko") }] }));
    });

    // 실행: 다른 곳에서 받은 영어 query가 있더라도 지원하지 않는 선택기를 추가하지 않는다.
    await page.goto("/ko/novel/unsupported/novels/n-legacy?novelTarget=en");

    // 검증: 기존 한국어 요청/원래 화면을 유지한다.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("고양이의 하루");
    await expect(page.getByLabel("번역 언어", { exact: true })).toHaveCount(0);
    expect(requestedTargets.length).toBeGreaterThan(0);
    expect(requestedTargets.every(target => target === null)).toBe(true);

    // 실행 / 검증: 지원 밖 reader 수동 주소도 영어 API를 요청하거나 선택기를 표시하지 않는다.
    await page.route("**/unsupported/n-legacy/episodes/1/reader", route => {
        readerTargets.push(new URL(route.request().url()).searchParams.get("targetLanguage"));
        return fulfillJson(route, responseDto({ code: "UNSUPPORTED_PLATFORM" }), 400);
    });
    await page.goto("/ko/novel/unsupported/novels/n-legacy/episode/1?novelTarget=en");
    await expect(page.getByRole("alert").filter({ hasText: "원문을 불러오지 못했습니다." })).toBeVisible();
    await expect(page.getByLabel("번역 언어", { exact: true })).toHaveCount(0);
    expect(readerTargets.length).toBeGreaterThan(0);
    expect(readerTargets.every(target => target === null)).toBe(true);
});
