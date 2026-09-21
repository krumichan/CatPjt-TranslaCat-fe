import assert from "node:assert/strict";
import test from "node:test";
import {
    applyReceiptConversion, buildReceiptBatch, canRegisterReceipt, createReceiptReview,
    editReceiptReview, hasValidReceiptSource, receiptSourceKey, selectReceiptReview,
} from "../../src/utils/account-book/receiptReview.ts";

const ready = {
    receiptId: "receipt-1", title: "Coffee", storeName: "Cafe", originalAmount: "12.34",
    detectedCurrencyCode: "USD", transactionDate: "2026-09-15", categoryName: "Food",
    memo: "Lunch", confidence: 0.92, detectedLanguage: "en", status: "READY", warnings: [],
    accountBookCurrencyCode: "JPY", convertedAmount: "1826", exchangeRate: "148.00",
    requestedRateDate: "2026-09-15", effectiveRateDate: "2026-09-15", exchangeRateProvider: "FRANKFURTER",
    conversionStatus: "CONVERTED", rateDateFallback: false,
};
const response = (receipts) => ({ receipts, receiptCount: receipts.length, warnings: [], ocrEngine: null, usedAi: true });
const reviews = (...items) => createReceiptReview(response(items.length ? items : [ready]));

test("one receipt becomes one independent selected review candidate with decimal strings", () => {
    const [item] = reviews();
    assert.equal(item.selected, true);
    assert.equal(item.originalAmount, "12.34");
    assert.equal(item.conversion.convertedAmount, "1826");
    assert.equal(item.originalCurrencyCode, "USD");
    assert.equal(item.conversion.accountBookCurrencyCode, "JPY");
    assert.equal(canRegisterReceipt(item), true);
});

test("mixed-language and currency receipts retain independent amounts and partial failures", () => {
    const items = reviews(ready,
        { ...ready, receiptId: "receipt-2", detectedLanguage: "ja", detectedCurrencyCode: "JPY", originalAmount: "1280", convertedAmount: "1280", exchangeRate: "1", conversionStatus: "NOT_REQUIRED" },
        { ...ready, receiptId: "receipt-3", detectedLanguage: "fr", detectedCurrencyCode: "EUR", conversionStatus: "RATE_UNAVAILABLE", convertedAmount: null, warnings: ["Provider unavailable"] },
        { ...ready, receiptId: "receipt-4", status: "UNREADABLE", originalAmount: null, detectedCurrencyCode: null, convertedAmount: null });
    assert.deepEqual(items.map((item) => item.selected), [true, true, false, false]);
    assert.equal(items[2].analysisWarnings[0], "Provider unavailable");
    assert.equal(items[3].originalAmount, "");
    assert.equal(items[3].originalCurrencyCode, "");
    assert.equal(buildReceiptBatch(items).receipts.length, 2);
});

test("selection changes only the requested card and batch sends exactly selected fields", () => {
    const initial = reviews(ready, { ...ready, receiptId: "receipt-2" });
    const items = selectReceiptReview(initial, initial[0].clientId, false);
    assert.equal(initial[0].selected, true);
    assert.equal(items[0].selected, false);
    assert.equal(items[1], initial[1]);
    const batch = buildReceiptBatch(items);
    assert.deepEqual(batch, { receipts: [{ receiptId: "receipt-2", title: "Coffee", storeName: "Cafe", categoryName: "Food", originalAmount: "12.34", originalCurrencyCode: "USD", transactionDate: "2026-09-15", memo: "Lunch" }] });
    for (const field of ["exchangeRate", "convertedAmount", "exchangeRateProvider", "confidence", "selected", "conversion"]) {
        assert.equal(field in batch.receipts[0], false, `must not trust client ${field}`);
    }
});

for (const [field, value] of [["originalAmount", "10.125"], ["originalCurrencyCode", "kwd"], ["transactionDate", "2026-09-14"]]) {
    test(`${field} edit immediately clears stale conversion and blocks batch registration`, () => {
        const [initial] = reviews();
        const edited = editReceiptReview(initial, field, value);
        assert.equal(edited.conversionStale, true);
        assert.equal(edited.conversion.convertedAmount, null);
        assert.equal(edited.conversion.exchangeRate, null);
        assert.equal(edited.conversion.effectiveRateDate, null);
        assert.equal(edited.conversion.exchangeRateProvider, null);
        assert.equal(canRegisterReceipt(edited), false);
        assert.throws(() => buildReceiptBatch([edited]), /current conversion/);
        assert.equal(initial.conversion.convertedAmount, "1826");
    });
}

test("title/category/store/memo edits preserve conversion and direct category text", () => {
    let [item] = reviews();
    for (const field of ["title", "categoryName", "storeName", "memo"]) item = editReceiptReview(item, field, "  Nouvelle catégorie  ");
    assert.equal(item.conversionStale, false);
    assert.equal(canRegisterReceipt(item), true);
    const [saved] = buildReceiptBatch([item]).receipts;
    assert.equal(saved.categoryName, "Nouvelle catégorie");
    assert.equal(saved.memo, "Nouvelle catégorie");
});

test("late conversion result cannot overwrite a newer source edit", () => {
    const [initial] = reviews();
    const sourceKey = receiptSourceKey(initial);
    const changed = editReceiptReview(initial, "originalAmount", "18.88");
    assert.equal(applyReceiptConversion(changed, sourceKey, initial.conversion), changed);
    assert.equal(changed.conversionStale, true);
});

test("authoritative preview restores readiness and preserves rate date fallback", () => {
    const [initial] = reviews();
    const changed = editReceiptReview(initial, "transactionDate", "2026-09-13");
    const applied = applyReceiptConversion(changed, receiptSourceKey(changed), {
        ...initial.conversion, requestedRateDate: "2026-09-13", effectiveRateDate: "2026-09-11", rateDateFallback: true, convertedAmount: "1800",
    });
    assert.equal(canRegisterReceipt(applied), true);
    assert.equal(applied.conversion.convertedAmount, "1800");
    assert.equal(applied.conversion.effectiveRateDate, "2026-09-11");
    assert.equal(applied.conversion.rateDateFallback, true);
});

test("failed provider preview stays visible and cannot be registered", () => {
    const [initial] = reviews();
    const applied = applyReceiptConversion(initial, receiptSourceKey(initial), { ...initial.conversion, convertedAmount: null, conversionStatus: "RATE_UNAVAILABLE", warnings: ["Try again later"] });
    assert.equal(canRegisterReceipt(applied), false);
    assert.equal(applied.selected, true);
    assert.deepEqual(applied.conversion.warnings, ["Try again later"]);
    assert.throws(() => buildReceiptBatch([applied]));
});

test("successful retry replaces obsolete conversion failure warnings", () => {
    const [initial] = reviews({ ...ready, conversionStatus: "RATE_UNAVAILABLE", convertedAmount: null, warnings: ["RATE_UNAVAILABLE", "LOW_CURRENCY_CONFIDENCE"] });
    const applied = applyReceiptConversion(initial, receiptSourceKey(initial), { ...initial.conversion, conversionStatus: "CONVERTED", convertedAmount: "1826", warnings: [] });
    assert.deepEqual(applied.analysisWarnings, ["LOW_CURRENCY_CONFIDENCE"]);
    assert.deepEqual(applied.conversion.warnings, []);
    assert.equal(canRegisterReceipt(applied), true);
});

test("missing or ambiguous dates and unknown currencies are not invented", () => {
    for (const date of [null, "", "03/04/2026", "2026-02-30", "2026-13-01"]) {
        const [item] = reviews({ ...ready, transactionDate: date });
        assert.equal(item.transactionDate, date ?? "");
        assert.equal(hasValidReceiptSource(item), false);
        assert.equal(item.selected, false);
    }
    for (const currency of [null, "$", "¥", "USDD"]) assert.equal(reviews({ ...ready, detectedCurrencyCode: currency })[0].selected, false);
});

test("precise decimal amounts including three minor units never pass through Number", () => {
    for (const originalAmount of ["1280", "12000", "12.34", "1234.56", "10.125", "9007199254740993.125"]) {
        const [item] = reviews({ ...ready, originalAmount });
        assert.equal(buildReceiptBatch([item]).receipts[0].originalAmount, originalAmount);
    }
});

test("invalid money notation is rejected rather than guessed or stripped", () => {
    for (const originalAmount of ["0", "0.000", "-1", "1.234,56", "1,280", "1e3", "NaN", "Infinity", ".5", "12.34USD", "123456789012345678901", "0.123456789"]) {
        const [item] = reviews({ ...ready, originalAmount });
        assert.equal(hasValidReceiptSource(item), false, originalAmount);
        assert.equal(canRegisterReceipt(item), false, originalAmount);
    }
});

test("review validation matches server text size limits without truncating AI facts", () => {
    for (const [field, length] of [["title", 101], ["storeName", 101], ["categoryName", 51], ["memo", 501]]) {
        const [item] = reviews({ ...ready, [field]: "x".repeat(length) });
        assert.equal(item[field].length, length);
        assert.equal(canRegisterReceipt(item), false);
    }
});

test("empty selection and unresolved candidates cannot produce an accidental batch", () => {
    assert.throws(() => buildReceiptBatch([]));
    assert.throws(() => buildReceiptBatch(reviews().map((item) => ({ ...item, selected: false }))));
    const [item] = reviews({ ...ready, categoryName: null });
    assert.equal(item.categoryName, "");
    assert.throws(() => buildReceiptBatch([{ ...item, selected: true }]));
});
