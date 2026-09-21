import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/mock-test";
import { fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import translations from "../../messages/ko/accountBook.json";

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
const receipt = { receiptId: "receipt-1", title: "Coffee", storeName: longName.slice(0, 90),
    originalAmount: "12.34", detectedCurrencyCode: "USD", originalCurrencyCode: "USD",
    transactionDate: "2026-09-15", categoryName: longName.slice(0, 50), memo: longName,
    confidence: 0.97, detectedLanguage: "en", status: "READY", warnings: [],
    accountBookCurrencyCode: "KWD", convertedAmount: "3.784", exchangeRate: "0.30664",
    requestedRateDate: "2026-09-15", effectiveRateDate: "2026-09-15",
    exchangeRateProvider: "FRANKFURTER", conversionStatus: "CONVERTED", rateDateFallback: false };

async function openReceiptReview(page: Page) {
    await page.route("**/transactions/receipt-analysis", route => fulfillJson(route, responseDto({
        receiptCount: 3, warnings: [], ocrEngine: "vision", usedAi: true,
        receipts: [receipt, { ...receipt, receiptId: "receipt-2", title: "Déjeuner", detectedCurrencyCode: "EUR", originalCurrencyCode: "EUR", detectedLanguage: "fr" },
            { ...receipt, receiptId: "receipt-3", title: null, originalAmount: null, detectedCurrencyCode: null,
                originalCurrencyCode: null, transactionDate: null, convertedAmount: null, exchangeRate: null,
                status: "UNREADABLE", conversionStatus: "NEEDS_REVIEW", warnings: ["AMBIGUOUS_CURRENCY_SYMBOL"] }],
    })));
    await page.goto("/ko/account-books/1");
    await page.getByRole("button", { name: "거래 등록", exact: true }).click();
    await page.getByRole("button", { name: receiptLabels.inputMode.receipt, exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "three-receipts.png", mimeType: "image/png",
        buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
    await page.getByRole("button", { name: receiptLabels.receipt.action, exact: true }).last().click();
    await expect(page.getByTestId("receipt-review-card")).toHaveCount(3);
}

async function mockAccountBook(page: Page) {
    await mockCommonPageDependencies(page);
    await mockIdleWebSocket(page);
    await page.route("**/currencies", route => fulfillJson(route, responseDto([
        { id: 1, code: "KWD", name: longName, symbol: "KD", decimalPlaces: 3, baseCurrency: false },
    ])));
    await page.route("**/account-books**", async route => {
        if (["document", "script"].includes(route.request().resourceType())) return route.fallback();
        const url = new URL(route.request().url());
        const suffix = url.pathname.split("/account-books")[1];
        let body: unknown;
        switch (suffix) {
            case "": body = [book]; break;
            case "/1": body = book; break;
            case "/1/summary": body = { ...book, accountBookId: 1 }; break;
            case "/1/categories": body = [{ id: 1, accountBookId: 1, name: longName, active: true, displayOrder: 0 }]; break;
            case "/1/transactions": body = { page: { content: [transaction], page: { size: 20, number: 0, totalElements: 21, totalPages: 2 } }, currencyName: "KWD" }; break;
            case "/1/transactions/months": body = [{ value: "2026-09", label: "2026-09", year: 2026, month: 9, currentMonth: true }]; break;
            case "/1/transactions/stores/suggestions": body = [{ storeName: longName }]; break;
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

for (const width of [320, 375, 390, 430, 768, 1024]) {
    test(`ACCOUNT-MOBILE detail/cards/table/charts/modals ${width}px`, async ({ page }) => {
        test.setTimeout(90_000);
        await page.setViewportSize({ width, height: 844 });
        await mockAccountBook(page);
        await page.goto("/ko/account-books/1");
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
        await page.goto("/ko/account-books");
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
        await page.setViewportSize({ width, height: 844 });
        await mockAccountBook(page);
        let batches = 0;
        await page.route("**/transactions/receipt-conversion", async route => {
            const payload = route.request().postDataJSON();
            expect(payload.originalAmount).toBe("10.12");
            expect(payload.exchangeRate).toBeUndefined();
            await fulfillJson(route, responseDto({ ...receipt, originalAmount: "10.12", convertedAmount: "3.103" }));
        });
        await page.route("**/transactions/receipt-batch", async route => {
            const payload = route.request().postDataJSON();
            expect(payload.receipts).toHaveLength(2);
            expect(payload.receipts[0].originalAmount).toBe("10.12");
            expect(payload.receipts[0].convertedAmount).toBeUndefined();
            expect(payload.receipts[0].exchangeRate).toBeUndefined();
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
        await cards.nth(0).getByLabel(receiptLabels.receipt.review.originalAmount, { exact: true }).fill("10.12");
        await expect(page.getByTestId("receipt-submit-selected")).toBeDisabled();
        await page.getByTestId("receipt-recalculate-receipt-1").click();
        await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
        await expectNoPageOverflow(page);
        await page.getByTestId("receipt-submit-selected").click();
        await expect(page.getByTestId("receipt-review-list").getByRole("alert")).toBeVisible();
        await expect(cards).toHaveCount(3);
        await expect(cards.nth(1).getByRole("checkbox")).toBeChecked();
        await page.getByTestId("receipt-submit-selected").click();
        await expect(page.getByTestId("receipt-review-list")).toHaveCount(0);
        expect(batches).toBe(2);
    });
}
