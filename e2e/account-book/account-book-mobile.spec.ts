import type { Page, Locator } from "@playwright/test";
import { expect, test } from "../fixtures/mock-test";
import { fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import translations from "../../messages/ko/accountBook.json";
import jaTranslations from "../../messages/ja/accountBook.json";

// 표는 점 메뉴, 축약 목록은 기존 링크를 통해 같은 편집 모달을 연다.
async function openReviewEditor(page: Page, row: Locator = page.getByTestId("receipt-review-card").first(), labels = receiptLabels) {
    const menu = row.getByTestId("receipt-row-menu-trigger");
    if (await menu.count()) {
        await menu.click();
        await page.getByRole("menuitem", { name: labels.receipt.review.reviewEdit, exact: true }).click();
        return menu;
    }
    const trigger = row.getByRole("button", { name: labels.receipt.review.reviewEdit, exact: true });
    await trigger.click();
    return trigger;
}

const longName = "InternationalStoreWithAVeryLongUnbrokenName".repeat(3);
const book = { id: 1, name: longName, description: longName, category: longName,
    currencyCode: "KWD", currencySymbol: "KD", currencyDecimalPlaces: 3,
    incomeAmount: "9007199254740993.125", expenseAmount: "23456789.125",
    balance: "9007199231284204.000", transactionCount: 21, myRole: "OWNER" };
const transaction = { id: 1, accountBookId: 1, type: "EXPENSE", title: longName,
    storeName: longName, category: longName, amount: "123456789.125",
    transactionDate: "2026-09-15", memo: longName, sourceType: null,
    sourceId: null, sourceYear: null, sourceMonth: null };
const goal = { id: 1, accountBookId: 1, year: 2026, month: 9,
    goalAmount: "999999999.125", expenseAmount: "123456789.125",
    remainingAmount: "876543210.000", usageRate: 12.35, exceeded: false };

const receiptLabels = translations.AccountBook.detail.transactionModal;
const locales = {
    ko: translations.AccountBook.detail,
    ja: jaTranslations.AccountBook.detail,
} as const;
const receipt = { receiptId: "receipt-1", title: "Coffee", storeName: longName.slice(0, 90),
    originalAmount: "12.34", detectedCurrencyCode: "USD", originalCurrencyCode: "USD",
    transactionDate: "2026-09-15", categoryName: "Food", memo: longName,
    categorySource: "EXISTING", categoryReason: "Matched an active account-book category.",
    confidence: 0.97, detectedLanguage: "en", status: "READY", warnings: [],
    accountBookCurrencyCode: "KWD", convertedAmount: "3.784", exchangeRate: "0.30664",
    requestedRateDate: "2026-09-15", effectiveRateDate: "2026-09-15",
    exchangeRateProvider: "FRANKFURTER", rateFetchedAt: "2026-09-15T09:00:00Z",
    convertedAt: "2026-09-21T01:00:00Z", roundingPrecision: 3, roundingMode: "HALF_UP",
    conversionPolicyVersion: "receipt-fx-v1", conversionQuoteId: "a".repeat(64),
    conversionStatus: "CONVERTED", rateDateFallback: false };

function receiptCandidates(count: number) {
    const candidates: Array<Record<string, unknown>> = Array.from({ length: count }, (_, index) => ({
        ...receipt,
        receiptId: `receipt-${index + 1}`,
        title: `${longName}-${index + 1}`.slice(0, 100),
        detectedLanguage: index % 2 === 0 ? "en" : "ja",
    }));
    if (count > 1) candidates[1] = {
        ...candidates[1], title: "Déjeuner", detectedCurrencyCode: "EUR", originalCurrencyCode: "EUR", detectedLanguage: "fr",
    };
    if (count > 2) candidates[2] = {
        ...candidates[2], title: null, originalAmount: null, detectedCurrencyCode: null,
        originalCurrencyCode: null, transactionDate: null, convertedAmount: null, exchangeRate: null,
        status: "UNREADABLE", conversionStatus: "NEEDS_REVIEW", warnings: ["AMBIGUOUS_CURRENCY_SYMBOL"],
    };
    return candidates;
}

async function openReceiptReview(
    page: Page,
    locale: keyof typeof locales = "ko",
    receiptCount = 3,
    firstReceiptOverride: Record<string, unknown> = {},
    secondReceiptOverride: Record<string, unknown> = {},
    analysisWarnings: string[] = [],
) {
    const detail = locales[locale];
    const labels = detail.transactionModal;
    await page.route("**/transactions/receipt-analysis", route => fulfillJson(route, responseDto({
        receiptCount, warnings: analysisWarnings, ocrEngine: "vision", usedAi: true,
        categoryOptions: [
            { name: "Food", source: "EXISTING" },
            { name: "생활", source: "DEFAULT" },
            { name: "기타", source: "FALLBACK" },
        ],
        receipts: receiptCandidates(receiptCount).map((candidate, index) =>
            index === 0 ? { ...candidate, ...firstReceiptOverride } : index === 1 ? { ...candidate, ...secondReceiptOverride } : candidate),
    })));
    await page.goto(`/${locale}/account-books/1`);
    await page.getByRole("button", { name: detail.header.createTransaction, exact: true }).click();
    await page.getByRole("button", { name: labels.inputMode.receipt, exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "three-receipts.png", mimeType: "image/png",
        buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
    await page.getByRole("button", { name: labels.receipt.action, exact: true }).last().click();
    await expect(page.getByTestId("receipt-review-card")).toHaveCount(receiptCount);
}

async function mockAccountBook(page: Page) {
    await mockCommonPageDependencies(page);
    await mockIdleWebSocket(page);
    await page.route("**/currencies", route => fulfillJson(route, responseDto([
        { id: 1, code: "KWD", name: longName, symbol: "KD", decimalPlaces: 3, baseCurrency: false },
    ])));
    await page.route("**/api/v1/account-books**", async route => {
        const url = new URL(route.request().url());
        const suffix = url.pathname.split("/account-books")[1];
        let body: unknown;
        switch (suffix) {
            case "": body = [book]; break;
            case "/1": body = book; break;
            case "/1/summary": body = { ...book, accountBookId: 1 }; break;
            case "/1/categories": body = [
                { id: 1, accountBookId: 1, name: "Food", active: true, displayOrder: 0 },
                { id: 2, accountBookId: 1, name: "Archived", active: false, displayOrder: 1 },
            ]; break;
            case "/1/transactions": body = { page: { content: [transaction], page: { size: 20, number: 0, totalElements: 21, totalPages: 2 } }, currencyName: "KWD" }; break;
            case "/1/transactions/months": body = [{ value: "2026-09", label: "2026-09", year: 2026, month: 9, currentMonth: true }]; break;
            case "/1/transactions/stores/suggestions": body = [{ storeName: url.searchParams.get("type") === "INCOME" ? "給与会社" : longName }]; break;
            case "/1/monthly-goals": body = goal; break;
            case "/1/monthly-goals/list": body = [goal]; break;
            case "/1/charts/monthly": body = { year: 2026, months: Array.from({ length: 12 }, (_, i) => ({ year: 2026, month: i + 1, incomeAmount: "987654321.125", expenseAmount: String((i + 1) * 12345678.125), balance: "10.000", expenseGoalAmount: "150000000.125" })) }; break;
            case "/1/charts/categories":
            case "/1/charts/stores": body = { year: 2026, month: 9, totalAmount: "123456789.125", items: [{ name: longName, amount: "123456789.125", percentage: 100, transactionCount: 21 }] }; break;
            case "/1/fixed-costs": body = [{ ...transaction, paymentDay: 15, startYear: 2026, startMonth: 1, endYear: null, endMonth: null, lastGeneratedYear: 2026, lastGeneratedMonth: 9, active: true }]; break;
            case "/1/fixed-costs/generation-targets": body = { year: 2026, month: 9, count: 1, targets: [{ ...transaction, fixedCostId: 1, paymentDay: 15 }] }; break;
            case "/1/members": body = [{ id: 1, userId: 1, publicId: longName, username: longName, role: "OWNER" }, { id: 2, userId: 2, publicId: longName, username: longName, role: "MEMBER" }]; break;
            case "/1/invitations": body = []; break;
            default: return route.fallback();
        }
        await fulfillJson(route, responseDto(body));
    });
}

async function expectNoPageOverflow(page: Page) {
    const overflow = await page.locator("main").evaluateAll(mains => mains.filter(main => main.scrollWidth > main.clientWidth + 1)
        .map(main => ({ width: main.clientWidth, scroll: main.scrollWidth,
            children: Array.from(main.querySelectorAll("*"))
                .filter(el => { const rect = el.getBoundingClientRect(); return rect.right > innerWidth + 1 && rect.width > 0 && !el.closest("table"); })
                .slice(0, 16).map(el => ({ tag: el.tagName, classes: el.getAttribute("class"), width: el.getBoundingClientRect().width })) })));
    if (overflow.length) console.log("Overflow diagnostics", JSON.stringify(overflow));
    await expect.poll(() => page.evaluate(() => ({
        root: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        // AppShell already has overflow-x-hidden. Check its content width too so clipping cannot hide a regression.
        main: Array.from(document.querySelectorAll("main")).every(el => el.scrollWidth <= el.clientWidth + 1),
    }))).toEqual({ root: true, main: true });
    const outside = await page.locator("input:visible, select:visible, textarea:visible, button:visible").evaluateAll(elements =>
        elements.filter(element => !element.closest('[aria-hidden="true"], [inert], [data-testid="transaction-table-scroll"], table'))
            .filter(element => { const rect = element.getBoundingClientRect(); return rect.right > innerWidth + 1 || rect.left < -1; })
            .map(element => element.outerHTML.slice(0, 160)));
    expect(outside).toEqual([]);
}

test("ACCOUNT-RECEIPT multi-file queue keeps one source-linked review per photo", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockAccountBook(page);
    let analysisCalls = 0;
    let activeAnalysisCalls = 0;
    let maxActiveAnalysisCalls = 0;
    let releaseLastPhoto!: () => void;
    const lastPhotoPending = new Promise<void>(resolve => { releaseLastPhoto = resolve; });
    await page.route("**/transactions/receipt-analysis", async route => {
        analysisCalls += 1;
        activeAnalysisCalls += 1;
        maxActiveAnalysisCalls = Math.max(maxActiveAnalysisCalls, activeAnalysisCalls);
        const candidate = {
            ...receiptCandidates(1)[0],
            receiptId: `receipt-${analysisCalls}`,
            title: `Source receipt ${analysisCalls}`,
        };
        try {
            await new Promise(resolve => setTimeout(resolve, 60));
            if (candidate.receiptId === "receipt-3") await lastPhotoPending;
            return fulfillJson(route, responseDto({
                receiptCount: 1,
                warnings: [],
                ocrEngine: "vision",
                usedAi: true,
                categoryOptions: [{ name: "Food", source: "EXISTING" }, { name: "기타", source: "FALLBACK" }],
                receipts: [candidate],
            }));
        } finally {
            activeAnalysisCalls -= 1;
        }
    });

    await page.goto("/account-books/1");
    await page.getByRole("button", { name: "거래 등록", exact: true }).click();
    await page.getByRole("button", { name: receiptLabels.inputMode.receipt, exact: true }).click();
    const pixel = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64"
    );
    await page.locator('input[type="file"]').setInputFiles([
        { name: "receipt-a.png", mimeType: "image/png", buffer: pixel },
        { name: "receipt-b.png", mimeType: "image/png", buffer: pixel },
        { name: "receipt-c.png", mimeType: "image/png", buffer: pixel },
    ]);

    const queue = page.getByTestId("receipt-file-queue");
    await expect(queue.locator("li")).toHaveCount(3);
    await expect(queue).toContainText("receipt-a.png");
    await expect(queue).toContainText("receipt-b.png");
    await expect(queue).toContainText("receipt-c.png");
    await page.getByRole("button", { name: receiptLabels.receipt.action, exact: true }).last().click();

    const cards = page.getByTestId("receipt-review-card");
    // 늦은 사진의 기본 선택이 앞선 사진에서 사용자가 해제한 선택을 덮지 않는다.
    await expect(cards).toHaveCount(2);
    await expect(cards.first().getByRole("checkbox")).toBeChecked();
    await cards.first().getByRole("checkbox").uncheck();
    releaseLastPhoto();
    await expect(cards).toHaveCount(3);
    await expect(cards.first().getByRole("checkbox")).not.toBeChecked();
    await expect(cards.nth(1).getByRole("checkbox")).toBeChecked();
    await expect(cards.nth(2).getByRole("checkbox")).toBeChecked();
    expect(analysisCalls).toBe(3);
    expect(maxActiveAnalysisCalls).toBe(3);
    await expect(cards.nth(0)).toContainText("receipt-a.png · r1");
    await expect(cards.nth(1)).toContainText("receipt-b.png · r1");
    await expect(cards.nth(2)).toContainText("receipt-c.png · r1");
    const analysisToggle = page.getByRole("button", { name: /사진 3 · 영수증 3/ });
    if (await analysisToggle.getAttribute("aria-expanded") === "false") await analysisToggle.click();
    await expect(queue.getByText(/완료/)).toHaveCount(3);
    await expectNoPageOverflow(page);
});

test("ACCOUNT-RECEIPT keeps a slow successful analysis response instead of marking the photo failed", async ({ page }) => {
    test.setTimeout(90_000);

    // 준비: 운영에서 관측한 35초 초과 응답을 같은 브라우저 요청 경로로 재현한다.
    await mockAccountBook(page);
    await page.route("**/transactions/receipt-analysis", async route => {
        await new Promise(resolve => setTimeout(resolve, 38_000));
        await fulfillJson(route, responseDto({
            receiptCount: 1,
            warnings: [],
            ocrEngine: "vision",
            usedAi: true,
            categoryOptions: [{ name: "Food", source: "EXISTING" }],
            receipts: receiptCandidates(1),
        }));
    });
    await page.goto("/account-books/1");
    await page.getByRole("button", { name: "거래 등록", exact: true }).click();
    await page.getByRole("button", { name: receiptLabels.inputMode.receipt, exact: true }).click();
    const pixel = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64"
    );
    await page.locator('input[type="file"]').setInputFiles({ name: "slow-receipt.png", mimeType: "image/png", buffer: pixel });

    // 실행: 사용자가 실제 분석 버튼을 눌러 응답 완료까지 기다린다.
    await page.getByRole("button", { name: receiptLabels.receipt.action, exact: true }).last().click();

    // 검증: 늦게 도착한 성공 결과가 같은 사진의 검토 목록에 남는다.
    await expect(page.getByTestId("receipt-review-card")).toHaveCount(1, { timeout: 50_000 });
    await expect(page.getByTestId("receipt-file-queue")).toContainText("slow-receipt.png");
    await expect(page.getByTestId("receipt-file-queue")).not.toContainText("실패");
});

test("ACCOUNT-RECEIPT category blocker focuses the shared selector and resolves without refreshing FX", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockAccountBook(page);
    let conversionCalls = 0;
    await page.route("**/transactions/receipt-conversion", route => {
        conversionCalls += 1;
        return fulfillJson(route, responseDto(receipt));
    });
    await page.route("**/transactions/receipt-analysis", route => fulfillJson(route, responseDto({
        receiptCount: 3, warnings: [], ocrEngine: "vision", usedAi: true,
        categoryOptions: [
            { name: "Food", source: "EXISTING" },
            { name: "생활", source: "DEFAULT" },
            { name: "기타", source: "FALLBACK" },
        ],
        receipts: [
            { ...receipt, receiptId: "valid-1", title: "Valid one" },
            { ...receipt, receiptId: "valid-2", title: "Valid two" },
            { ...receipt, receiptId: "needs-category", title: "Needs category", categoryName: null, status: "NEEDS_REVIEW", warnings: ["CATEGORY_REQUIRES_REVIEW"] },
        ],
    })));
    await page.goto("/account-books/1");
    await page.getByRole("button", { name: "거래 등록", exact: true }).click();
    await page.getByRole("button", { name: receiptLabels.inputMode.receipt, exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "missing-category.png", mimeType: "image/png",
        buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
    await page.getByRole("button", { name: receiptLabels.receipt.action, exact: true }).last().click();
    const row = page.getByTestId("receipt-review-card").last();
    await expect(row).toHaveClass(/bg-red/);
    await expect(row.getByRole("checkbox")).toBeChecked();
    await expect(page.getByTestId("receipt-submit-selected")).toBeDisabled();
    await expect(page.getByText("3건 선택 · 등록 가능 2건 · 확인 필요 1건", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /카테고리를 선택해 주세요/ }).click();
    const category = page.getByTestId("receipt-review-editor").getByRole("combobox", { name: receiptLabels.fields.category, exact: true });
    await expect(category).toBeFocused();
    await expect(category.locator("option")).toContainText(["카테고리를 선택해 주세요", "Food", "생활", "기타", "직접 입력"]);
    await category.selectOption("Food");
    await expect(page.getByText("거래 카테고리를 확인하고 입력하세요.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true }).click();
    await expect(page.getByText("3건 선택 · 등록 가능 3건 · 확인 필요 0건", { exact: true })).toBeVisible();
    await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
    await expect(page.getByTestId("receipt-review-card").last()).toHaveClass(/bg-emerald/);
    expect(conversionCalls).toBe(0);
});

test("ACCOUNT category loading, failure retry, empty state and direct input stay distinct", async ({ page }) => {
    await mockAccountBook(page);
    let mode: "loading" | "error" | "empty" = "loading";
    let releaseLoading!: () => void;
    const loading = new Promise<void>((resolve) => { releaseLoading = resolve; });
    await page.route("**/account-books/1/categories", async route => {
        if (mode === "loading") await loading;
        if (mode === "error") return fulfillJson(route, responseDto(null), 500);
        return fulfillJson(route, responseDto([]));
    });
    await page.goto("/account-books/1");
    await page.getByRole("button", { name: "거래 등록", exact: true }).click();
    await expect(page.getByText("카테고리 후보를 불러오는 중입니다.", { exact: true })).toBeVisible();
    mode = "error";
    releaseLoading();
    await expect(page.getByText("카테고리 후보 조회에 실패했습니다.", { exact: true })).toBeVisible();
    mode = "empty";
    await page.getByRole("button", { name: "다시 조회", exact: true }).click();
    await expect(page.getByText("등록된 카테고리가 없습니다. 직접 입력할 수 있습니다.", { exact: true })).toBeVisible();
    const category = page.getByRole("dialog").getByRole("combobox", { name: receiptLabels.fields.category, exact: true });
    await category.selectOption("__DIRECT_INPUT__");
    await page.getByPlaceholder(receiptLabels.placeholders.directCategoryName, { exact: true }).fill("직접 카테고리");
    await expect(page.getByText("카테고리를 선택해 주세요.", { exact: true })).toHaveCount(0);
});

test("ACCOUNT transaction detail preserves receipt snapshots and labels income source", async ({ page }) => {
    await mockAccountBook(page);
    const receiptTransaction = {
        ...transaction, originalAmount: "5020", originalCurrencyCode: "JPY", purchaseTotal: "7089", bookAmount: "5020",
        amount: "45.00", targetCurrencyCode: "KWD", exchangeRate: "0.008964", requestedRateDate: "2026-09-15",
        effectiveRateDate: "2026-09-15", exchangeRateProvider: "FRANKFURTER", rateFetchedAt: "2026-09-15T09:00:00Z",
        convertedAt: "2026-09-21T01:00:00Z", roundingPrecision: 3, roundingMode: "HALF_UP", conversionPolicyVersion: "receipt-fx-v1",
        receiptPaymentBreakdownJson: JSON.stringify([{ paymentType: "LOYALTY_POINTS", amount: "2069", evidence: "ポイント支払", duplicateGroup: null }, { paymentType: "CREDIT_CARD", amount: "5020", evidence: "カード", duplicateGroup: null }]),
        amountReason: "SETTLED_PAYMENT_EXCLUDING_LOYALTY_POINTS", receiptBranchName: "船堀店", receiptTransactionTime: "20:13:39", receiptAnalysisRevision: 1,
    };
    const income = { ...transaction, id: 2, type: "INCOME", title: "給与", storeName: "給与会社", category: "給与", amount: "1000", originalAmount: null };
    await page.route("**/account-books/1/transactions", route => fulfillJson(route, responseDto({ page: { content: [receiptTransaction, income], page: { size: 20, number: 0, totalElements: 2, totalPages: 1 } }, currencyName: "KWD" })));
    await page.goto("/account-books/1");
    const details = page.getByRole("button", { name: "거래 상세보기", exact: true });
    await details.first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("7,089 JPY");
    await expect(dialog).toContainText("2,069");
    await expect(dialog).toContainText("FRANKFURTER");
    await expect(dialog).not.toContainText("receiptSourceImageId");
    await dialog.getByRole("button", { name: "수정 화면으로 이동", exact: true }).click();
    const editDialog = page.getByRole("dialog");
    await expect(editDialog.getByRole("spinbutton", { name: /^금액/ })).toBeDisabled();
    await expect(editDialog.getByRole("textbox", { name: /^거래일/ })).toBeDisabled();
    await expect(editDialog).toContainText("환율 기록을 보존하기 위해 변경할 수 없습니다");
    await editDialog.getByRole("button", { name: "모달 닫기", exact: true }).click();
    await details.nth(1).click();
    await expect(page.getByRole("dialog")).toContainText("수입처");
    await expect(page.getByRole("dialog")).toContainText("給与会社");
});

test("ACCOUNT-RECEIPT list table editor transitions preserve selection and cancel isolated draft", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockAccountBook(page);
    await openReceiptReview(page, "ko", 3);
    await expect(page.getByTestId("receipt-review-compact-list")).toBeVisible();
    const rows = page.getByTestId("receipt-review-card");
    await rows.nth(1).getByRole("checkbox").uncheck();
    await page.getByTestId("receipt-review-list").getByRole("button", { name: receiptLabels.receipt.review.viewModes.table, exact: true }).click();
    await expect(page.getByTestId("receipt-review-table-scroll")).toBeVisible();
    await expect(rows.nth(1).getByRole("checkbox")).not.toBeChecked();
    const editTrigger = await openReviewEditor(page);
    const childDialog = page.locator('[role="dialog"][aria-labelledby="receipt-review-modal-title"]');
    await expect(childDialog).toBeVisible();
    await expect(page.locator("#transaction-form-dialog")).toHaveAttribute("inert", "");
    const editor = page.getByTestId("receipt-review-editor");
    await editor.getByRole("textbox", { name: receiptLabels.fields.title, exact: true }).fill("Draft only");
    await page.keyboard.press("Escape");
    await expect(childDialog).toHaveCount(0);
    await expect(page.locator("#transaction-form-dialog")).not.toHaveAttribute("inert", "");
    await expect(editTrigger).toBeFocused();
    await expect(rows.first()).not.toContainText("Draft only");
    await openReviewEditor(page);
    await page.getByTestId("receipt-review-editor").getByRole("textbox", { name: receiptLabels.fields.title, exact: true }).fill("Applied title");
    await page.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true }).click();
    await page.getByTestId("receipt-review-list").getByRole("button", { name: receiptLabels.receipt.review.viewModes.list, exact: true }).click();
    await expect(page.getByTestId("receipt-review-compact-list")).toContainText("Applied title");
    await expect(page.getByTestId("receipt-review-card").nth(1).getByRole("checkbox")).not.toBeChecked();
});

test("ACCOUNT-RECEIPT table category changes inline without FX and keeps a new suggestion after modal edits", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 844 });
    await mockAccountBook(page);
    let conversionCalls = 0;
    await page.route("**/transactions/receipt-conversion", route => {
        conversionCalls += 1;
        return fulfillJson(route, responseDto(receipt));
    });
    await openReceiptReview(page, "ko", 2, {
        categoryName: "반려동물",
        categorySource: "NEW",
        categoryReason: "AI suggested a concise new category.",
    });

    const firstRow = page.getByTestId("receipt-review-card").first();
    const inlineCategory = firstRow.getByRole("combobox", { name: "영수증 1 카테고리 즉시 선택", exact: true });
    await expect(inlineCategory).toHaveValue("반려동물");
    await inlineCategory.selectOption("생활");
    await expect(inlineCategory).toHaveValue("생활");
    await expect(inlineCategory.getByRole("option", { name: "반려동물 · 신규", exact: true })).toHaveCount(1);
    await inlineCategory.selectOption("반려동물");
    await expect(inlineCategory).toHaveValue("반려동물");
    expect(conversionCalls).toBe(0);

    await openReviewEditor(page, firstRow);
    const editor = page.getByTestId("receipt-review-editor");
    await editor.getByRole("textbox", { name: receiptLabels.fields.memo, exact: true }).fill("preserve category suggestion");
    await editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true }).click();
    await expect(inlineCategory).toHaveValue("반려동물");
    await expect(inlineCategory.locator("option")).toContainText(["Food · 기존", "생활 · 기본", "기타 · 추정", "반려동물 · 신규"]);
    expect(conversionCalls).toBe(0);
});

test("ACCOUNT-RECEIPT single-card inline amount updates source facts and recalculates once", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 844 });
    await mockAccountBook(page);
    const requestedCandidates: Array<Record<string, unknown>> = [];
    await page.route("**/transactions/receipt-conversion", async route => {
        const payload = JSON.parse(route.request().postData() ?? "{}");
        requestedCandidates.push(payload);
        await fulfillJson(route, responseDto({
            ...receipt,
            originalAmount: payload.originalAmount,
            purchaseTotal: payload.originalAmount,
            convertedAmount: payload.originalAmount === "15" ? "4.600" : "3.784",
            conversionQuoteId: "c".repeat(64),
        }));
    });
    await openReceiptReview(page, "ko", 1, {
        purchaseTotal: "12.34", bookAmount: "12.34",
        paymentBreakdown: [{ paymentType: "CREDIT_CARD", amount: "12.34", evidence: "VISA", duplicateGroup: null }],
        amountReason: "SETTLED_PAYMENT_EXCLUDING_LOYALTY_POINTS", reviewStatus: "READY",
    });
    const row = page.getByTestId("receipt-review-card").first();
    await row.getByRole("button", { name: /12\.34 USD/ }).click();
    let amount = row.getByRole("textbox", { name: "영수증 1 원통화 반영액", exact: true });
    await expect(row).toHaveClass(/bg-amber/);
    await amount.fill("1.");
    await amount.press("Enter");
    await expect(row.getByRole("alert")).toContainText(receiptLabels.receipt.review.inlineAmountInvalid);
    expect(requestedCandidates).toEqual([]);
    await amount.press("Escape");
    await row.getByRole("button", { name: /12\.34 USD/ }).click();
    amount = row.getByRole("textbox", { name: "영수증 1 원통화 반영액", exact: true });
    await amount.fill("15.00");
    await expect(page.getByTestId("receipt-submit-selected")).toBeDisabled();
    await amount.press("Enter");
    await expect(row).toContainText("15 USD");
    await expect(row).toContainText("4.6 KWD");
    await expect(row).toContainText("관측 12.34 → 사용자 수정 15");
    await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
    expect(requestedCandidates).toHaveLength(1);
    expect(requestedCandidates[0]).toMatchObject({
        originalAmount: "15", purchaseTotal: "15.00",
        paymentBreakdown: [{ paymentType: "CREDIT_CARD", amount: "15.00", evidence: "VISA" }],
    });

    await row.getByRole("button", { name: /15 USD/ }).click();
    const secondAmount = row.getByRole("textbox", { name: "영수증 1 원통화 반영액", exact: true });
    await secondAmount.fill("99");
    await secondAmount.press("Escape");
    await expect(row).toContainText("15 USD");
    expect(requestedCandidates).toHaveLength(1);
});

for (const outcome of ["success", "failure"] as const) {
test(`ACCOUNT-RECEIPT cancelling an in-flight amount edit ignores its late ${outcome} and preserves a newer category`, async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 844 });
    await mockAccountBook(page);
    let release: (() => void) | undefined;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let conversionCalls = 0;
    await page.route("**/transactions/receipt-conversion", async route => {
        conversionCalls += 1;
        await gate;
        if (outcome === "failure") return fulfillJson(route, { status: 503, message: "late failure" }, 503);
        const payload = JSON.parse(route.request().postData() ?? "{}");
        await fulfillJson(route, responseDto({
            ...receipt, originalAmount: payload.originalAmount, convertedAmount: "9.999",
            conversionQuoteId: "d".repeat(64),
        }));
    });
    await openReceiptReview(page, "ko", 1, {
        purchaseTotal: "12.34", bookAmount: "12.34",
        paymentBreakdown: [{ paymentType: "CREDIT_CARD", amount: "12.34", evidence: "VISA", duplicateGroup: null }],
        amountReason: "SETTLED_PAYMENT_EXCLUDING_LOYALTY_POINTS", reviewStatus: "READY",
    });
    const row = page.getByTestId("receipt-review-card").first();
    await row.getByRole("button", { name: /12\.34 USD/ }).click();
    const amount = row.getByRole("textbox", { name: "영수증 1 원통화 반영액", exact: true });
    await amount.fill("20");
    await amount.press("Enter");
    await expect.poll(() => conversionCalls).toBe(1);
    await row.getByRole("button", { name: receiptLabels.receipt.review.inlineCancel, exact: true }).click();
    const category = row.getByRole("combobox", { name: "영수증 1 카테고리 즉시 선택", exact: true });
    await expect(category).toBeEnabled();
    await category.selectOption("생활");
    // 실행: 취소한 요청의 응답보다 먼저 다른 금액 입력을 시작한다.
    await row.getByRole("button", { name: /12\.34 USD/ }).click();
    const newerInput = row.getByRole("textbox", { name: "영수증 1 원통화 반영액", exact: true });
    await newerInput.fill("30");
    const lateReply = page.waitForResponse("**/transactions/receipt-conversion");
    release?.();
    await (await lateReply).finished();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

    // 검증: 늦은 응답은 새 입력이나 카테고리를 지우지 않는다.
    await expect(page.getByText(receiptLabels.receipt.review.previewFailed, { exact: true })).toHaveCount(0);
    await expect(newerInput).toHaveValue("30");
    await newerInput.press("Escape");
    await expect(row).toContainText("12.34 USD");
    await expect(row).toContainText("3.784 KWD");
    await expect(category).toHaveValue("생활");
});
}

test("ACCOUNT-RECEIPT points explain why table amount editing opens the detail modal", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 844 });
    await mockAccountBook(page);
    await openReceiptReview(page, "ko", 1, {
        purchaseTotal: "7089", bookAmount: "5020", originalAmount: "5020",
        detectedCurrencyCode: "JPY", originalCurrencyCode: "JPY", convertedAmount: "5020", exchangeRate: "1",
        paymentBreakdown: [
            { paymentType: "LOYALTY_POINTS", amount: "2069", evidence: "ポイント支払", duplicateGroup: null },
            { paymentType: "CREDIT_CARD", amount: "5020", evidence: "クレジット", duplicateGroup: null },
        ],
        amountReason: "SETTLED_PAYMENT_EXCLUDING_LOYALTY_POINTS", reviewStatus: "READY", conversionStatus: "NOT_REQUIRED",
    });
    const row = page.getByTestId("receipt-review-card").first();
    await expect(row).toContainText("포인트 결제가 있어 상세 확인이 필요합니다.");
    await row.getByRole("button", { name: /5,020 JPY/ }).click();
    await expect(page.getByTestId("receipt-review-editor")).toBeVisible();
    await expect(page.getByTestId("receipt-review-editor")).toContainText("ポイント支払");
});

test("ACCOUNT-RECEIPT analysis summary aggregates multiple receipts and follows queue deletion", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockAccountBook(page);
    let call = 0;
    await page.route("**/transactions/receipt-analysis", route => {
        call += 1;
        const receipts = receiptCandidates(call === 1 ? 4 : 3).map((candidate, index) => ({
            ...candidate,
            receiptId: `photo-${call}-receipt-${index + 1}`,
        }));
        return fulfillJson(route, responseDto({ receiptCount: receipts.length, warnings: [], ocrEngine: "vision", usedAi: true,
            categoryOptions: [{ name: "Food", source: "EXISTING" }], receipts }));
    });
    await page.goto("/ko/account-books/1");
    await page.getByRole("button", { name: "거래 등록", exact: true }).click();
    await page.getByRole("button", { name: receiptLabels.inputMode.receipt, exact: true }).click();
    const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
    await page.locator('input[type="file"]').setInputFiles([
        { name: "multi-a.png", mimeType: "image/png", buffer: pixel },
        { name: "multi-b.png", mimeType: "image/png", buffer: pixel },
    ]);
    await page.getByRole("button", { name: receiptLabels.receipt.action, exact: true }).last().click();
    const summary = page.getByRole("button", { name: /사진 2 · 영수증 7/ });
    await expect(summary).toHaveAttribute("aria-expanded", "false");
    await summary.click();
    const queue = page.getByTestId("receipt-file-queue");
    await queue.locator("li").first().getByRole("button", { name: receiptLabels.receipt.removeFile, exact: true }).click();
    await expect(page.getByRole("button", { name: /사진 1 · 영수증 3/ })).toBeVisible();
    await expect(page.getByTestId("receipt-review-card")).toHaveCount(3);
});

test("ACCOUNT income form uses income-source label and type-scoped suggestions", async ({ page }) => {
    const suggestionTypes = new Set<string>();
    page.on("request", request => {
        const url = new URL(request.url());
        if (url.pathname.endsWith("/transactions/stores/suggestions")) suggestionTypes.add(url.searchParams.get("type") ?? "");
    });
    await mockAccountBook(page);
    await page.goto("/account-books/1");
    await page.getByRole("button", { name: "거래 등록", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: receiptLabels.type.income, exact: true }).click();
    const source = dialog.getByRole("combobox", { name: receiptLabels.fields.incomeSource, exact: true });
    await expect(source).toBeVisible();
    await expect(source.locator("option")).toContainText(["미설정", "給与会社", "직접 입력"]);
    expect(suggestionTypes).toEqual(new Set(["EXPENSE", "INCOME"]));
});

for (const width of [320, 375, 390, 430, 768, 1024]) {
    test(`ACCOUNT-MOBILE detail/cards/table/charts/modals ${width}px`, async ({ page }) => {
        test.setTimeout(90_000);
        await page.setViewportSize({ width, height: 844 });
        await mockAccountBook(page);
        await page.goto("/account-books/1");
        await expect(page.getByTestId("account-book-transactions")).toBeVisible();
        await expect(page.getByRole("button", { name: "카드", exact: true })).toBeVisible();
        await expectNoPageOverflow(page);

        await page.getByRole("button", { name: "표", exact: true }).click();
        const scroll = page.getByTestId("transaction-table-scroll");
        await expect(scroll).toBeVisible();
        expect(await scroll.evaluate(el => el.scrollWidth >= el.clientWidth)).toBe(true);
        await expectNoPageOverflow(page);

        await page.getByRole("button", { name: "거래 등록", exact: true }).click();
        await expect(page.getByRole("dialog").getByRole("button", { name: "모달 닫기", exact: true })).toBeVisible();
        await expectNoPageOverflow(page);
        await page.getByRole("dialog").getByRole("button", { name: "모달 닫기", exact: true }).click();

        await page.getByRole("button", { name: "멤버 관리", exact: true }).click();
        await expect(page.getByRole("heading", { name: "멤버 관리", exact: true })).toBeVisible();
        await expectNoPageOverflow(page);
        await page.getByRole("button", { name: "닫기", exact: true }).click();

        await page.getByRole("button", { name: "목표 금액 설정", exact: true }).click();
        await expect(page.getByRole("button", { name: "저장", exact: true })).toBeVisible();
        await expectNoPageOverflow(page);
        await page.getByRole("button", { name: "취소", exact: true }).click();

        await page.getByRole("button", { name: "고정비 등록", exact: true }).click();
        await expect(page.getByRole("button", { name: "취소", exact: true })).toBeVisible();
        await expectNoPageOverflow(page);
    });

    test(`ACCOUNT-MOBILE list/create/edit ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await mockAccountBook(page);
        await page.goto("/account-books");
        await expect(page.getByRole("heading", { name: longName, exact: true, level: 3 })).toBeVisible();
        await expectNoPageOverflow(page);
        await page.getByRole("button", { name: "신규 가계부 작성", exact: true }).click();
        await expect(page.getByRole("button", { name: "취소", exact: true })).toBeVisible();
        await expectNoPageOverflow(page);
        await page.getByRole("button", { name: "취소", exact: true }).click();
        await page.getByRole("button", { name: `${longName} 수정`, exact: true }).click();
        await expect(page.getByRole("heading", { name: "가계부 수정", exact: true })).toBeVisible();
        await expectNoPageOverflow(page);
    });

    test(`ACCOUNT-RECEIPT multi/review/edit/recalculate/atomic-error ${width}px`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: "light" });
        await page.setViewportSize({ width, height: 844 });
        await mockAccountBook(page);
        let batches = 0;
        const idempotencyKeys: string[] = [];
        await page.route("**/transactions/receipt-conversion", async route => {
            const payload = route.request().postDataJSON();
            expect(payload.originalAmount).toBe("10.12");
            expect(payload.exchangeRate).toBeUndefined();
            await fulfillJson(route, responseDto({ ...receipt, originalAmount: "10.12", convertedAmount: "3.103", conversionQuoteId: "b".repeat(64) }));
        });
        await page.route("**/transactions/receipt-batch", async route => {
            const payload = route.request().postDataJSON();
            idempotencyKeys.push(route.request().headers()["idempotency-key"] ?? "");
            expect(payload.receipts).toHaveLength(2);
            expect(payload.receipts[0].originalAmount).toBe("10.12");
            expect(payload.receipts[0].convertedAmount).toBeUndefined();
            expect(payload.receipts[0].exchangeRate).toBeUndefined();
            expect(payload.receipts[0].conversionQuoteId).toBe("b".repeat(64));
            expect(payload.receipts[1].originalCurrencyCode).toBe("EUR");
            await fulfillJson(route, responseDto(batches++ === 0 ? null : [transaction, { ...transaction, id: 2 }]), batches === 1 ? 503 : 200);
        });
        await openReceiptReview(page);
        const cards = page.getByTestId("receipt-review-card");
        await expect(cards.nth(0).getByRole("checkbox")).toBeChecked();
        await expect(cards.nth(1).getByRole("checkbox")).toBeChecked();
        await expect(cards.nth(2).getByRole("checkbox")).toBeChecked();
        await expect(page.getByTestId("receipt-submit-selected")).toBeDisabled();
        await cards.nth(2).getByRole("checkbox").uncheck();
        await expectNoPageOverflow(page);
        if (width === 320 || width === 1024) {
            await cards.nth(0).scrollIntoViewIfNeeded();
            await page.screenshot({ path: test.info().outputPath("receipt-review.png") });
        }
        await cards.nth(1).getByRole("checkbox").uncheck();
        await cards.nth(1).getByRole("checkbox").check();
        await openReviewEditor(page);
        const editor = page.getByTestId("receipt-review-editor");
        await editor.getByText(receiptLabels.receipt.review.receiptDetails, { exact: true }).click();
        await editor.getByRole("textbox", { name: receiptLabels.receipt.review.purchaseTotal, exact: true }).fill("10.12");
        await expect(page.getByTestId("receipt-submit-selected")).toBeDisabled();
        await expect(editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true })).toBeDisabled();
        await page.getByTestId("receipt-recalculate-receipt-1").click();
        await expect(editor.getByTestId("receipt-recalculate-receipt-1")).toBeHidden();
        await page.getByTestId("receipt-review-editor").getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true }).click();
        await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
        await expectNoPageOverflow(page);
        await page.getByTestId("receipt-submit-selected").click();
        await expect(page.getByTestId("receipt-review-list").getByRole("alert")).toBeVisible();
        await expect(cards).toHaveCount(3);
        await expect(cards.nth(1).getByRole("checkbox")).toBeChecked();
        await page.getByTestId("receipt-submit-selected").click();
        await expect(page.getByTestId("receipt-review-list")).toHaveCount(0);
        expect(batches).toBe(2);
        expect(idempotencyKeys).toHaveLength(2);
        expect(idempotencyKeys[0]).toBe(idempotencyKeys[1]);
    });

    for (const { locale, colorScheme } of [
        { locale: "ko", colorScheme: "dark" },
        { locale: "ja", colorScheme: "light" },
        { locale: "ja", colorScheme: "dark" },
    ] as const) {
        test(`ACCOUNT-RECEIPT many-cards ${locale}/${colorScheme} ${width}px`, async ({ page }) => {
            await page.emulateMedia({ colorScheme });
            await page.setViewportSize({ width, height: 844 });
            await mockAccountBook(page);
            await openReceiptReview(page, locale, 8);
            await expect(page.locator("html")).toHaveClass(new RegExp(colorScheme));
            const cards = page.getByTestId("receipt-review-card");
            await cards.last().scrollIntoViewIfNeeded();
            await expect(page.getByTestId("receipt-submit-selected")).toBeVisible();
            await expectNoPageOverflow(page);
            if (width === 320 || width === 1024) {
                await page.screenshot({
                    path: test.info().outputPath(`receipt-many-${locale}-${colorScheme}.png`),
                    fullPage: true,
                });
            }
        });
    }
}

test("ACCOUNT-RECEIPT inline title validates, cancels and survives list/table without FX", async ({ page }) => {
    // 준비: 이름만 고치면 기존 quote를 유지해야 한다.
    await page.setViewportSize({ width: 1024, height: 844 });
    await mockAccountBook(page);
    let conversionCalls = 0;
    let batch: Record<string, unknown> | undefined;
    await page.route("**/transactions/receipt-conversion", route => {
        conversionCalls += 1;
        return fulfillJson(route, responseDto(receipt));
    });
    await page.route("**/transactions/receipt-batch", route => {
        batch = JSON.parse(route.request().postData() ?? "{}");
        return fulfillJson(route, { status: 409, message: "test capture" }, 409);
    });
    await openReceiptReview(page, "ko", 1, { title: "LAWSON 船堀店" });
    const row = page.getByTestId("receipt-review-card").first();
    await expect(page.getByRole("columnheader", { name: "기본정보", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "거래일", exact: true })).toHaveCount(0);

    // 실행: 빈 이름은 차단하고, IME 확정 Enter와 실제 적용을 구분한다.
    await row.getByRole("button", { name: "영수증 1 거래명 수정", exact: true }).click();
    const title = row.getByRole("textbox", { name: "영수증 1 거래명", exact: true });
    await title.fill("");
    await title.press("Enter");
    await expect(row.getByRole("alert")).toContainText(receiptLabels.receipt.review.blockingIssues.TITLE_REQUIRED);
    await expect(page.getByTestId("receipt-submit-selected")).toBeDisabled();
    await row.getByRole("combobox", { name: "영수증 1 카테고리 즉시 선택", exact: true }).selectOption("생활");
    await title.fill("LAWSON 船堀駅前店");
    await title.dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true });
    await expect(title).toBeVisible();
    await page.getByTestId("receipt-review-list").getByRole("button", { name: receiptLabels.receipt.review.viewModes.list, exact: true }).click();
    await expect(title).toHaveValue("LAWSON 船堀駅前店");
    await title.press("Enter");
    await row.getByRole("button", { name: "영수증 1 거래명 수정", exact: true }).click();
    await title.fill("취소될 이름");
    await title.press("Escape");

    // 검증: 화면 전환/취소 후 원문과 quote를 유지하고 최종 등록에만 반영한다.
    await expect(row).toContainText("LAWSON 船堀駅前店");
    await expect(row).toContainText("생활");
    await expect(page.locator("#transaction-form-dialog")).toBeVisible();
    expect(conversionCalls).toBe(0);
    await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
    await page.getByTestId("receipt-submit-selected").click();
    await expect.poll(() => batch).toBeDefined();
    expect(batch).toMatchObject({ receipts: [{ title: "LAWSON 船堀駅前店", conversionQuoteId: "a".repeat(64) }] });
});

test("ACCOUNT-RECEIPT compact inline category and single-card amount retain server quote flow", async ({ page }) => {
    // 준비: 모바일에서도 실제 결제 배열을 가진 단일 카드 사례를 편집한다.
    await page.setViewportSize({ width: 320, height: 844 });
    await mockAccountBook(page);
    const conversions: Array<Record<string, unknown>> = [];
    await page.route("**/transactions/receipt-conversion", route => {
        const candidate = JSON.parse(route.request().postData() ?? "{}");
        conversions.push(candidate);
        return fulfillJson(route, responseDto({ ...receipt, originalAmount: "15", purchaseTotal: "15",
            convertedAmount: "4.600", conversionQuoteId: "c".repeat(64) }));
    });
    await openReceiptReview(page, "ko", 1, { title: "LAWSON 船堀店", categoryName: "반려동물", categorySource: "NEW",
        purchaseTotal: "12.34", bookAmount: "12.34", reviewStatus: "READY",
        paymentBreakdown: [{ paymentType: "CREDIT_CARD", amount: "12.34", evidence: "VISA", duplicateGroup: null }],
        amountReason: "SETTLED_PAYMENT_EXCLUDING_LOYALTY_POINTS" });
    const row = page.getByTestId("receipt-review-card").first();
    await expect(row.getByRole("textbox")).toHaveCount(0);
    await expect(row.getByRole("combobox")).toHaveCount(0);

    // 실행: 클릭한 필드만 입력으로 전환하고 카테고리는 통신 없이 적용한다.
    await row.getByRole("button", { name: "영수증 1 카테고리 즉시 선택", exact: true }).click();
    const category = row.getByRole("combobox", { name: "영수증 1 카테고리 즉시 선택", exact: true });
    await category.selectOption("생활");
    await row.getByRole("button", { name: "영수증 1 카테고리 즉시 선택", exact: true }).click();
    await expect(category.locator("option")).toContainText(["Food · 기존", "생활 · 기본", "기타 · 추정", "반려동물 · 신규"]);
    await category.selectOption("반려동물");
    expect(conversions).toHaveLength(0);
    await row.getByRole("button", { name: /12\.34 USD/ }).click();
    const amount = row.getByRole("textbox", { name: "영수증 1 원통화 반영액", exact: true });
    await amount.fill("15.00");
    await expect(page.getByTestId("receipt-submit-selected")).toBeDisabled();
    await expectNoPageOverflow(page);
    await amount.press("Enter");

    // 검증: 새 환산액과 단일 카드 정정 사실을 표시하며 입력 영역이 넘치지 않는다.
    await expect(row).toContainText("15 USD");
    await expect(row).toContainText("4.6 KWD");
    expect(conversions).toHaveLength(1);
    expect(conversions[0]).toMatchObject({ originalAmount: "15", paymentBreakdown: [{ paymentType: "CREDIT_CARD", amount: "15.00" }] });
    await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
    await expectNoPageOverflow(page);
});

for (const locale of ["ko", "ja"] as const) {
    for (const colorScheme of ["light", "dark"] as const) {
        test(`ACCOUNT-RECEIPT inline responsive demo ${locale}/${colorScheme}`, async ({ page }) => {
            test.setTimeout(120_000);
            // 준비: 저장된 측정값을 닮은 UI fixture이며 새로운 AI 인식 결과가 아니다.
            await page.emulateMedia({ colorScheme });
            await page.setViewportSize({ width: 1024, height: 844 });
            await mockAccountBook(page);
            const labels = locales[locale].transactionModal;
            const sample = { ...book, name: "日本旅行", currencyCode: "JPY", currencySymbol: "¥", currencyDecimalPlaces: 0 };
            await page.route("**/api/v1/account-books/1", route => fulfillJson(route, responseDto(sample)));
            await page.route("**/api/v1/account-books/1/summary", route => fulfillJson(route, responseDto(sample)));
            const facts = { ...receipt, transactionDate: "2026-09-20", detectedLanguage: "ja", detectedCurrencyCode: "JPY", originalCurrencyCode: "JPY",
                accountBookCurrencyCode: "JPY", exchangeRate: "1", conversionStatus: "NOT_REQUIRED", roundingPrecision: 0,
                amountReason: "SETTLED_PAYMENT_EXCLUDING_LOYALTY_POINTS", reviewStatus: "READY" };
            const primary = { ...facts, title: "LAWSON 船堀店", storeName: "LAWSON", branchName: "船堀店", categoryName: "食費", categorySource: "NEW",
                originalAmount: "908", bookAmount: "908", purchaseTotal: "908",
                paymentBreakdown: [{ paymentType: "CREDIT_CARD", amount: "908", evidence: "クレジット", duplicateGroup: null }], convertedAmount: "908" };
            await openReceiptReview(page, locale, 2, primary,
                { ...facts, receiptId: "receipt-2", title: "杉養蜂園 川越店", storeName: "杉養蜂園", branchName: "川越店", categoryName: "買物", categorySource: "NEW",
                    originalAmount: "1998", bookAmount: "1998", purchaseTotal: "1998", convertedAmount: "1998" });
            const analysisToggle = page.locator('button[aria-controls="receipt-analysis-content"]');
            if (await analysisToggle.getAttribute("aria-expanded") === "true")
                await analysisToggle.click();
            const review = page.getByTestId("receipt-review-list");
            const first = page.getByTestId("receipt-review-card").first();

            // 실행 / 검증: 입력 전후 높이, 6개 화면 폭, 모드 전환 및 footer 접근성을 확인한다.
            for (const width of [1024, 768, 430, 390, 375, 320]) {
                await page.setViewportSize({ width, height: 844 });
                await review.getByRole("button", { name: width < 768 ? labels.receipt.review.viewModes.list : labels.receipt.review.viewModes.table, exact: true }).click();
                await first.scrollIntoViewIfNeeded();
                await expectNoPageOverflow(page);
                await page.screenshot({ path: test.info().outputPath(`summary-${locale}-${colorScheme}-${width}.png`) });
                if (width === 1024) {
                    await first.getByTestId("receipt-row-menu-trigger").click();
                    await expect(page.getByTestId("receipt-row-menu")).toBeVisible();
                    await page.screenshot({ path: test.info().outputPath(`menu-${locale}-${colorScheme}-${width}.png`) });
                    await page.keyboard.press("Escape");
                }
                const trigger = first.getByRole("button", { name: labels.receipt.review.inlineTitle.replace("{index}", "1"), exact: true });
                const before = await trigger.boundingBox();
                await trigger.click();
                const title = first.getByRole("textbox", { name: labels.receipt.review.inlineTitleInput.replace("{index}", "1"), exact: true });
                await title.fill("LAWSON 船堀駅前店");
                const editor = first.getByTestId("receipt-inline-title-receipt-1");
                const after = await editor.boundingBox();
                expect(Math.abs(before!.height - after!.height)).toBeLessThanOrEqual(1);
                expect(Math.abs(before!.width - after!.width)).toBeLessThanOrEqual(1);
                await expectNoPageOverflow(page);
                await page.screenshot({ path: test.info().outputPath(`title-edit-${locale}-${colorScheme}-${width}.png`) });
                await title.press("Escape");
                if (width < 768) {
                    await first.getByRole("button", { name: labels.receipt.review.inlineCategory.replace("{index}", "1"), exact: true }).click();
                    await expectNoPageOverflow(page);
                    await first.getByRole("combobox").selectOption("Food");
                }
                await first.getByRole("button", { name: /908 JPY/ }).click();
                await expect(first.getByRole("textbox", { name: labels.receipt.review.inlineAmountInput.replace("{index}", "1"), exact: true })).toBeFocused();
                await expectNoPageOverflow(page);
                await page.screenshot({ path: test.info().outputPath(`amount-edit-${locale}-${colorScheme}-${width}.png`) });
                await first.getByRole("button", { name: labels.receipt.review.inlineCancel, exact: true }).click();
                await expect(page.getByTestId("receipt-submit-selected")).toBeVisible();
                const footer = await page.getByTestId("receipt-submit-selected").boundingBox();
                const body = await page.getByTestId("receipt-review-scroll-body").boundingBox();
                expect(body!.y + body!.height).toBeLessThanOrEqual(footer!.y);
                expect(footer!.y + footer!.height).toBeLessThanOrEqual(844);
                if (width < 768) {
                    await review.getByRole("button", { name: labels.receipt.review.viewModes.table, exact: true }).click();
                    await expectNoPageOverflow(page);
                }
            }
        });
    }
}


test("ACCOUNT-RECEIPT compact table menu flips, closes and restores focus without extra columns", async ({ page }) => {
    // 준비: 실제 화면의 스크롤 상단/하단 행을 모두 검사한다. API는 UI fixture다.
    await page.setViewportSize({ width: 1024, height: 844 });
    await mockAccountBook(page);
    await openReceiptReview(page, "ko", 8);
    const collapse = page.locator('button[aria-controls="receipt-analysis-content"]');
    if (await collapse.getAttribute("aria-expanded") === "true") await collapse.click();
    const table = page.getByTestId("receipt-review-table-scroll");
    const rows = page.getByTestId("receipt-review-card");
    await expect(table.getByRole("columnheader")).toHaveCount(4);
    await expect(table.getByRole("columnheader", { name: receiptLabels.receipt.review.columns.status, exact: true })).toHaveCount(0);
    await expect(table.getByRole("columnheader", { name: receiptLabels.receipt.review.columns.action, exact: true })).toHaveCount(0);
    for (const checkbox of await rows.getByRole("checkbox").all()) await expect(checkbox).toBeChecked();
    const checkbox = rows.first().getByRole("checkbox");
    const box = await checkbox.boundingBox();
    expect(box!.width).toBe(16);
    expect(box!.height).toBe(16);
    const hitArea = await checkbox.locator("..").boundingBox();
    expect(hitArea!.width).toBe(32);
    expect(hitArea!.height).toBe(32);

    // 실행 / 검증: 상단에서는 아래로, 하단에서는 위로 열리며 영역을 벗어나지 않는다.
    const first = rows.first().getByTestId("receipt-row-menu-trigger");
    await first.scrollIntoViewIfNeeded();
    await first.focus();
    await first.press("ArrowDown");
    const menu = page.getByTestId("receipt-row-menu");
    await expect(menu).toHaveAttribute("data-placement", "bottom");
    await expect(menu.getByRole("menuitem")).toBeFocused();
    await page.screenshot({ path: test.info().outputPath("desktop-menu-down.png") });
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(first).toBeFocused();
    const last = rows.last().getByTestId("receipt-row-menu-trigger");
    await last.scrollIntoViewIfNeeded();
    await last.evaluate(trigger => {
        const body = trigger.closest('[data-testid="receipt-review-scroll-body"]')!;
        // 실제 스크롤만 조절해 트리거를 본문 하단 8px 안쪽에 놓는다.
        body.scrollTop += trigger.getBoundingClientRect().bottom - (body.getBoundingClientRect().bottom - 8);
    });
    await last.click();
    await expect(menu).toHaveAttribute("data-placement", "top");
    const rect = await menu.boundingBox();
    const body = await page.getByTestId("receipt-review-scroll-body").boundingBox();
    expect(rect!.y).toBeGreaterThanOrEqual(body!.y);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(body!.y + body!.height);
    await page.screenshot({ path: test.info().outputPath("desktop-menu-up.png") });
    await menu.getByRole("menuitem").click();
    await expect(page.getByTestId("receipt-review-editor")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(last).toBeFocused();
    await last.click();
    await table.getByRole("columnheader").nth(1).click();
    await expect(menu).toHaveCount(0);
    await first.scrollIntoViewIfNeeded();
    await first.click();
    await page.keyboard.press("Tab");
    await expect(menu).toHaveCount(0);
    await expectNoPageOverflow(page);
});


for (const mode of ["list", "table"] as const) {
    test(`ACCOUNT-RECEIPT modal amount synchronizes payment facts and both views ${mode}`, async ({ page }) => {
        // 준비: 단일 카드가 있는 실제 계약 형태를 사용한다. 환산 fixture도 결제 사실로 금액을 정한다.
        await page.setViewportSize({ width: mode === "list" ? 390 : 1024, height: 844 });
        await mockAccountBook(page);
        const requests: Array<Record<string, unknown>> = [];
        await page.route("**/transactions/receipt-conversion", route => {
            const payload = route.request().postDataJSON();
            requests.push(payload);
            const paid = payload.paymentBreakdown[0].amount;
            return fulfillJson(route, responseDto({ ...receipt, originalAmount: paid, originalCurrencyCode: payload.originalCurrencyCode,
                convertedAmount: Number(paid) === 15 ? "4.600" : "3.784", conversionQuoteId: "d".repeat(64) }));
        });
        await openReceiptReview(page, "ko", 1, { purchaseTotal: "12.34", bookAmount: "12.34",
            paymentBreakdown: [{ paymentType: "CREDIT_CARD", amount: "12.34", evidence: "VISA", duplicateGroup: null }],
            amountReason: "SETTLED_PAYMENT_EXCLUDING_LOYALTY_POINTS", reviewStatus: "READY" });
        const row = page.getByTestId("receipt-review-card").first();
        await openReviewEditor(page, row);
        const editor = page.getByTestId("receipt-review-editor");

        // 실행: 일반 금액 입력으로 바꾼 뒤 환산을 확인하고 draft에 적용한다.
        await editor.getByRole("textbox", { name: receiptLabels.receipt.review.bookAmount, exact: true }).fill("15.00");
        await editor.getByTestId("receipt-recalculate-receipt-1").click();
        await expect(editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true })).toBeEnabled();
        await editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true }).click();

        // 검증: 서버가 이전 금액으로 계산하면 화면에도 이전 환산액이 남는 결함을 재현한다.
        await expect(row.getByRole("button", { name: /15(?:\.00)? USD/ })).toContainText("4.6 KWD");
        expect(requests).toHaveLength(1);
        expect(requests[0].purchaseTotal).toBe("15.00");
        expect(requests[0].paymentBreakdown).toEqual([{ paymentType: "CREDIT_CARD", amount: "15.00", evidence: "VISA", duplicateGroup: null }]);
        await page.getByTestId("receipt-review-list").getByRole("button", {
            name: receiptLabels.receipt.review.viewModes[mode === "list" ? "table" : "list"], exact: true,
        }).click();
        await expect(row.getByRole("button", { name: /15(?:\.00)? USD/ })).toContainText("4.6 KWD");
        await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
        await page.screenshot({ path: test.info().outputPath(`modal-amount-${mode}.png`) });
    });
}


for (const mode of ["list", "table"] as const) {
    test(`ACCOUNT-RECEIPT modal edits all fields, cancels and reopens consistently ${mode}`, async ({ page }) => {
        // 준비: 단순 현금의 구매총액 정정과 모든 공통 필드/quote/최종 payload를 함께 확인한다.
        await page.setViewportSize({ width: mode === "list" ? 375 : 1024, height: 844 });
        await mockAccountBook(page);
        const conversions: Array<Record<string, unknown>> = [];
        let batch: { receipts: Array<Record<string, unknown>> } | undefined;
        await page.route("**/transactions/receipt-conversion", route => {
            const payload = route.request().postDataJSON();
            conversions.push(payload);
            return fulfillJson(route, responseDto({ ...receipt, originalAmount: payload.paymentBreakdown[0].amount,
                originalCurrencyCode: payload.originalCurrencyCode, requestedRateDate: payload.transactionDate,
                convertedAmount: "6.899", conversionQuoteId: "e".repeat(64) }));
        });
        await page.route("**/transactions/receipt-batch", route => {
            batch = route.request().postDataJSON();
            return fulfillJson(route, { status: 409, message: "capture only" }, 409);
        });
        await openReceiptReview(page, "ko", 1, { storeName: "Cafe", purchaseTotal: "12.34", bookAmount: "12.34",
            paymentBreakdown: [{ paymentType: "CASH", amount: "12.34", evidence: "現金", duplicateGroup: null }],
            cashTendered: null, change: null, reviewStatus: "READY" });
        const row = page.getByTestId("receipt-review-card").first();
        await openReviewEditor(page, row);
        const editor = page.getByTestId("receipt-review-editor");
        const amount = editor.getByRole("textbox", { name: receiptLabels.receipt.review.bookAmount, exact: true });

        // 실행 / 검증: 소수점 타이핑이 사라지지 않고 취소하면 원래 행은 그대로다.
        await amount.fill("");
        await amount.pressSequentially("15.25");
        await expect(amount).toHaveValue("15.25");
        await editor.getByRole("button", { name: receiptLabels.receipt.review.discardChanges, exact: true }).click();
        await expect(row).toContainText("12.34 USD");
        expect(conversions).toHaveLength(0);

        // 실행: 비금융 필드부터 적용하면 이전 quote를 유지한다.
        await openReviewEditor(page, row);
        await editor.getByRole("textbox", { name: receiptLabels.fields.title, exact: true }).fill("修正した店舗 川越店");
        await editor.getByRole("textbox", { name: receiptLabels.fields.storeName, exact: true }).fill("修正した店舗");
        await editor.getByRole("combobox", { name: receiptLabels.fields.category, exact: true }).selectOption("생활");
        await editor.getByRole("textbox", { name: receiptLabels.fields.memo, exact: true }).fill("保存前の確認メモ");
        await editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true }).click();
        await expect(row).toContainText("修正した店舗 川越店");
        await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
        expect(conversions).toHaveLength(0);

        // 실행: 구매총액·통화·날짜를 바꾸면 양쪽 화면에서 새 원금액과 미환산 상태를 보여준다.
        await openReviewEditor(page, row);
        await editor.locator("summary").click();
        await editor.getByRole("textbox", { name: receiptLabels.receipt.review.purchaseTotal, exact: true }).fill("22.50");
        await editor.getByRole("textbox", { name: receiptLabels.receipt.review.originalCurrency, exact: true }).fill("eur");
        await editor.getByRole("textbox", { name: receiptLabels.fields.transactionDate, exact: true }).fill("2026-09-16");
        await editor.getByRole("textbox", { name: receiptLabels.receipt.review.branchName, exact: true }).fill("川越店");
        await expect(editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true })).toBeDisabled();
        await editor.getByTestId("receipt-recalculate-receipt-1").click();
        await expect(editor.getByTestId("receipt-recalculate-receipt-1")).toBeHidden();
        await editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true }).click();
        await expect(row).toContainText("22.5 EUR");
        await expect(row).toContainText("6.899 KWD");
        await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
        await page.getByTestId("receipt-review-list").getByRole("button", { name: receiptLabels.receipt.review.viewModes[mode === "list" ? "table" : "list"], exact: true }).click();
        await expect(row).toContainText("22.5 EUR");
        await expect(row).toContainText("2026-09-16");
        await openReviewEditor(page, row);
        await expect(editor.getByRole("textbox", { name: receiptLabels.fields.storeName, exact: true })).toHaveValue("修正した店舗");
        await expect(editor.getByRole("textbox", { name: receiptLabels.fields.memo, exact: true })).toHaveValue("保存前の確認メモ");
        await expect(editor.getByTestId("receipt-recalculate-receipt-1")).toBeHidden();
        await expect(editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true })).toBeEnabled();
        await editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true }).click();

        // 검증: 서버 환산 후 표시와 최종 선택 등록 payload가 일치한다.
        await expect(row).toContainText("6.899 KWD");
        expect(conversions).toHaveLength(1);
        expect(conversions[0].purchaseTotal).toBe("22.50");
        expect(conversions[0].paymentBreakdown).toEqual([{ paymentType: "CASH", amount: "22.50", evidence: "現金", duplicateGroup: null }]);
        await page.getByTestId("receipt-submit-selected").click();
        await expect.poll(() => batch).toBeDefined();
        expect(batch!.receipts[0]).toMatchObject({ originalAmount: "22.5", originalCurrencyCode: "EUR", transactionDate: "2026-09-16",
            title: "修正した店舗 川越店", storeName: "修正した店舗", branchName: "川越店", memo: "保存前の確認メモ", categoryName: "생활", conversionQuoteId: "e".repeat(64) });
        await expectNoPageOverflow(page);
    });

    test(`ACCOUNT-RECEIPT modal preview failure retains input and retries ${mode}`, async ({ page }) => {
        // 준비: 첫 환산만 실패하며, 이후 동일 입력을 사용자가 다시 확인한다.
        await page.setViewportSize({ width: mode === "list" ? 390 : 1024, height: 844 });
        await mockAccountBook(page);
        let calls = 0;
        await page.route("**/transactions/receipt-conversion", route => {
            const payload = route.request().postDataJSON();
            if (++calls === 1) return fulfillJson(route, { status: 503, message: "unavailable" }, 503);
            if (calls === 2) return fulfillJson(route, responseDto(receipt));
            return fulfillJson(route, responseDto({ ...receipt, originalAmount: payload.originalAmount,
                convertedAmount: "4.600", conversionQuoteId: "f".repeat(64) }));
        });
        await openReceiptReview(page, "ko", 1);
        const row = page.getByTestId("receipt-review-card").first();
        await openReviewEditor(page, row);
        const editor = page.getByTestId("receipt-review-editor");
        const amount = editor.getByRole("textbox", { name: receiptLabels.receipt.review.bookAmount, exact: true });

        // 실행 / 검증: 실패 원인은 자식 모달 안에 보이고 사용자 입력은 유지된다.
        await amount.fill("15.00");
        await editor.getByTestId("receipt-recalculate-receipt-1").click();
        await expect(page.locator('[role="dialog"][aria-labelledby="receipt-review-modal-title"]').getByRole("alert")).toContainText(receiptLabels.receipt.review.previewFailed);
        await expect(amount).toHaveValue("15.00");
        await editor.getByTestId("receipt-recalculate-receipt-1").click();
        await expect(page.locator('[role="dialog"][aria-labelledby="receipt-review-modal-title"]').getByRole("alert")).toContainText(receiptLabels.receipt.review.previewFailed);
        await expect(amount).toHaveValue("15.00");
        await expect(editor).not.toContainText("3.784 KWD");
        await editor.getByTestId("receipt-recalculate-receipt-1").click();
        await expect(editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true })).toBeEnabled();
        await editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true }).click();
        await expect(row).toContainText("15 USD");
        await expect(row).toContainText("4.6 KWD");
        await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
        expect(calls).toBe(3);
    });

    test(`ACCOUNT-RECEIPT point amount uses detail corrections in both views ${mode}`, async ({ page }) => {
        // 준비: 포인트를 유지하고 구매총액/카드 결제 정정으로만 반영액을 계산한다.
        await page.setViewportSize({ width: mode === "list" ? 390 : 1024, height: 844 });
        await mockAccountBook(page);
        const requests: Array<Record<string, unknown>> = [];
        await page.route("**/transactions/receipt-conversion", route => {
            const payload = route.request().postDataJSON();
            requests.push(payload);
            return fulfillJson(route, responseDto({ ...receipt, originalAmount: payload.originalAmount, originalCurrencyCode: "JPY",
                convertedAmount: "10.24", conversionQuoteId: "9".repeat(64) }));
        });
        await openReceiptReview(page, "ko", 1, { originalAmount: "5020", bookAmount: "5020", purchaseTotal: "7089", detectedCurrencyCode: "JPY",
            originalCurrencyCode: "JPY", paymentBreakdown: [
                { paymentType: "LOYALTY_POINTS", amount: "2069", evidence: "ポイント", duplicateGroup: null },
                { paymentType: "CREDIT_CARD", amount: "5020", evidence: "カード", duplicateGroup: null },
            ], reviewStatus: "READY" });
        const row = page.getByTestId("receipt-review-card").first();
        await openReviewEditor(page, row);
        const editor = page.getByTestId("receipt-review-editor");
        const amount = editor.getByRole("textbox", { name: receiptLabels.receipt.review.bookAmount, exact: true });

        // 실행 / 검증: 단독 덮어쓰기를 막고 상세의 불일치도 계속 차단한다.
        await expect(amount).toHaveAttribute("readonly", "");
        await expect(amount).toHaveValue("5020");
        await editor.getByRole("button", { name: receiptLabels.receipt.review.receiptDetails, exact: true }).click();
        await editor.getByRole("textbox", { name: receiptLabels.receipt.review.purchaseTotal, exact: true }).fill("7189");
        await expect(editor.getByTestId("receipt-recalculate-receipt-1")).toBeDisabled();
        await editor.locator('input[id$="paymentBreakdown-1"]').fill("5120");
        await expect(amount).toHaveValue("5120");
        await editor.getByTestId("receipt-recalculate-receipt-1").click();
        await expect(editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true })).toBeEnabled();
        await editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true }).click();
        await expect(row).toContainText("5,120 JPY");
        await expect(row).toContainText("10.24 KWD");
        await page.getByTestId("receipt-review-list").getByRole("button", { name: receiptLabels.receipt.review.viewModes[mode === "list" ? "table" : "list"], exact: true }).click();
        await expect(row).toContainText("5,120 JPY");
        expect(requests).toHaveLength(1);
        expect(requests[0].paymentBreakdown).toEqual([
            { paymentType: "LOYALTY_POINTS", amount: "2069", evidence: "ポイント", duplicateGroup: null },
            { paymentType: "CREDIT_CARD", amount: "5120", evidence: "カード", duplicateGroup: null },
        ]);
    });
}


for (const mode of ["list", "table"] as const) {
    test(`ACCOUNT-RECEIPT cancelled modal ignores a late conversion failure ${mode}`, async ({ page }) => {
        // 준비: 사용자가 모달을 닫은 뒤 실패 응답이 도착하는 순서를 고정한다.
        await page.setViewportSize({ width: mode === "list" ? 390 : 1024, height: 844 });
        await mockAccountBook(page);
        let started = false;
        let release!: () => void;
        const pending = new Promise<void>(resolve => { release = resolve; });
        await page.route("**/transactions/receipt-conversion", async route => {
            started = true;
            await pending;
            await fulfillJson(route, { status: 503, message: "late failure" }, 503);
        });
        await openReceiptReview(page, "ko", 1);
        const row = page.getByTestId("receipt-review-card").first();
        await openReviewEditor(page, row);
        const editor = page.getByTestId("receipt-review-editor");
        await editor.getByRole("textbox", { name: receiptLabels.receipt.review.bookAmount, exact: true }).fill("20.25");
        await editor.getByTestId("receipt-recalculate-receipt-1").click();
        await expect.poll(() => started).toBe(true);

        // 실행: 환산 중 Esc 취소 후 응답을 해제한다.
        await page.keyboard.press("Escape");
        await expect(editor).toHaveCount(0);
        const response = page.waitForResponse("**/transactions/receipt-conversion");
        release();
        await (await response).finished();
        await openReviewEditor(page, row);

        // 검증: 입력/quote/오류 모두 새 모달과 목록에 유출되지 않는다.
        await expect(editor.getByRole("textbox", { name: receiptLabels.receipt.review.bookAmount, exact: true })).toHaveValue("12.34");
        await expect(page.getByText(receiptLabels.receipt.review.previewFailed, { exact: true })).toHaveCount(0);
        await editor.getByRole("button", { name: receiptLabels.receipt.review.discardChanges, exact: true }).click();
        await expect(row).toContainText("12.34 USD");
        await expect(row).toContainText("3.784 KWD");
        await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
    });
}


for (const { mode, locale, width } of [
    { mode: "list", locale: "ko", width: 390 }, { mode: "table", locale: "ko", width: 1024 },
    { mode: "list", locale: "ja", width: 320 }, { mode: "table", locale: "ja", width: 1024 },
] as const) {
    test(`ACCOUNT-RECEIPT prepayment correction clears mismatch after a new quote ${mode} ${locale}`, async ({ page }) => {
        const labels = locales[locale].transactionModal;
        // 준비: 사용자 설명을 바탕으로 한 합성 재현. 실제 AI 응답/환율이 아니다.
        await page.setViewportSize({ width, height: 844 });
        await mockAccountBook(page);
        const conversions: Array<Record<string, unknown>> = [];
        const batches: Array<{ receipts: Array<Record<string, unknown>> }> = [];
        await page.route("**/transactions/receipt-conversion", route => {
            const payload = route.request().postDataJSON();
            conversions.push(payload);
            return fulfillJson(route, responseDto({ ...receipt, originalAmount: payload.originalAmount,
                originalCurrencyCode: "JPY", convertedAmount: "16.060", exchangeRate: "0.002", conversionQuoteId: "8".repeat(64) }));
        });
        await page.route("**/transactions/receipt-batch", route => {
            batches.push(route.request().postDataJSON());
            return fulfillJson(route, responseDto([transaction]));
        });
        await openReceiptReview(page, locale, 1, { title: "ちいかわレストラン沖縄", storeName: "ちいかわレストラン沖縄",
            purchaseTotal: "8030", originalAmount: "8030", bookAmount: "8030", detectedCurrencyCode: "JPY", originalCurrencyCode: "JPY",
            paymentBreakdown: [
                { paymentType: "LOYALTY_POINTS", amount: "4000", evidence: "ポイント利用", duplicateGroup: null },
                { paymentType: "CREDIT_CARD", amount: "4000", evidence: "カード", duplicateGroup: null },
            ], reviewStatus: "NEEDS_REVIEW", amountReason: "PAYMENT_TOTAL_MISMATCH", convertedAmount: null,
            conversionStatus: "NEEDS_REVIEW", conversionQuoteId: null, warnings: ["AMOUNT_REQUIRES_REVIEW", "PAYMENT_TOTAL_MISMATCH"] });
        const row = page.getByTestId("receipt-review-card").first();
        await expect(row).toContainText(labels.receipt.review.statusNeedsReview);
        await expect(page.getByTestId("receipt-submit-selected")).toBeDisabled();
        await row.scrollIntoViewIfNeeded();
        await page.screenshot({ path: test.info().outputPath("prepayment-before.png") });
        await openReviewEditor(page, row, labels);
        const editor = page.getByTestId("receipt-review-editor");
        await expect(editor.locator("details")).toHaveAttribute("open", "");
        await expect(editor).toContainText(labels.receipt.review.blockingIssues.PAYMENT_TOTAL_MISMATCH);
        await expect(editor.getByTestId("receipt-recalculate-receipt-1")).toBeDisabled();

        // 실행: 미등록 선결제를 명시적으로 정정한다. 합계 오류는 별도로 해결해야 한다.
        await editor.locator('select[id$="paymentBreakdown-type"]').selectOption("OTHER_PAID");
        await expect(editor.getByTestId("receipt-recalculate-receipt-1")).toBeDisabled();
        await editor.locator('input[id$="paymentBreakdown-1"]').fill("4030");
        await expect(editor.getByRole("textbox", { name: labels.receipt.review.bookAmount, exact: true })).toHaveValue("8030");
        await expect(editor).toContainText(labels.receipt.review.observedPaymentType.replace("{type}", labels.receipt.review.paymentTypes.LOYALTY_POINTS));
        await expect(editor).not.toContainText(labels.receipt.review.blockingIssues.PAYMENT_TOTAL_MISMATCH);
        expect(conversions).toHaveLength(0);
        expect(batches).toHaveLength(0);
        await editor.locator('select[id$="paymentBreakdown-type"]').scrollIntoViewIfNeeded();
        await expectNoPageOverflow(page);
        await page.screenshot({ path: test.info().outputPath("prepayment-correction.png") });
        await editor.getByTestId("receipt-recalculate-receipt-1").click();
        await expect(editor).toContainText("16.06 KWD");
        await editor.getByRole("button", { name: labels.receipt.review.applyChanges, exact: true }).click();

        // 검증: 원래 분석 경고는 남겨도 현재 차단 사유/행/버튼은 함께 정상화된다.
        await expect(row).toContainText(labels.receipt.review.statusReady);
        await expect(row).not.toContainText(labels.receipt.review.statusNeedsReview);
        await expect(row).toContainText("8,030 JPY");
        await expect(row).toContainText("16.06 KWD");
        await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
        await row.scrollIntoViewIfNeeded();
        await page.screenshot({ path: test.info().outputPath("prepayment-after.png") });
        await page.getByTestId("receipt-review-list").getByRole("button", { name: labels.receipt.review.viewModes[mode === "list" ? "table" : "list"], exact: true }).click();
        await expect(row).toContainText("8,030 JPY");
        await expect(row).toContainText("16.06 KWD");
        await openReviewEditor(page, row, labels);
        await editor.getByRole("button", { name: labels.receipt.review.receiptDetails, exact: true }).click();
        await expect(editor.locator('select[id$="paymentBreakdown-type"]')).toHaveValue("OTHER_PAID");
        await expect(editor).toContainText(labels.receipt.review.unknownWarning);
        await editor.getByRole("button", { name: labels.receipt.review.discardChanges, exact: true }).click();
        await page.getByTestId("receipt-submit-selected").click();
        await expect.poll(() => batches.length).toBe(1);
        expect(conversions).toHaveLength(1);
        expect(batches[0].receipts[0]).toMatchObject({ originalAmount: "8030", purchaseTotal: "8030", conversionQuoteId: "8".repeat(64),
            paymentBreakdown: [
                { paymentType: "OTHER_PAID", amount: "4000", evidence: "ポイント利用" },
                { paymentType: "CREDIT_CARD", amount: "4030", evidence: "カード" },
            ] });
    });
}


for (const { locale, width, colorScheme } of [
    { locale: "ja", width: 390, colorScheme: "dark" },
    { locale: "ko", width: 1024, colorScheme: "light" },
    { locale: "ja", width: 320, colorScheme: "light" },
] as const) {
    test(`ACCOUNT-MONEY persisted padding is formatted in history and details ${locale} ${width}px`, async ({ page }) => {
        // 준비: DB Decimal 문자열의 8자리 0을 그대로 전달하는 응답을 재현한다.
        await page.setViewportSize({ width, height: 844 });
        await page.emulateMedia({ colorScheme });
        await mockAccountBook(page);
        const detail = locales[locale];
        const sampleBook = { ...book, name: "日本旅行", currencyCode: "JPY", currencySymbol: "¥", currencyDecimalPlaces: 0,
            incomeAmount: "20000.00000000", expenseAmount: "10606.00000000", balance: "9394.00000000" };
        const saved = { ...transaction, title: "ANA FESTA 那覇空港店", storeName: "ANA FESTA", category: "食費", memo: "お土産",
            amount: "10606.00000000", originalAmount: "10606.00000000", originalCurrencyCode: "JPY", targetCurrencyCode: "JPY",
            purchaseTotal: "10606.00000000", bookAmount: "10606.00000000", cashTendered: "11000.00000000", changeAmount: "394.00000000",
            exchangeRate: "1.000000000000", requestedRateDate: "2026-09-15", effectiveRateDate: "2026-09-15",
            conversionPolicyVersion: "receipt-fx-v1", roundingPrecision: 0, roundingMode: "HALF_UP",
            receiptPaymentBreakdownJson: JSON.stringify([{ paymentType: "CASH", amount: "10606.00000000", evidence: "現金" }]) };
        await page.route("**/api/v1/account-books**", async route => {
            const suffix = new URL(route.request().url()).pathname.split("/account-books")[1];
            let body: unknown;
            switch (suffix) {
                case "": body = [sampleBook]; break;
                case "/1": case "/1/summary": body = sampleBook; break;
                case "/1/transactions": body = { page: { content: [saved], page: { size: 20, number: 0, totalElements: 1, totalPages: 1 } }, currencyName: "JPY" }; break;
                case "/1/monthly-goals": body = { ...goal, goalAmount: "20000.00000000", expenseAmount: "10606.00000000", remainingAmount: "9394.00000000" }; break;
                case "/1/charts/categories": case "/1/charts/stores": body = { year: 2026, month: 9, totalAmount: "10606.00000000", items: [{ name: "ANA FESTA", amount: "10606.00000000", percentage: 100, transactionCount: 1 }] }; break;
                case "/1/fixed-costs": body = [{ ...transaction, title: "家賃", storeName: "管理会社", category: "住居", amount: "80000.00000000", paymentDay: 15, startYear: 2026, startMonth: 1, active: true }]; break;
                default: return route.fallback();
            }
            return fulfillJson(route, responseDto(body));
        });
        await page.goto(locale === "ko" ? "/account-books/1" : `/${locale}/account-books/1`);
        const section = page.getByTestId("account-book-transactions");

        // 실행 / 검증: 카드와 표의 접힌 원금액/펼친 환율, 상세 결제 금액을 확인한다.
        await expect(section.locator("summary")).toContainText("10,606 JPY");
        await expect(page.locator("main").last()).not.toContainText(".00000000");
        await section.scrollIntoViewIfNeeded();
        await page.screenshot({ path: test.info().outputPath("history-clean-amount.png") });
        await section.locator("summary").click();
        await expect(section.locator("details")).not.toContainText("1.00000000");
        await section.getByRole("button", { name: detail.transactionList.actions.detailAria, exact: true }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toContainText("10,606 JPY");
        await expect(dialog).toContainText("11,000 JPY");
        await expect(dialog).toContainText("394 JPY");
        await expect(dialog).not.toContainText(".00000000");
        await expectNoPageOverflow(page);
        await page.screenshot({ path: test.info().outputPath("detail-clean-amount.png") });
        await dialog.getByRole("button", { name: detail.transactionDetail.close, exact: true }).last().click();
        await page.getByRole("button", { name: detail.transactionList.view.table, exact: true }).click();
        await expect(section.locator("summary")).toContainText("10,606 JPY");
        await expect(section).not.toContainText(".00000000");
        await expectNoPageOverflow(page);

        // 검증: 가계부 목록의 요약에도 같은 표시 정책이 적용된다.
        await page.goto(locale === "ko" ? "/account-books" : `/${locale}/account-books`);
        await expect(page.getByRole("heading", { name: "日本旅行", exact: true })).toBeVisible();
        await expect(page.locator("main").last()).toContainText("20,000");
        await expect(page.locator("main").last()).not.toContainText(".00000000");
    });
}

for (const mode of ["list", "table"] as const) {
    test(`ACCOUNT-MONEY review formatting preserves raw decimal input and batch ${mode}`, async ({ page }) => {
        // 준비: 화면에는 정리된 금액을, 편집과 API에는 원래 정확한 Decimal을 사용한다.
        await page.setViewportSize({ width: mode === "list" ? 390 : 1024, height: 844 });
        await mockAccountBook(page);
        let conversions = 0;
        const batches: Array<{ receipts: Array<Record<string, unknown>> }> = [];
        await page.route("**/transactions/receipt-conversion", route => { conversions += 1; return fulfillJson(route, responseDto(receipt)); });
        await page.route("**/transactions/receipt-batch", route => {
            batches.push(route.request().postDataJSON());
            return fulfillJson(route, responseDto([transaction]));
        });
        await openReceiptReview(page, "ko", 1, { originalAmount: "10606.00000000", bookAmount: "10606.00000000", purchaseTotal: "10606.00000000",
            detectedCurrencyCode: "JPY", originalCurrencyCode: "JPY", convertedAmount: "21.21200000", exchangeRate: "0.002000000000",
            paymentBreakdown: [{ paymentType: "CREDIT_CARD", amount: "10606.00000000", evidence: "VISA", duplicateGroup: null }], reviewStatus: "READY" });
        const row = page.getByTestId("receipt-review-card").first();
        await expect(row).toContainText("10,606 JPY");
        await expect(row).toContainText("21.212 KWD");
        await expect(row).not.toContainText(".00000000");
        await openReviewEditor(page, row);
        const editor = page.getByTestId("receipt-review-editor");
        await expect(editor.getByRole("textbox", { name: receiptLabels.receipt.review.bookAmount, exact: true })).toHaveValue("10606.00000000");
        await expect(editor).toContainText("1 JPY = 0.002 KWD");
        await editor.getByRole("button", { name: receiptLabels.receipt.review.discardChanges, exact: true }).click();
        await page.getByTestId("receipt-review-list").getByRole("button", { name: receiptLabels.receipt.review.viewModes[mode === "list" ? "table" : "list"], exact: true }).click();
        await expect(row).toContainText("10,606 JPY");
        await expect(row).toContainText("21.212 KWD");
        await page.getByTestId("receipt-submit-selected").click();
        await expect.poll(() => batches.length).toBe(1);
        expect(batches[0].receipts[0]).toMatchObject({ originalAmount: "10606.00000000", purchaseTotal: "10606.00000000", conversionQuoteId: "a".repeat(64),
            paymentBreakdown: [{ paymentType: "CREDIT_CARD", amount: "10606.00000000" }] });
        expect(conversions).toBe(0);
    });
}


for (const mode of ["list", "table"] as const) {
    test(`ACCOUNT-RECALC modal requires current quote before apply and keeps both views ${mode}`, async ({ page }) => {
        // 준비: 1,652 JPY 현금 영수증을 1,540으로 정정한다. 거스름돈도 사용자가 함께 정정한다.
        await page.setViewportSize({ width: mode === "list" ? 390 : 1024, height: 844 });
        await mockAccountBook(page);
        const labels = locales.ja.transactionModal;
        const requests: Array<Record<string, unknown>> = [];
        const batches: Array<{ receipts: Array<Record<string, unknown>> }> = [];
        const keys: Array<string | undefined> = [];
        const initial = { ...receipt, originalAmount: "1652", originalCurrencyCode: "JPY", detectedCurrencyCode: "JPY",
            purchaseTotal: "1652", bookAmount: "1652", convertedAmount: "1652", accountBookCurrencyCode: "JPY",
            exchangeRate: "1", conversionStatus: "NOT_REQUIRED", roundingPrecision: 0, title: "GARAGE HOUSE", storeName: "GARAGE HOUSE",
            cashTendered: "2000", change: "348", reviewStatus: "READY",
            paymentBreakdown: [{ paymentType: "CASH", amount: "1652", evidence: "現金", duplicateGroup: null }] };
        await page.route("**/transactions/receipt-conversion", route => {
            const payload = route.request().postDataJSON();
            requests.push(payload);
            return fulfillJson(route, responseDto({ ...initial, originalAmount: payload.originalAmount,
                convertedAmount: payload.originalAmount, requestedRateDate: payload.transactionDate,
                conversionQuoteId: String(requests.length).repeat(64) }));
        });
        await page.route("**/transactions/receipt-batch", route => {
            batches.push(route.request().postDataJSON());
            keys.push(route.request().headers()["idempotency-key"]);
            return fulfillJson(route, { status: 503, message: "retry fixture" }, 503);
        });
        await openReceiptReview(page, "ja", 1, initial);
        const row = page.getByTestId("receipt-review-card").first();
        await openReviewEditor(page, row, labels);
        const editor = page.getByTestId("receipt-review-editor");
        const apply = editor.getByRole("button", { name: labels.receipt.review.applyChanges, exact: true });
        const recalculate = editor.getByTestId("receipt-recalculate-receipt-1");
        await expect(recalculate).toBeHidden();
        await expect(apply).toBeEnabled();
        await editor.locator("summary").click();

        // 실행 / 검증: 현금 배분이 맞아야 재계산 가능하며 재계산 전에는 적용할 수 없다.
        await editor.getByRole("textbox", { name: labels.receipt.review.purchaseTotal, exact: true }).fill("1540");
        await expect(recalculate).toBeVisible();
        await expect(recalculate).toBeDisabled();
        await expect(apply).toBeDisabled();
        await editor.locator('input[id$="paymentBreakdown"]').fill("1540");
        await editor.getByRole("textbox", { name: labels.receipt.review.change, exact: true }).fill("460");
        await expect(recalculate).toBeEnabled();
        await expect(apply).toBeDisabled();
        await apply.scrollIntoViewIfNeeded();
        await page.screenshot({ path: test.info().outputPath("recalculation-required.png") });
        await recalculate.click();
        await expect(recalculate).toBeHidden();
        await expect(apply).toBeEnabled();
        await apply.scrollIntoViewIfNeeded();
        await page.screenshot({ path: test.info().outputPath("recalculation-completed.png") });

        // 검증: 재계산 직후 금액을 다시 만지면 적용을 다시 차단한다.
        const purchase = editor.getByRole("textbox", { name: labels.receipt.review.purchaseTotal, exact: true });
        await purchase.fill("1541");
        await expect(recalculate).toBeVisible();
        await expect(apply).toBeDisabled();
        await purchase.fill("1540");
        await expect(apply).toBeDisabled();
        await recalculate.click();
        await expect(recalculate).toBeHidden();
        await expect(apply).toBeEnabled();

        // 검증: 날짜 변경은 새 quote가 필요하고, 메모/제목 변경은 이미 확인한 quote를 유지한다.
        await editor.getByRole("textbox", { name: labels.fields.transactionDate, exact: true }).fill("2026-09-16");
        await expect(recalculate).toBeVisible();
        await expect(apply).toBeDisabled();
        await recalculate.click();
        await expect(recalculate).toBeHidden();
        await expect(apply).toBeEnabled();
        await editor.getByRole("textbox", { name: labels.fields.memo, exact: true }).fill("金額を原本で確認");
        await expect(recalculate).toBeHidden();
        await apply.click();
        await expect(row).toContainText("1,540 JPY");
        await expect(row).not.toContainText("1,652 JPY");
        await page.screenshot({ path: test.info().outputPath("corrected-initial-view.png") });
        await page.getByTestId("receipt-review-list").getByRole("button", { name: labels.receipt.review.viewModes[mode === "list" ? "table" : "list"], exact: true }).click();
        await expect(row).toContainText("1,540 JPY");
        await expect(row).not.toContainText("1,652 JPY");
        await page.screenshot({ path: test.info().outputPath("corrected-both-views.png") });

        // 검증: 등록 실패/재시도에도 정정한 원본과 새 quote, 같은 idempotency key를 보존한다.
        await page.getByTestId("receipt-submit-selected").click();
        await expect.poll(() => batches.length).toBe(1);
        await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
        await page.getByTestId("receipt-submit-selected").click();
        await expect.poll(() => batches.length).toBe(2);
        expect(batches[0]).toEqual(batches[1]);
        expect(keys[0]).toBeTruthy();
        expect(keys[1]).toBe(keys[0]);
        expect(batches[0].receipts[0]).toMatchObject({ originalAmount: "1540", purchaseTotal: "1540", cashTendered: "2000", change: "460",
            paymentBreakdown: [{ paymentType: "CASH", amount: "1540" }], transactionDate: "2026-09-16", conversionQuoteId: "3".repeat(64) });
        expect(requests).toHaveLength(3);
        await expect(row).toContainText("1,540 JPY");
        await expectNoPageOverflow(page);
    });
}


test("ACCOUNT-RECEIPT compact phone keeps a usable review viewport", async ({ page }) => {
    // 준비: 실제 스크린샷처럼 모바일 브라우저의 짧은 가시 높이, 7개 후보와 경고를 재현한다.
    await page.setViewportSize({ width: 360, height: 620 });
    await mockAccountBook(page);
    await openReceiptReview(page, "ja", 7, {}, {}, ["AMBIGUOUS_CURRENCY_SYMBOL"]);
    const analysisToggle = page.locator('button[aria-controls="receipt-analysis-content"]');
    if (await analysisToggle.getAttribute("aria-expanded") === "true") {
        await analysisToggle.click();
    }

    // 실행: 실제 사용자처럼 결과 목록과 하단 등록 버튼의 화면 위치를 읽는다.
    const body = page.getByTestId("receipt-review-scroll-body");
    const submit = page.getByTestId("receipt-submit-selected");
    const bodyBox = await body.boundingBox();
    const footerBox = await submit.boundingBox();
    await page.screenshot({ path: test.info().outputPath("compact-phone-review.png") });

    // 검증: 목록은 적어도 한 카드를 읽고 조작할 높이를 가지며 버튼과 겹치지 않는다.
    expect(bodyBox!.height).toBeGreaterThanOrEqual(180);
    expect(bodyBox!.y + bodyBox!.height).toBeLessThanOrEqual(footerBox!.y);
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(620);
    await expect(page.getByTestId("receipt-review-card")).toHaveCount(7);
    await expectNoPageOverflow(page);

    // 실행 / 검증: 작은 폭에서도 목록 높이와 버튼 접근성을 유지한다.
    for (const width of [320, 375, 390, 430]) {
        await page.setViewportSize({ width, height: 620 });
        const listBounds = await body.boundingBox();
        const actionBounds = await submit.boundingBox();
        expect(listBounds!.height, `review height at ${width}px`).toBeGreaterThanOrEqual(180);
        expect(listBounds!.y + listBounds!.height).toBeLessThanOrEqual(actionBounds!.y);
        expect(actionBounds!.y + actionBounds!.height).toBeLessThanOrEqual(620);
        await expectNoPageOverflow(page);
    }

    // 실행 / 검증: 사용자의 어두운 테마에서도 같은 공간을 유지한다.
    await page.setViewportSize({ width: 360, height: 620 });
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect((await body.boundingBox())!.height).toBeGreaterThanOrEqual(180);
    const darkTitle = page.getByTestId("receipt-review-card").first().getByRole("button", {
        name: locales.ja.transactionModal.receipt.review.inlineTitle.replace("{index}", "1"), exact: true,
    });
    const darkAmount = page.getByTestId("receipt-review-card").first().getByRole("button", { name: /12.34 USD/ });
    for (const label of [darkTitle, darkAmount]) {
        // 테마 전환의 색상 transition이 완료된 뒤 실제 글자 대비를 확인한다.
        await expect.poll(() => label.evaluate((element) => {
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d")!;
            context.fillStyle = getComputedStyle(element).color;
            context.fillRect(0, 0, 1, 1);
            return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).reduce((sum, channel) => sum + channel, 0);
        }), { message: "dark card primary text brightness" }).toBeGreaterThan(450);
    }
    await page.screenshot({ path: test.info().outputPath("compact-phone-review-dark.png") });

    // 실행 / 검증: 원본 사진 영역을 열어도 결과 한 건을 볼 수 있고 마지막 후보를 편집할 수 있다.
    await analysisToggle.click();
    await expect(page.getByTestId("receipt-file-queue")).toBeVisible();
    const expandedBounds = await body.boundingBox();
    expect(expandedBounds!.height).toBeGreaterThanOrEqual(120);
    await page.screenshot({ path: test.info().outputPath("compact-phone-photos-expanded.png") });
    await analysisToggle.click();
    const last = page.getByTestId("receipt-review-card").last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 0.5 });
    await openReviewEditor(page, last, locales.ja.transactionModal);
    await expect(page.getByTestId("receipt-review-editor")).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("compact-phone-last-editor.png") });
});

for (const locale of ["ja", "ko"] as const) {
    test(`ACCOUNT-RECEIPT upload fills phone before results and collapses after analysis ${locale}`, async ({ page }) => {
        // 준비: 결과가 없는 모바일 업로드와 지연되는 분석 응답을 재현한다.
        await page.setViewportSize({ width: 390, height: 740 });
        await page.emulateMedia({ colorScheme: locale === "ja" ? "dark" : "light" });
        await mockAccountBook(page);
        const labels = locales[locale].transactionModal;
        let releaseAnalysis!: () => void;
        const pendingAnalysis = new Promise<void>(resolve => { releaseAnalysis = resolve; });
        await page.route("**/transactions/receipt-analysis", async route => {
            await pendingAnalysis;
            await fulfillJson(route, responseDto({
                receiptCount: 2, warnings: [], ocrEngine: "vision", usedAi: true,
                categoryOptions: [{ name: "Food", source: "EXISTING" }],
                receipts: receiptCandidates(2),
            }));
        });
        await page.goto(`/${locale}/account-books/1`);
        await page.getByRole("button", { name: locales[locale].header.createTransaction, exact: true }).click();
        await page.getByRole("button", { name: labels.inputMode.receipt, exact: true }).click();
        const panel = page.locator("#receipt-analysis-content");
        const toggle = page.locator('button[aria-controls="receipt-analysis-content"]');
        const dialog = page.locator("#transaction-form-dialog");

        // 검증: 사진 선택 전부터 업로드에 충분한 높이를 주고 화면 안에서 스크롤할 수 있다.
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect((await panel.boundingBox())!.height).toBeGreaterThan(300);
        expect((await dialog.boundingBox())!.y + (await dialog.boundingBox())!.height).toBeLessThanOrEqual(740);
        await page.locator('input[type="file"]').setInputFiles({
            name: "receipt-photo.png", mimeType: "image/png",
            buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
        });
        const analyze = page.getByRole("button", { name: labels.receipt.action, exact: true }).last();
        await analyze.scrollIntoViewIfNeeded();
        await expect(analyze).toBeInViewport();
        await expect(page.getByTestId("receipt-file-queue")).toBeInViewport();
        await page.screenshot({ path: test.info().outputPath(`receipt-upload-before-analysis-${locale}.png`) });
        await expectNoPageOverflow(page);

        // 실행 / 검증: 분석 중에는 업로드 상태가 유지되고 결과를 받으면 자동으로 접힌다.
        await analyze.click();
        await expect(page.getByRole("button", { name: labels.receipt.analyzing, exact: true }).last()).toBeVisible();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect((await panel.boundingBox())!.height).toBeGreaterThan(300);
        releaseAnalysis();
        await expect(page.getByTestId("receipt-review-card")).toHaveCount(2);
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await expect(panel).toBeHidden();
        expect((await page.getByTestId("receipt-review-scroll-body").boundingBox())!.height).toBeGreaterThan(250);
        await page.screenshot({ path: test.info().outputPath(`receipt-upload-after-analysis-${locale}.png`) });

        // 검증: 결과 뒤 사진을 다시 펼쳐도 검토 목록의 조작 공간을 보존한다.
        await toggle.click();
        expect((await panel.boundingBox())!.height).toBeLessThanOrEqual(160);
        expect((await page.getByTestId("receipt-review-scroll-body").boundingBox())!.height).toBeGreaterThan(120);
        await expectNoPageOverflow(page);
    });
}
