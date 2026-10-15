import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test } from "../fixtures/mock-test";
import { mockLanguageLearningBase } from "../support/language-learning-mocks";
import { fulfillApiJson } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { buildWebAiPrompt } from "../../src/features/language-learning/web-ai/webAiPrompt";
import type { WebAiAreaCode } from "../../src/features/language-learning/web-ai/webAiSchedule";
import type { WebAiPlan, WebAiPlanRequest } from "../../src/types/language-learning/webAi";

const QA_DIRECTORY = path.resolve("..", ".codex-workspace", "verification", "fe", "web-ai-settings-mobile-update");

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
                const prompt = buildWebAiPrompt(plan, "ko", {} as Record<WebAiAreaCode, string>);
                await fulfillApiJson(route, responseDto({ id: "run-id", planId: plan.id, executionKey: request.postDataJSON().executionKey, prompt }));
                return;
            }
            if (/^\/plans\/[^/]+\/connection$/.test(path) && request.method() === "POST") {
                const promptUrl = "/api/v1/language-learning/web-ai/external/prompt";
                const resultUrl = "/api/v1/language-learning/web-ai/external/results";
                await fulfillApiJson(route, responseDto({ token: "test-plan-token", planId: path.split("/")[2], promptUrl, resultUrl, bootstrapPrompt: `Authorization: Bearer test-plan-token\nGET ${promptUrl}\nPOST ${resultUrl}` }));
                return;
            }
            if (path === "/results" && request.method() === "POST") {
                await fulfillApiJson(route, responseDto({ id: "result-id", status: "PENDING" }));
                return;
            }
            await route.fulfill({ status: 404, body: "Unexpected web AI request" });
        });
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
        await expect(footer.getByRole("status")).toContainText("프롬프트를 복사했습니다");
        const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardText).toContain("매주 월·수요일");
        expect(clipboardText).toContain("총 5문제");
        expect(clipboardText).toContain('출제 키워드: ["Shopping"]');

        await page.evaluate(() => {
            const scroller = document.querySelector<HTMLElement>("main.overflow-y-auto");
            if (scroller) scroller.scrollTop = 0;
        });
        mkdirSync(QA_DIRECTORY, { recursive: true });
        await page.screenshot({ path: path.join(QA_DIRECTORY, "desktop-light.png"), fullPage: true });
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
        await editor.getByRole("checkbox", { name: "매월 마지막 날" }).check();
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
        await expect(integration.getByRole("textbox", { name: "웹 AI 연동", exact: true })).toHaveValue(/test-plan-token/);
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
