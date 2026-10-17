import type { Page } from "@playwright/test";
import { test, expect, installMockAuthCookie } from "../fixtures/mock-test";
import { fulfillApiJson, fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { mockChatLanguageSettings } from "../support/chat-mocks";
import { LANGUAGE_LEARNING_KEYWORDS, LANGUAGE_LEARNING_SETTING, mockLanguageLearningBase } from "../support/language-learning-mocks";
import { makeDefaultLanguageSettings, makeRoomListItem, responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";
import accountBookMessages from "../../messages/en/accountBook.json";
import learningMessages from "../../messages/en/languageLearning.json";
import chatMessages from "../../messages/en/chat.json";
import settingsMessages from "../../messages/en/settings.json";
import { guideI18n } from "../../src/lib/docs/i18n";

const unhandledRequests = new WeakMap<Page, string[]>();
const languageCatalog = [
    { code: "ko", name: "한국어" }, { code: "ja", name: "日本語" },
    { code: "en", name: "English" }, { code: "fr", name: "프랑스어" },
];

test.beforeEach(async ({ page, context }) => {
    // 준비: 실제 BE에 도달하기 전에 모든 업무 API를 막고 각 시나리오의 합성 응답만 허용한다.
    const unexpected: string[] = [];
    unhandledRequests.set(page, unexpected);
    await page.route("**/api/v1/**", route => {
        unexpected.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
        return fulfillJson(route, responseDto({ code: "UNMOCKED_ENGLISH_UI_ENDPOINT" }), 503);
    });
    await installMockAuthCookie(context, "ADMIN");
    await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
    await mockIdleWebSocket(page);
    await page.route("**/api/v1/languages", route => fulfillJson(route, responseDto(languageCatalog)));
    await page.route("**/chat/rooms", route => fulfillJson(route, responseDto({ chatRooms: [makeRoomListItem({
        id: 501, name: "English practice room", roomType: "GROUP", sourceType: "MANUAL", memberCount: 3,
    })] })));
});

test.afterEach(async ({ page }) => {
    // 검증: 누락된 mock도 실제 API로 전송하지 않으며 시험 결과에서 숨기지 않는다.
    expect(unhandledRequests.get(page) ?? [], "Every backend request must have an explicit mock").toEqual([]);
});

test("EN-UI-01 상단 English 선택은 현재 채팅 query와 함께 영어 UI로 전환한다", async ({ page }, testInfo) => {
    // 준비
    await page.goto("/ko/chat?tab=chat&filter=unread&page=2");
    await expect(page.getByRole("heading", { level: 1, name: "채팅", exact: true })).toBeVisible();

    // 실행: 헤더의 실제 언어 메뉴를 사용한다.
    await page.getByRole("button", { name: "Language", exact: true }).click();
    await page.getByRole("menuitem", { name: "English", exact: true }).click();

    // 검증: 경로·query·표시 언어가 함께 바뀌며 채팅의 사용자 데이터는 그대로 남는다.
    await expect(page).toHaveURL(/\/en\/chat\?tab=chat&filter=unread&page=2$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1, name: chatMessages.ChatHub.title, exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Friends", exact: true })).toBeVisible();
    await expect(page.getByText("English practice room", { exact: true })).toBeVisible();
    await expect(page.getByTestId("app-sidebar")).toContainText("Language learning");
    await page.getByRole("button", { name: "Language", exact: true }).click();
    await expect(page.getByRole("menuitem")).toHaveCount(4);
    await page.screenshot({ path: testInfo.outputPath("en-language-menu.png"), fullPage: true, animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("en-chat.png"), fullPage: true, animations: "disabled" });
});

test("EN-UI-02 DB 카탈로그의 추가 언어는 번역키 없이도 French로 선택·저장한다", async ({ page }) => {
    // 준비: fr은 Common.languages에 없는 합성 DB 언어이며 DB 이름도 영어가 아니다.
    await mockChatLanguageSettings(page);
    await page.goto("/en/settings/chat");
    const labels = settingsMessages.Settings.chatPage.defaultLanguage;
    const original = page.getByRole("combobox", { name: labels.originalLanguage, exact: true });
    const translation = page.getByRole("combobox", { name: labels.translationLanguage, exact: true });

    // 실행
    await expect(original.locator('option[value="fr"]')).toHaveText("French");
    await expect(translation.locator('option[value="fr"]')).toHaveText("French");
    await translation.selectOption("fr");
    const saved = page.waitForRequest(request => request.method() === "PATCH" && request.url().endsWith("/users/me/chat-language-settings"));
    await page.getByRole("button", { name: labels.save, exact: true }).click();

    // 검증: en UI·프랑스어 content target·DB code는 독립적이다.
    expect((await saved).postDataJSON()).toMatchObject({ translationLanguageCode: "fr" });
    await expect(translation).toHaveValue("fr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("EN-UI-06 DB 언어 카탈로그 장애 중에도 저장된 French 선택을 유지한다", async ({ page }) => {
    // 준비: DB 조회가 실패해도 이미 저장한 언어의 코드와 표시를 보존한다.
    await mockChatLanguageSettings(page, {
        defaultLanguageSettings: makeDefaultLanguageSettings({ translationLanguageCode: "fr" }),
    });
    await page.route("**/api/v1/languages", route => fulfillJson(route, responseDto(null), 503));

    // 실행
    await page.goto("/en/settings/chat");
    const labels = settingsMessages.Settings.chatPage.defaultLanguage;
    const translation = page.getByRole("combobox", { name: labels.translationLanguage, exact: true });

    // 검증: 기본 한국어로 바뀌거나 선택지가 사라지지 않는다.
    await expect(translation).toHaveValue("fr");
    await expect(translation.locator('option[value="fr"]')).toHaveText("French");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("EN-UI-03 가계부·음성·학습 설정은 영어 UI에서 실제 form labels와 옵션을 렌더한다", async ({ page }, testInfo) => {
    // 준비: 조회·설정 저장만 합성하고 음성·문제 생성·모델 실행 endpoint는 허용하지 않는다.
    await page.route("**/api/v1/account-books**", route => fulfillJson(route, responseDto([])));
    await page.route("**/currencies", route => fulfillJson(route, responseDto([
        { id: 1, code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2, baseCurrency: true },
    ])));
    await page.route("**/voice/sessions**", route => fulfillJson(route, responseDto({ items: [], nextCursor: null })));

    // 실행 / 검증: 가계부 생성 모달의 영문 입력 항목까지 표시한다.
    const accountBooksLoaded = page.waitForResponse(response => response.url().includes("/api/v1/account-books"));
    await page.goto("/en/account-books");
    await accountBooksLoaded;
    const book = accountBookMessages.AccountBook;
    await expect(page.getByRole("heading", { level: 1, name: book.title, exact: true })).toBeVisible();
    await page.getByRole("button", { name: book.actions.create, exact: true }).click();
    await expect(page.getByRole("heading", { name: book.createModal.title, exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(book.createModal.placeholders.name, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: book.createModal.actions.cancel, exact: true }).click();

    // 실행 / 검증: 녹음·번역은 시작하지 않고 음성 설정의 영어 label과 target을 확인한다.
    await page.goto("/en/voice");
    await expect(page.getByRole("heading", { level: 1, name: "Live voice translation", exact: true })).toBeVisible();
    const voiceLanguage = page.getByRole("combobox", { name: "Translation language", exact: true });
    await expect(voiceLanguage.locator('option[value="en"]')).toHaveText("English");
    await voiceLanguage.selectOption("en");
    await expect(page.getByRole("button", { name: "Start translation", exact: true })).toBeVisible();

    // 실행 / 검증: UI en과 학습 ko→en을 구분하고 현지화된 form을 실제로 렌더한다.
    await mockLanguageLearningBase(page);
    await page.route("**/api/v1/languages", route => fulfillJson(route, responseDto(languageCatalog)));
    await page.route("**/api/v1/language-learning/settings", route => fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_SETTING, learningLanguage: "en" })));
    await page.route("**/api/v1/language-learning/keywords", route => fulfillApiJson(route, responseDto({
        ...LANGUAGE_LEARNING_KEYWORDS,
        systemKeywords: LANGUAGE_LEARNING_KEYWORDS.systemKeywords.map(keyword => ({ ...keyword,
            displayName: ({ IT: "IT", IT_DEPLOYMENT: "Deployment", SHOPPING: "Shopping", SHOPPING_PRICE: "Price" } as Record<string, string>)[keyword.canonicalKey] })),
    })));
    await page.goto("/en/language-learning/settings");
    const form = page.locator("#learning-settings");
    await expect(form.getByRole("heading", { name: learningMessages.LanguageLearning.settings.form.title, exact: true })).toBeVisible();
    await expect(form.locator("select").first().locator('option[value="en"]')).toHaveText("English");
    await expect(form.locator("select").nth(1)).toHaveValue("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await form.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("en-learning-settings.png"), fullPage: true, animations: "disabled" });
});

test("EN-UI-04 익명 영어 로그인과 보호 경로 redirect는 영어 locale을 유지한다", async ({ page, context }) => {
    // 준비: 이 시험 전용 context의 가짜 쿠키만 지운다. 실행 중인 사용자 브라우저는 사용하지 않는다.
    await context.clearCookies();
    await page.route("**/api/auth/session", route => fulfillJson(route, {}));

    // 실행 / 검증: 영어 로그인에 필요한 UI가 실제로 표시된다.
    await page.goto("/en/login");
    await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google", exact: true })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await page.goto("/en/chat?tab=friends");
    await expect(page).toHaveURL(/\/en\/login\?/);
    const redirected = new URL(page.url());
    const callback = new URL(redirected.searchParams.get("callbackUrl") ?? "", redirected.origin);
    expect(callback.pathname).toBe("/en/chat");
    expect(callback.searchParams.get("tab")).toBe("friends");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
});

test("EN-UI-05 기존 KR·JP·JPKR 전환과 등록된 공개 가이드를 유지한다", async ({ page, context }) => {
    // 준비
    await page.goto("/en/chat?keep=locale-check");

    // 실행 / 검증: 기존 세 메뉴를 실제로 선택하며 query도 그대로 유지한다.
    for (const [name, locale, title] of [["한국어", "ko", "채팅"], ["日本語", "ja", "チャット"], ["학습 모드", "learning", "チャット"]] as const) {
        await page.getByRole("button", { name: "Language", exact: true }).click();
        await page.getByRole("menuitem", { name, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/${locale}/chat\\?keep=locale-check$`));
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
    }

    // 실행 / 검증: 별도 가이드 작업의 등록 언어를 따르므로 en 문서가 없는 배포에서도 기존 공개 가이드를 검증한다.
    await context.clearCookies();
    await page.route("**/api/auth/session", route => fulfillJson(route, {}));
    const guideLocale = guideI18n.languages.some(language => String(language) === "en") ? "en" : "ja";
    const response = await page.goto(`/${guideLocale}/docs`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/${guideLocale}/docs$`));
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", guideLocale);
});
