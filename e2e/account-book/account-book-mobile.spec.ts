import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/mock-test";
import { fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import translations from "../../messages/ko/accountBook.json";
import jaTranslations from "../../messages/ja/accountBook.json";

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
) {
    const detail = locales[locale];
    const labels = detail.transactionModal;
    await page.route("**/transactions/receipt-analysis", route => fulfillJson(route, responseDto({
        receiptCount, warnings: [], ocrEngine: "vision", usedAi: true,
        categoryOptions: [
            { name: "Food", source: "EXISTING" },
            { name: "생활", source: "DEFAULT" },
            { name: "기타", source: "FALLBACK" },
        ],
        receipts: receiptCandidates(receiptCount).map((candidate, index) =>
            index === 0 ? { ...candidate, ...firstReceiptOverride } : candidate),
    })));
    await page.goto(locale === "ko" ? "/account-books/1" : `/${locale}/account-books/1`);
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
    await expect(cards).toHaveCount(3);
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
    await row.getByRole("checkbox").check();
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
    await expect(dialog).toContainText("7089 JPY");
    await expect(dialog).toContainText("2069");
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
    const editTrigger = page.getByRole("button", { name: receiptLabels.receipt.review.reviewEdit, exact: true }).first();
    await editTrigger.click();
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
    await page.getByRole("button", { name: receiptLabels.receipt.review.reviewEdit, exact: true }).first().click();
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

    await firstRow.getByRole("button", { name: receiptLabels.receipt.review.reviewEdit, exact: true }).click();
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
    await expect(row).toContainText("4.600 KWD");
    await expect(row).toContainText("관측 12.34 → 사용자 수정 15.00");
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

test("ACCOUNT-RECEIPT cancelling an in-flight amount edit ignores its late response and preserves a newer category", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 844 });
    await mockAccountBook(page);
    let release: (() => void) | undefined;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let conversionCalls = 0;
    await page.route("**/transactions/receipt-conversion", async route => {
        conversionCalls += 1;
        await gate;
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
    release?.();
    await expect(row).toContainText("12.34 USD");
    await expect(row).toContainText("3.784 KWD");
    await expect(category).toHaveValue("생활");
});

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
    await row.getByRole("button", { name: /5020 JPY/ }).click();
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
    await page.goto("/account-books/1");
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
        await expect(cards.nth(2).getByRole("checkbox")).not.toBeChecked();
        await expectNoPageOverflow(page);
        if (width === 320 || width === 1024) {
            await cards.nth(0).scrollIntoViewIfNeeded();
            await page.screenshot({ path: test.info().outputPath("receipt-review.png") });
        }
        await cards.nth(1).getByRole("checkbox").uncheck();
        await cards.nth(1).getByRole("checkbox").check();
        await page.getByRole("button", { name: receiptLabels.receipt.review.reviewEdit, exact: true }).first().click();
        const editor = page.getByTestId("receipt-review-editor");
        await editor.getByText(receiptLabels.receipt.review.receiptDetails, { exact: true }).click();
        await editor.getByRole("textbox", { name: receiptLabels.receipt.review.purchaseTotal, exact: true }).fill("10.12");
        await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
        await editor.getByRole("button", { name: receiptLabels.receipt.review.applyChanges, exact: true }).click();
        await expect(page.getByTestId("receipt-submit-selected")).toBeDisabled();
        await page.getByRole("button", { name: receiptLabels.receipt.review.reviewEdit, exact: true }).first().click();
        await page.getByTestId("receipt-recalculate-receipt-1").click();
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
