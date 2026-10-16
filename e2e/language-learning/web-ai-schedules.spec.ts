import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test } from "../fixtures/mock-test";
import { LANGUAGE_LEARNING_SETTING, mockLanguageLearningBase } from "../support/language-learning-mocks";
import { fulfillApiJson } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { mockWebAiRunPrompt } from "../support/web-ai-prompt-mocks";
import type { WebAiPlan, WebAiPlanRequest } from "../../src/types/language-learning/webAi";

const QA_DIRECTORY = path.resolve("..", ".codex-workspace", "verification", "fe", "web-ai-settings-mobile-update");
const SETUP_QA_DIRECTORY = path.resolve("..", ".codex-workspace", "verification", "fe", "web-ai-prerequisites-20261016");
const COPY_QA_DIRECTORY = path.resolve("..", ".codex-workspace", "verification", "fe", "web-ai-copy-transfer-20261016");

async function createReadyPlan(page: Parameters<typeof mockLanguageLearningBase>[0]) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/language-learning/settings/web-ai");
    await page.getByRole("button", { name: "새 계획" }).first().click();
    const editor = page.getByTestId("web-ai-schedule-editor");
    await editor.getByRole("textbox", { name: "계획 이름" }).fill("실무 작문 복사 검증");
    await editor.getByRole("checkbox", { name: "번역 작문" }).check();
    const footer = page.getByTestId("web-ai-schedule-footer");
    await footer.getByRole("button", { name: "학습 계획 저장" }).click();
    await expect(footer.getByRole("status")).toContainText("저장했습니다");
    return { editor, footer };
}

async function expectSettingsBelowHeader(page: Parameters<typeof mockLanguageLearningBase>[0]) {
    // 검증: 고정 헤더가 설정 화면의 첫 콘텐츠를 가리지 않는다.
    const header = await page.getByTestId("app-header").boundingBox();
    const settings = await page.getByTestId("web-ai-schedule-settings").boundingBox();
    expect(header).not.toBeNull();
    expect(settings).not.toBeNull();
    expect(settings!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
}

test.describe("웹 AI 학습 계획", () => {
    test.beforeEach(async ({ page }) => {
        await mockLanguageLearningBase(page);
        const plans = new Map<string, WebAiPlan>();
        let runSequence = 0;
        await page.route("**/language-learning/web-ai/**", async (route) => {
            const request = route.request();
            const path = new URL(request.url()).pathname.split("/web-ai")[1];

            // 준비: 서버가 보관하는 계획과 revision을 브라우저 localStorage와 독립적으로 유지한다.
            if (path === "/plans" && request.method() === "GET") {
                await fulfillApiJson(route, responseDto({ plans: [...plans.values()] }));
                return;
            }
            if ((path === "/plans" && request.method() === "POST") ||
                (/^\/plans\/[^/]+$/.test(path) && request.method() === "PUT")) {
                const body = request.postDataJSON() as WebAiPlanRequest;
                const id = body.id!;
                const plan: WebAiPlan = { ...body, id, revision: (plans.get(id)?.revision ?? 0) + 1, enabled: body.enabled, originLanguage: "ko", learningLanguage: "ja", feedbackLanguage: "ko", updatedAt: "2026-10-15T09:00:00Z" };
                plans.set(id, plan);
                await fulfillApiJson(route, responseDto(plan));
                return;
            }
            if (/^\/plans\/[^/]+\/runs$/.test(path)) {
                const plan = plans.get(path.split("/")[2])!;
                const id = `run-id-${++runSequence}`;
                const prompt = mockWebAiRunPrompt(plan, id);
                await fulfillApiJson(route, responseDto({ id, planId: plan.id, executionKey: request.postDataJSON().executionKey, prompt }));
                return;
            }
            if (/^\/plans\/[^/]+\/connection$/.test(path) && request.method() === "POST") {
                const promptUrl = "/api/v1/language-learning/web-ai/external/prompt";
                const resultUrl = "/api/v1/language-learning/web-ai/external/results";
                await fulfillApiJson(route, responseDto({ token: "test-plan-token", planId: path.split("/")[2], promptUrl, resultUrl, bootstrapPrompt: `At each scheduled occurrence, first POST ${promptUrl}\nAuthorization: Bearer test-plan-token\nContent-Type: application/json\nBody: {"executionKey":"<stable scheduled local date and time>"}\nAfter feedback POST ${resultUrl}` }));
                return;
            }
            if (path === "/results" && request.method() === "POST") {
                await fulfillApiJson(route, responseDto({ id: "result-id", status: "PENDING" }));
                return;
            }
            await route.fulfill({ status: 404, body: "Unexpected web AI request" });
        });
    });

    test("학습 설정 저장 전에는 설정 카드와 직접 URL에서 계획 생성을 막는다", async ({ page }) => {
        // 준비: 입력 기본값이 있어도 서버에 저장하지 않은 사용자를 표시한다.
        await page.route("**/api/v1/language-learning/settings", (route) =>
            fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_SETTING, configured: false })),
        );

        // 실행 / 검증: 진입 카드의 이유와 설정 이동 링크를 제공한다.
        await page.goto("/language-learning/settings");
        await expect(page.getByRole("button", { name: "계획 관리", exact: true })).toBeDisabled();
        await expect(page.getByRole("link", { name: "설정하기", exact: true })).toHaveAttribute("href", "#learning-settings");

        // 실행 / 검증: 직접 접근해도 편집기와 저장 푸터를 만들지 않는다.
        await page.goto("/language-learning/settings/web-ai");
        const setup = page.getByTestId("web-ai-plan-prerequisites");
        await expect(setup).toContainText("먼저 학습 준비를 완료");
        await expect(setup.getByRole("link", { name: "설정하기", exact: true })).toHaveAttribute("href", /\/language-learning\/settings#learning-settings$/);
        await expect(page.getByRole("button", { name: "새 계획" }).first()).toBeDisabled();
        await expect(page.getByTestId("web-ai-schedule-editor")).toHaveCount(0);
        await expect(page.getByTestId("web-ai-schedule-footer")).toHaveCount(0);
    });

    test("유효 키워드가 없으면 카탈로그가 있어도 계획을 막고 적용일을 안내한다", async ({ page }) => {
        // 준비: 선택 가능한 카탈로그는 유지하되 오늘 사용할 후보는 비운다.
        await page.route("**/api/v1/language-learning/keywords/effective", (route) =>
            fulfillApiJson(route, responseDto({ candidates: [] })),
        );
        await page.setViewportSize({ width: 1280, height: 900 });

        // 실행 / 검증: PC와 모바일 모두 키워드 준비 경로를 보여 준다.
        await page.goto("/language-learning/settings/web-ai");
        const setup = page.getByTestId("web-ai-plan-prerequisites");
        await expect(setup).toContainText("다음 학습일부터 적용");
        await expect(setup.getByRole("link", { name: "키워드 설정", exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "새 계획" }).first()).toBeDisabled();
        mkdirSync(SETUP_QA_DIRECTORY, { recursive: true });
        await page.screenshot({ path: path.join(SETUP_QA_DIRECTORY, "prerequisites-desktop.png") });
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(page.getByRole("button", { name: "새 계획" }).first()).toBeDisabled();
        // 검증: AppShell의 PC 사이드바 여백 전환이 끝난 모바일 배치를 기록한다.
        await expect.poll(async () => (await page.locator("main.overflow-y-auto").boundingBox())?.x).toBe(0);
        await page.screenshot({ path: path.join(SETUP_QA_DIRECTORY, "prerequisites-mobile.png") });
    });

    test("조회 실패는 미설정과 구분하고 재확인 성공 후 계획을 만들 수 있다", async ({ page }) => {
        // 준비: 첫 조회만 실패하고 재확인에는 저장된 설정을 반환한다.
        await page.setViewportSize({ width: 1280, height: 900 });
        let failed = true;
        let release!: () => void;
        const responseGate = new Promise<void>((resolve) => { release = resolve; });
        await page.route("**/api/v1/language-learning/settings", async (route) => {
            if (failed) {
                await responseGate;
                await route.fulfill({ status: 503, body: "temporarily unavailable" });
            }
            else await fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_SETTING));
        });

        // 실행 / 검증: 로딩과 실패를 설정 누락으로 안내하지 않는다.
        await page.goto("/language-learning/settings/web-ai");
        const setup = page.getByTestId("web-ai-plan-prerequisites");
        await expect(setup).toContainText("확인하고 있어요");
        await expect(page.getByRole("button", { name: "새 계획" }).first()).toBeDisabled();
        release();
        await expect(setup).toContainText("확인하지 못했어요");
        await expect(setup.getByRole("link", { name: "설정하기", exact: true })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "새 계획" }).first()).toBeDisabled();

        // 실행 / 검증: 같은 화면에서 최신 상태를 받아 생성 경로를 연다.
        failed = false;
        await setup.getByRole("button", { name: "준비 상태 다시 확인" }).click();
        await expect(page.getByRole("button", { name: "새 계획" }).first()).toBeEnabled();
        await page.getByRole("button", { name: "새 계획" }).first().click();
        const editor = page.getByTestId("web-ai-schedule-editor");
        await expect(editor).toBeVisible();

        // 실행: 다른 탭의 키워드 변경 뒤 돌아와도 편집·결과 입력을 잃지 않는다.
        await editor.getByRole("textbox", { name: "계획 이름" }).fill("보존할 계획");
        const integration = page.getByTestId("web-ai-plan-integration");
        await integration.locator("summary").click();
        const resultInput = integration.getByRole("textbox", { name: "웹 AI 결과 JSON" });
        await resultInput.fill("미제출 결과 초안");
        failed = true;
        let keywordFailed = true;
        await page.route("**/api/v1/language-learning/keywords/effective", async (route) => {
            if (keywordFailed) await route.fulfill({ status: 503, body: "temporarily unavailable" });
            else await fulfillApiJson(route, responseDto({ candidates: [] }));
        });
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));

        // 검증: 입력 잠금 상태에도 복구 버튼과 PC 닫기는 사용할 수 있다.
        await expect(setup).toContainText("확인하지 못했어요");
        await expect(editor.getByRole("textbox", { name: "계획 이름" })).toHaveValue("보존할 계획");
        await expect(editor.getByRole("textbox", { name: "계획 이름" })).toBeDisabled();
        await expect(resultInput).toHaveValue("미제출 결과 초안");
        await expect(page.getByTestId("web-ai-schedule-footer").getByRole("button", { name: "학습 계획 저장" })).toBeDisabled();
        await expect(editor.getByRole("button", { name: "편집기 닫기" })).toBeEnabled();
        await expect(editor.getByRole("button", { name: "다시 확인", exact: true })).toHaveCount(0);

        // 실행 / 검증: 복구는 체크리스트에서 진행하고, 미완료 상태에서도 닫기를 허용한다.
        failed = false;
        keywordFailed = false;
        await setup.getByRole("button", { name: "준비 상태 다시 확인" }).click();
        await expect(setup).toContainText("오늘 사용할 수 있는 학습 키워드");
        await expect(resultInput).toHaveValue("미제출 결과 초안");
        await editor.getByRole("button", { name: "편집기 닫기" }).click();
        await expect(editor).toHaveCount(0);
    });

    test("설정에서 주간 계획을 만들고 새로고침 후 프롬프트를 복사한다", async ({ context, page }) => {
        // 준비: 언어학습 설정의 진입 카드에서 계획 화면으로 이동한다.
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto("/language-learning/settings");
        await page.getByRole("link", { name: "계획 관리" }).click();
        await expect(page).toHaveURL(/\/language-learning\/settings\/web-ai$/);
        await expect(page.getByTestId("web-ai-schedule-settings")).toBeVisible();
        await expectSettingsBelowHeader(page);
        await page.getByRole("button", { name: "새 계획" }).first().click();

        // 실행: 공통 언어는 읽기 전용으로 확인하고 월·수 일정과 독립적인 두 작문 유형을 정한다.
        const editor = page.getByTestId("web-ai-schedule-editor");
        const planList = page.getByTestId("web-ai-schedule-list");
        await expect(planList).toBeVisible();
        const listBounds = await planList.boundingBox();
        const editorBounds = await editor.boundingBox();
        expect(listBounds).not.toBeNull();
        expect(editorBounds).not.toBeNull();
        expect(listBounds!.x + listBounds!.width).toBeLessThanOrEqual(editorBounds!.x);
        await editor.getByRole("textbox", { name: "계획 이름" }).fill("일본어 실무 작문");
        const inheritedLanguages = editor.getByTestId("web-ai-inherited-languages");
        await expect(inheritedLanguages).toContainText("한국어 / Korean");
        await expect(inheritedLanguages).toContainText("日本語 / Japanese");
        await expect(inheritedLanguages.locator("input, select, textarea")).toHaveCount(0);
        await expect(editor.getByRole("combobox", { name: "원문 언어" })).toHaveCount(0);
        await expect(editor.getByRole("combobox", { name: "학습 언어" })).toHaveCount(0);
        await expect(editor.getByRole("combobox", { name: "설명·피드백 언어" })).toHaveCount(0);
        await editor.getByRole("group", { name: "반복 방식" }).getByRole("button", { name: "매주" }).click();
        const weekdays = editor.getByRole("group", { name: "실행 요일" });
        await weekdays.getByRole("button", { name: "월", exact: true }).click();
        await weekdays.getByRole("button", { name: "수", exact: true }).click();

        const translation = editor.getByRole("checkbox", { name: "번역 작문" });
        const translationCounts = translation.locator("xpath=../..");
        await expect(translationCounts.getByRole("spinbutton", { name: "쉬움" })).toBeDisabled();
        await translation.check();
        await expect(translationCounts.getByRole("spinbutton", { name: "쉬움" })).toBeEnabled();
        await translationCounts.getByRole("spinbutton", { name: "쉬움" }).fill("1");
        await translationCounts.getByRole("spinbutton", { name: "적정" }).fill("1");
        await translationCounts.getByRole("spinbutton", { name: "어려움" }).fill("1");

        const guided = editor.getByRole("checkbox", { name: "가이드 작문" });
        await guided.check();
        const guidedCounts = guided.locator("xpath=../..");
        await guidedCounts.getByRole("spinbutton", { name: "적정" }).fill("2");
        await editor.locator("summary").filter({ hasText: "학습 상황·주제" }).click();
        await editor.getByPlaceholder("예: 일본 현업 고객과 요건정의·설계 협의를 할 때 쓰는 표현").fill("요건정의와 일본 고객 회의");
        await editor.locator("summary").filter({ hasText: "문제 주제 키워드" }).click();
        await editor.getByRole("button", { name: "이 계획에서 직접 선택", exact: true }).click();
        const keywordCatalog = editor.getByRole("group", { name: "이 계획의 문제 주제 선택" });
        await keywordCatalog.getByRole("button", { name: "Shopping", exact: true }).click();
        await expect(keywordCatalog.getByRole("button", { name: "Shopping", exact: true })).toHaveAttribute("aria-pressed", "true");
        const footer = page.getByTestId("web-ai-schedule-footer");
        await footer.getByRole("button", { name: "학습 계획 저장" }).click();

        // 검증: 서버에 저장한 계획을 새로고침 후 다시 조회하고 서버 프롬프트를 복사한다.
        await expect(footer.getByRole("status")).toContainText("저장했습니다");
        await expect(planList.getByRole("heading", { name: "일본어 실무 작문" })).toBeVisible();
        await page.reload();
        await expect(page.getByRole("heading", { name: "일본어 실무 작문" })).toBeVisible();
        await page.evaluate(() => {
            const scroller = document.querySelector<HTMLElement>("main.overflow-y-auto");
            if (scroller) scroller.scrollTop = 0;
        });
        mkdirSync(QA_DIRECTORY, { recursive: true });
        await page.screenshot({ path: path.join(QA_DIRECTORY, "desktop-top.png") });
        await page.screenshot({ path: path.join(QA_DIRECTORY, "desktop-plans-top.png") });
        await page.getByRole("button", { name: "수정" }).click();
        await expect(editor.getByRole("textbox", { name: "계획 이름" })).toHaveValue("일본어 실무 작문");
        await expect(inheritedLanguages).toContainText("한국어 / Korean");
        await expect(inheritedLanguages).toContainText("日本語 / Japanese");
        await expect(editor.getByRole("group", { name: "실행 요일" }).getByRole("button", { name: "월", exact: true })).toHaveAttribute("aria-pressed", "true");
        await expect(editor.getByRole("group", { name: "실행 요일" }).getByRole("button", { name: "수", exact: true })).toHaveAttribute("aria-pressed", "true");

        const preview = editor.locator("pre");
        await expect(preview).toContainText("매주 월·수요일");
        await expect(preview).toContainText("한국어 (ko)");
        await expect(preview).toContainText("일본어 (ja)");
        await expect(preview).toContainText("총 5문제");
        await expect(preview).toContainText("[WRITING_TRANSLATION]");
        await expect(preview).toContainText("[WRITING_GUIDED]");
        await expect(preview).toContainText("작성 표현 | 권장 표현 | 이유");
        await expect(preview).toContainText("요건정의와 일본 고객 회의");
        await expect(preview).toContainText('출제 키워드: ["Shopping"]');
        await expect(preview).toContainText("설명과 피드백 언어: 한국어 (ko)");

        await footer.getByRole("button", { name: "프롬프트 복사" }).click();
        await expect(footer.getByRole("status")).toContainText("전송 프롬프트를 복사했습니다");
        const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardText).toContain('"weekdays":[1,3]');
        expect(clipboardText).toContain("/external/results");
        expect(clipboardText).toContain("originalFeedbackMarkdown");
        expect(clipboardText).toContain('"runId": "run-id-1"');
        // 검증: Windows 클립보드의 CRLF와 textarea의 LF 차이만 정규화한다.
        await expect(editor.getByRole("textbox", { name: "실제 복사할 전송 프롬프트" })).toHaveValue(clipboardText.replace(/\r\n/g, "\n"));

        await page.evaluate(() => {
            const scroller = document.querySelector<HTMLElement>("main.overflow-y-auto");
            if (scroller) scroller.scrollTop = 0;
        });
        mkdirSync(QA_DIRECTORY, { recursive: true });
        await page.screenshot({ path: path.join(QA_DIRECTORY, "desktop-light.png"), fullPage: true });
    });

    test("지연된 준비와 복사 차단 후에도 실제 문구를 보존하고 HTTP 없이 재복사한다", async ({ page }) => {
        // 준비: 첫 클립보드 쓰기만 거부하고, 실제 시도한 문자열을 테스트 메모리에 보관한다.
        await page.addInitScript(() => {
            const attempts: string[] = [];
            Object.defineProperty(window, "__webAiCopyAttempts", { value: attempts });
            Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
                writeText: (text: string) => {
                    attempts.push(text);
                    return attempts.length === 1 ? Promise.reject(new DOMException("Denied", "NotAllowedError")) : Promise.resolve();
                },
            } });
        });
        const { editor, footer } = await createReadyPlan(page);
        let connectionRequests = 0;
        let runRequests = 0;
        page.on("request", (request) => {
            if (request.method() !== "POST") return;
            if (/\/connection$/.test(request.url())) connectionRequests++;
            if (/\/runs$/.test(request.url())) runRequests++;
        });
        let releaseRun!: () => void;
        const runGate = new Promise<void>((resolve) => { releaseRun = resolve; });
        await page.route("**/web-ai/plans/*/runs", async (route) => { await runGate; await route.fallback(); });

        // 실행 / 검증: 준비 중에는 중복 실행을 막고, 포커스 재조회로 기존 언어·입력을 비우지 않는다.
        await footer.getByRole("button", { name: "프롬프트 복사" }).click();
        await expect.poll(() => runRequests).toBe(1);
        await expect(footer.getByRole("button", { name: "프롬프트 복사" })).toBeDisabled();
        let releaseSettings!: () => void;
        const settingsGate = new Promise<void>((resolve) => { releaseSettings = resolve; });
        await page.route("**/api/v1/language-learning/settings", async (route) => { await settingsGate; await route.fallback(); });
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await expect(editor.getByTestId("web-ai-inherited-languages")).toContainText("日本語 / Japanese");
        await expect(editor.getByRole("textbox", { name: "계획 이름" })).toHaveValue("실무 작문 복사 검증");
        await expect(page.getByTestId("web-ai-plan-prerequisites")).toHaveCount(0);
        releaseSettings();
        releaseRun();

        // 검증: 복사 실패 후에도 서버 결과 계약과 일치하는 실제 텍스트를 직접 선택할 수 있다.
        await expect(footer.getByRole("alert")).toContainText("자동 복사가 차단");
        const actual = editor.getByRole("textbox", { name: "실제 복사할 전송 프롬프트" });
        await expect(actual).toBeVisible();
        const text = await actual.inputValue();
        expect(text).toContain("/external/prompt");
        expect(text).toContain("/external/results");
        expect(text).toContain("originalFeedbackMarkdown");
        expect(text).toContain('"runId": "run-id-1"');
        await editor.getByRole("button", { name: "전체 선택", exact: true }).click();
        expect(await actual.evaluate((element: HTMLTextAreaElement) => element.selectionEnd - element.selectionStart)).toBe(text.length);

        // 실행 / 검증: 두 번째 클릭은 새 HTTP 요청 없이 같은 문구를 즉시 복사한다.
        await footer.getByRole("button", { name: "프롬프트 복사" }).click();
        await expect(footer.getByRole("status")).toContainText("전송 프롬프트를 복사했습니다");
        expect(await page.evaluate(() => (window as unknown as { __webAiCopyAttempts: string[] }).__webAiCopyAttempts)).toEqual([text, text]);
        expect(connectionRequests).toBe(1);
        expect(runRequests).toBe(1);
        const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
        expect(storage).not.toContain("test-plan-token");
        mkdirSync(COPY_QA_DIRECTORY, { recursive: true });
        await page.screenshot({ path: path.join(COPY_QA_DIRECTORY, "actual-transfer-desktop.png") });
    });

    test("준비 API 실패와 새 수동 회차 실패는 기존 키와 실행 식별자를 보존한다", async ({ page }) => {
        // 준비: 복사는 성공하게 하고 첫 회차 준비만 일시적으로 실패시킨다.
        await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.resolve() } }));
        const { editor, footer } = await createReadyPlan(page);
        let connections = 0;
        const runKeys: string[] = [];
        let failNext = true;
        page.on("request", (request) => {
            if (request.method() === "POST" && /\/connection$/.test(request.url())) connections++;
        });
        await page.route("**/web-ai/plans/*/runs", async (route) => {
            runKeys.push(route.request().postDataJSON().executionKey);
            if (failNext) {
                failNext = false;
                await route.fulfill({ status: 503, body: "temporarily unavailable" });
            } else await route.fallback();
        });

        // 실행 / 검증: 서버 준비 실패를 클립보드 차단으로 잘못 안내하지 않고 같은 키로 재시도한다.
        await footer.getByRole("button", { name: "프롬프트 복사" }).click();
        await expect(footer.getByRole("button", { name: "프롬프트 복사" })).toBeEnabled();
        await expect(editor.getByRole("textbox", { name: "실제 복사할 전송 프롬프트" })).toHaveCount(0);
        await expect(footer.getByRole("alert")).toContainText("전송 프롬프트를 준비하지 못했습니다");
        await footer.getByRole("button", { name: "프롬프트 복사" }).click();
        await expect(footer.getByRole("status")).toContainText("전송 프롬프트를 복사했습니다");
        expect(connections).toBe(1);
        expect(runKeys[0]).toBe(runKeys[1]);
        const actual = editor.getByRole("textbox", { name: "실제 복사할 전송 프롬프트" });
        const previous = await actual.inputValue();

        // 실행 / 검증: 명시적 새 수동 회차만 새 실행 키를 사용하고 실패 시 이전 문구를 유지한다.
        const integration = page.getByTestId("web-ai-plan-integration");
        await integration.locator("summary").click();
        const renew = integration.getByRole("button", { name: "새 수동 학습 회차 준비" });
        failNext = true;
        await renew.click();
        await expect(integration.getByRole("alert")).toBeVisible();
        await expect(actual).toHaveValue(previous);
        await renew.click();
        await expect(integration.getByRole("status")).toContainText("준비했습니다");
        await expect(actual).not.toHaveValue(previous);
        expect(runKeys[2]).not.toBe(runKeys[1]);
        expect(runKeys[2]).toBe(runKeys[3]);
        expect(connections).toBe(1);
        await page.setViewportSize({ width: 390, height: 844 });
        await expect.poll(async () => (await page.locator("main.overflow-y-auto").boundingBox())?.x).toBe(0);
        mkdirSync(COPY_QA_DIRECTORY, { recursive: true });
        await page.screenshot({ path: path.join(COPY_QA_DIRECTORY, "actual-transfer-mobile.png") });
    });

    test("준비 도중 언어 변경과 키 교체 응답 유실에서는 이전 프롬프트를 복사하지 않는다", async ({ page }) => {
        // 준비: 실제 복사 시도를 기록하고 첫 회차 응답을 지연시킨다.
        await page.addInitScript(() => {
            const attempts: string[] = [];
            Object.defineProperty(window, "__webAiCopyAttempts", { value: attempts });
            Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: (text: string) => { attempts.push(text); return Promise.resolve(); } } });
        });
        const { editor, footer } = await createReadyPlan(page);
        let release!: () => void;
        const runGate = new Promise<void>((resolve) => { release = resolve; });
        let runs = 0;
        await page.route("**/web-ai/plans/*/runs", async (route) => { runs++; if (runs === 1) await runGate; await route.fallback(); });

        // 실행 / 검증: 같은 계정의 공통 언어가 바뀌면 늦게 도착한 이전 문맥을 복사하지 않는다.
        await footer.getByRole("button", { name: "프롬프트 복사" }).click();
        await expect.poll(() => runs).toBe(1);
        await page.route("**/api/v1/language-learning/settings", (route) => fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_SETTING, feedbackLanguage: "ja" })));
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await expect(editor.getByTestId("web-ai-inherited-languages")).not.toContainText("설명·피드백 언어한국어 / Korean");
        await expect(editor.getByTestId("web-ai-inherited-languages").getByText("日本語 / Japanese")).toHaveCount(2);
        release();
        await expect(footer.getByRole("button", { name: "프롬프트 복사" })).toBeEnabled();
        expect(await page.evaluate(() => (window as unknown as { __webAiCopyAttempts: string[] }).__webAiCopyAttempts)).toEqual([]);
        const actual = editor.getByRole("textbox", { name: "실제 복사할 전송 프롬프트" });
        await expect(actual).toHaveCount(0);

        // 실행 / 검증: 현재 문맥을 준비한 뒤 키 교체가 실패하면 이전 키가 든 문구를 폐기한다.
        await footer.getByRole("button", { name: "프롬프트 복사" }).click();
        await expect(footer.getByRole("status")).toContainText("전송 프롬프트를 복사했습니다");
        await expect(actual).toBeVisible();
        const integration = page.getByTestId("web-ai-plan-integration");
        await page.route("**/web-ai/plans/*/connection", (route) => route.fulfill({ status: 503, body: "response unavailable" }));
        page.once("dialog", (dialog) => dialog.accept());
        await integration.getByRole("button", { name: "연결 키 교체", exact: true }).click();
        await expect(integration.getByRole("alert")).toBeVisible();
        await expect(actual).toHaveCount(0);
        await footer.getByRole("button", { name: "프롬프트 복사" }).click();
        await expect(footer.getByRole("button", { name: "프롬프트 복사" })).toBeEnabled();
        expect(await page.evaluate(() => (window as unknown as { __webAiCopyAttempts: string[] }).__webAiCopyAttempts.length)).toBe(1);
    });

    test("모바일에서 월말 계획에 라이팅과 리딩을 함께 넣는다", async ({ page }) => {
        // 준비: 모바일 폭에서 계획 편집기를 연다.
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("/language-learning/settings/web-ai");
        await expect(page.getByTestId("web-ai-mobile-list-header")).toBeVisible();
        await expect(page.getByTestId("web-ai-schedule-editor")).toBeHidden();
        await expectSettingsBelowHeader(page);
        await page.getByRole("button", { name: "새 계획" }).first().click();
        const editor = page.getByTestId("web-ai-schedule-editor");
        await expect(page.getByTestId("web-ai-mobile-editor-header")).toBeVisible();
        await expect(page.getByTestId("web-ai-mobile-list-header")).toBeHidden();
        await expect(page.getByTestId("web-ai-schedule-list")).toBeHidden();
        await expectSettingsBelowHeader(page);

        // 실행: 월말 반복과 서로 다른 학습 분야를 지정한다.
        await editor.getByRole("textbox", { name: "계획 이름" }).fill("월말 작문·독해");
        await editor.getByRole("group", { name: "반복 방식" }).getByRole("button", { name: "매월" }).click();
        // 실행: 시각적으로 숨긴 1px input 대신 사용자가 누르는 월말 선택 영역을 클릭한다.
        const lastDay = editor.getByRole("checkbox", { name: "매월 마지막 날" });
        await lastDay.locator("..").click();
        await expect(lastDay).toBeChecked();
        await editor.getByRole("checkbox", { name: "번역 작문" }).check();
        await editor.getByRole("tab", { name: /리딩/ }).click();
        await editor.getByRole("checkbox", { name: "독해 문제" }).check();
        const footer = page.getByTestId("web-ai-schedule-footer");
        await footer.getByRole("button", { name: "학습 계획 저장" }).click();

        // 검증: 월말 규칙과 두 분야가 하나의 계획·프롬프트에 함께 남는다.
        await expect(footer.getByRole("status")).toContainText("저장했습니다");
        await expect(editor.locator("pre")).toContainText("매월 마지막 날");
        await expect(editor.locator("pre")).toContainText("[WRITING_TRANSLATION]");
        await expect(editor.locator("pre")).toContainText("[READING_COMPREHENSION]");
        await expect(editor.locator("pre")).toContainText("총 2문제");

        await page.evaluate(() => window.localStorage.setItem("theme", "dark"));
        await page.reload();
        await expect(page.locator("html")).toHaveClass(/dark/);
        await page.evaluate(() => {
            const scroller = document.querySelector<HTMLElement>("main.overflow-y-auto");
            if (scroller) scroller.scrollTop = 0;
        });
        mkdirSync(QA_DIRECTORY, { recursive: true });
        await page.screenshot({ path: path.join(QA_DIRECTORY, "mobile-list-dark.png") });
        await page.getByRole("button", { name: "수정" }).click();
        await page.evaluate(() => {
            const scroller = document.querySelector<HTMLElement>("main.overflow-y-auto");
            if (scroller) scroller.scrollTop = 0;
        });
        const widths = await page.evaluate(() => ({
            content: document.querySelector<HTMLElement>("main.overflow-y-auto")?.scrollWidth ?? 0,
            viewport: document.querySelector<HTMLElement>("main.overflow-y-auto")?.clientWidth ?? 0,
        }));
        expect(widths.content).toBeLessThanOrEqual(widths.viewport);
        await page.screenshot({ path: path.join(QA_DIRECTORY, "mobile-editor-top-dark.png") });
        await page.screenshot({ path: path.join(QA_DIRECTORY, "mobile-dark.png"), fullPage: true });
        await editor.getByRole("heading", { name: "문제 구성" }).evaluate((element) => {
            const scroller = document.querySelector<HTMLElement>("main.overflow-y-auto");
            if (scroller) {
                scroller.scrollTop += element.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 80;
            }
        });
        await page.screenshot({ path: path.join(QA_DIRECTORY, "mobile-areas-dark.png") });
        await page.getByRole("button", { name: "학습 스케줄 목록으로" }).click();
        await expect(page.getByTestId("web-ai-mobile-list-header")).toBeVisible();
        await expect(editor).toBeHidden();
    });

    test("저장된 계획의 연동 키는 브라우저 저장소에 남기지 않고 결과 JSON을 가져온다", async ({ page }) => {
        // 준비: 계정에 저장된 계획만 외부 연결과 학습 회차를 만들 수 있다.
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto("/language-learning/settings/web-ai");
        await page.getByRole("button", { name: "새 계획" }).first().click();
        const editor = page.getByTestId("web-ai-schedule-editor");
        await editor.getByRole("textbox", { name: "계획 이름" }).fill("고객 협의 연습");
        await editor.getByRole("checkbox", { name: "번역 작문" }).check();
        const integration = page.getByTestId("web-ai-plan-integration");
        await expect(integration.getByRole("button", { name: "연동 프롬프트 만들기" })).toBeDisabled();
        await page.getByTestId("web-ai-schedule-footer").getByRole("button", { name: "학습 계획 저장" }).click();
        await expect(integration.getByRole("button", { name: "연동 프롬프트 만들기" })).toBeEnabled();

        // 실행: 서버가 준 일회 노출 프롬프트와 수동 결과 가져오기를 사용한다.
        await integration.getByRole("button", { name: "연동 프롬프트 만들기" }).click();
        await expect(editor.getByRole("textbox", { name: "실제 복사할 전송 프롬프트" })).toHaveValue(/test-plan-token/);
        const storage = await page.evaluate(() => JSON.stringify({ ...window.localStorage }));
        expect(storage).not.toContain("test-plan-token");
        await integration.locator("summary").click();
        const input = integration.getByRole("textbox", { name: "웹 AI 결과 JSON" });
        await input.fill("{broken");
        await integration.getByRole("button", { name: "결과 저장 및 AI 검증" }).click();
        await expect(integration.getByRole("alert")).toContainText("결과 JSON 형식을 확인");
        await input.fill(JSON.stringify({ runId: "run-id", submissionId: "submission-id", originalFeedbackMarkdown: "## 상세 피드백", items: [{ itemId: "WRITING_TRANSLATION:STANDARD:1", areaCode: "WRITING_TRANSLATION", difficulty: "STANDARD", promptText: "확인 부탁드립니다.", answerText: "ご確認をお願いいたします。", requiredIntents: [], externalFeedbackMarkdown: "자연스러운 표현입니다.", keywordKeys: [] }] }));
        await integration.getByRole("button", { name: "결과 저장 및 AI 검증" }).click();

        // 검증: JSON을 서버에 전달한 뒤 기존 학습 이력으로 연결한다.
        await expect(integration.getByRole("status")).toContainText("결과를 저장했습니다");
        await expect(integration.getByRole("link", { name: "학습 이력 보기" })).toBeVisible();
    });
});
