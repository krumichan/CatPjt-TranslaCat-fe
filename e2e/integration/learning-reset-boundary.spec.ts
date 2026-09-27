import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

const accessToken = process.env.E2E_RESET_ACCESS_TOKEN;
const refreshToken = process.env.E2E_RESET_REFRESH_TOKEN;
const publicId = process.env.E2E_RESET_PUBLIC_ID;
const oldLevelId = process.env.E2E_RESET_LEVEL_ID;
const oldWritingId = process.env.E2E_RESET_WRITING_ID;
const secret = process.env.NEXTAUTH_SECRET;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiURL = process.env.E2E_API_BASE_URL ?? "";

test.skip(!accessToken || !refreshToken || !publicId || !oldLevelId || !oldWritingId || !secret || !apiURL,
    "초기화 증거의 이전 ID와 로컬 합성 계정이 준비된 경우에만 실행합니다.");
test.use({ trace: "off", video: "off", screenshot: "off" });

test("이전 학습 URL과 브라우저 초안은 신규 계정의 학습으로 연결되지 않는다", async ({ context, page }) => {
    // 준비: 현재 정상 세션에 이전 학습의 URL과 합성 캐시를 재현한다. 업무 API는 가로채지 않는다.
    const now = Math.floor(Date.now() / 1000);
    const session = await encode({ secret: secret!, maxAge: 3600, token: {
        sub: publicId!, publicId, role: "USER", accessToken, refreshToken,
        accessTokenExpires: Date.now() + 3600_000, iat: now, exp: now + 3600, jti: `reset-${now}`,
    } });
    await context.addCookies([{
        name: "next-auth.session-token", value: session, url: baseURL,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + 3600,
    }]);
    const marker = "SYNTHETIC_STALE_DRAFT_MUST_NOT_SUBMIT";
    await context.addInitScript(({ user, set, marker }) => {
        localStorage.setItem(`translacat:language-learning:writing:draft:${encodeURIComponent(user)}:${set}`, JSON.stringify({
            dailySetId: Number(set), learningDate: "2026-09-26", writingType: "FREE",
            drafts: { "-1": marker }, bulkEvaluationRequested: true, updatedAt: "2026-09-26T00:00:00Z",
        }));
        sessionStorage.setItem("language-learning:speaking:-27:turn:0", marker);
    }, { user: publicId!, set: oldWritingId!, marker });
    const oldStatuses: number[] = [];
    const mutations: string[] = [];
    page.on("response", (response) => {
        if (response.url().startsWith(`${apiURL}/language-learning/level-test/sessions/${oldLevelId}`)) {
            oldStatuses.push(response.status());
        }
    });
    page.on("request", (request) => {
        if (request.url().startsWith(`${apiURL}/language-learning/`) && !["GET", "HEAD", "OPTIONS"].includes(request.method())) {
            mutations.push(request.method());
        }
    });

    // 실행: 저장된 이전 URL을 열고 새로고침해도 동일한 서버 조회 경계를 거친다.
    await page.goto(`/language-learning/level-test/session/${oldLevelId}`);
    await expect.poll(() => oldStatuses.length).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: /다시\s*시도|재시도|Retry/i })).toBeVisible();
    const beforeReload = oldStatuses.length;
    await page.reload();
    await expect.poll(() => oldStatuses.length).toBeGreaterThan(beforeReload);
    await expect(page.getByRole("button", { name: /다시\s*시도|재시도|Retry/i })).toBeVisible();

    // 검증: 과거 세션은 404이며 캐시의 답안/일괄 평가 플래그가 자동 제출을 만들지 않는다.
    expect(oldStatuses.every((status) => status === 404)).toBe(true);
    expect(mutations).toEqual([]);
    await expect(page.getByText(marker, { exact: true })).toHaveCount(0);
    await expect(page.locator("textarea")).toHaveCount(0);
    console.log(`Reset browser stale responses=${oldStatuses.length}, learning mutations=${mutations.length}`);
});

test("실제 신규 Writing 세트는 이전 세트의 일괄 평가 초안을 복원하지 않는다", async ({ context, page }) => {
    // 준비: HTTP 검사가 생성한 현재 미답변 세트와 동일 계정의 이전 세트 키를 함께 둔다.
    const currentAccess = process.env.E2E_RESET_CURRENT_ACCESS_TOKEN;
    const currentPublic = process.env.E2E_RESET_CURRENT_PUBLIC_ID;
    const currentSet = Number(process.env.E2E_RESET_CURRENT_SET_ID);
    const currentType = process.env.E2E_RESET_CURRENT_WRITING_TYPE;
    const currentItems = JSON.parse(process.env.E2E_RESET_CURRENT_ITEM_IDS ?? "[]") as number[];
    const unansweredItems = JSON.parse(process.env.E2E_RESET_UNANSWERED_ITEMS ?? "[]") as { itemId: number; order: number }[];
    const currentDate = process.env.E2E_RESET_CURRENT_LEARNING_DATE;
    expect(currentAccess && currentPublic && currentType).toBeTruthy();
    expect(currentItems.length).toBeGreaterThan(0);
    expect(unansweredItems.length).toBeGreaterThan(0);
    expect(currentDate).toBeTruthy();
    expect(currentSet).not.toBe(Number(oldWritingId));
    const now = Math.floor(Date.now() / 1000);
    const session = await encode({ secret: secret!, maxAge: 3600, token: {
        sub: currentPublic!, publicId: currentPublic, role: "USER", accessToken: currentAccess,
        accessTokenExpires: Date.now() + 3600_000, iat: now, exp: now + 3600, jti: `reset-writing-${now}`,
    } });
    await context.addCookies([{
        name: "next-auth.session-token", value: session, url: baseURL,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + 3600,
    }]);
    const marker = "SYNTHETIC_OLD_WRITING_ANSWER_MUST_NOT_ATTACH";
    await context.addInitScript(({ user, oldSet, type, items, date, marker }) => {
        localStorage.setItem(`translacat:language-learning:writing:draft:${encodeURIComponent(user)}:${oldSet}`, JSON.stringify({
            dailySetId: Number(oldSet), learningDate: date, writingType: type,
            drafts: Object.fromEntries(items.map((item: number) => [item, marker])),
            bulkEvaluationRequested: true, updatedAt: "2026-09-26T00:00:00Z",
        }));
        sessionStorage.setItem("language-learning:speaking:-27:turn:0", marker);
    }, { user: currentPublic!, oldSet: oldWritingId!, type: currentType!, items: unansweredItems.map((item) => item.itemId), date: currentDate!, marker });
    const mutations: string[] = [];
    page.on("request", (request) => {
        if (request.url().startsWith(`${apiURL}/language-learning/`) && !["GET", "HEAD", "OPTIONS"].includes(request.method())) {
            mutations.push(request.method());
        }
    });

    // 실행: 기존 정상 세트를 UI로 열고, 반환된 실제 세트·문항 식별자를 확인한다.
    await page.goto("/language-learning/writing");
    const selected = page.getByTestId(`daily-writing-type-${currentType!.toLowerCase()}`);
    await expect(selected).toBeVisible();
    const loaded = page.waitForResponse((response) =>
        response.url().startsWith(`${apiURL}/language-learning/writing/daily?`) &&
        response.request().method() === "GET");
    await selected.getByRole("button").click();
    const response = await loaded;
    expect(response.status()).toBe(200);
    const body = (await response.json()).body;
    expect(body.dailySetId).toBe(currentSet);
    expect(body.items.map((item: { itemId: number }) => item.itemId)).toEqual(currentItems);

    // 검증: 이전 bulk 플래그도 답안도 현재 세트에 반영되거나 자동 제출되지 않는다.
    await expect(page.getByTestId("daily-writing-page")).toBeVisible();
    await expect.poll(() => page.evaluate(({ user, set, marker }) => {
        const raw = localStorage.getItem(`translacat:language-learning:writing:draft:${encodeURIComponent(user)}:${set}`);
        if (!raw) return false;
        const stored = JSON.parse(raw);
        return stored.bulkEvaluationRequested === false && !raw.includes(marker);
    }, { user: currentPublic!, set: currentSet, marker })).toBe(true);
    for (const item of unansweredItems) {
        const card = page.locator("article").filter({ has: page.getByText(`#${item.order}`, { exact: true }) });
        await expect(card.locator("textarea")).toHaveValue("");
    }
    expect(mutations).toEqual([]);
    await expect(page.getByText(marker, { exact: true })).toHaveCount(0);
    expect(await page.evaluate(({ user, set, marker }) =>
        localStorage.getItem(`translacat:language-learning:writing:draft:${encodeURIComponent(user)}:${set}`)?.includes(marker) === true,
    { user: currentPublic!, set: oldWritingId!, marker })).toBe(true);
    console.log(`Reset Writing current items=${currentItems.length}, unanswered=${unansweredItems.length}, automatic mutations=${mutations.length}`);
});
