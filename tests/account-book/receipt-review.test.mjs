import assert from "node:assert/strict";
import test from "node:test";
import {
    applyReceiptConversion, buildReceiptBatch, canRegisterReceipt, completeReceiptReview,
    createManualReceiptReview, createReceiptReview,
    buildReceiptCategoryOptions,
    applyReceiptInlineAmountCorrection, classifyReceiptInlineAmountEdit,
    editReceiptReview, editReceiptPayment, hasValidReceiptSource, receiptSourceKey, selectReceiptReview,
    selectRegisterableReceiptReviews, summarizeReceiptSelection, validateReceiptForRegistration,
} from "../../src/utils/account-book/receiptReview.ts";

const ready = {
    receiptId: "receipt-1", title: "Coffee", storeName: "Cafe", originalAmount: "12.34",
    detectedCurrencyCode: "USD", transactionDate: "2026-09-15", transactionTime: "20:13:39", categoryName: "Food",
    memo: "Lunch", confidence: 0.92, detectedLanguage: "en", status: "READY", warnings: [],
    accountBookCurrencyCode: "JPY", convertedAmount: "1826", exchangeRate: "148.00",
    requestedRateDate: "2026-09-15", effectiveRateDate: "2026-09-15", exchangeRateProvider: "FRANKFURTER",
    rateFetchedAt: "2026-09-15T09:00:00Z", convertedAt: "2026-09-21T01:00:00Z",
    roundingPrecision: 0, roundingMode: "HALF_UP", conversionPolicyVersion: "receipt-fx-v1",
    conversionQuoteId: "a".repeat(64),
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

test("existing, default, new and fallback category metadata stay selectable and non-blocking", () => {
    const source = response([
        { ...ready, categoryName: "Food", categorySource: "EXISTING", categoryReason: "active category" },
        { ...ready, receiptId: "receipt-2", categoryName: "생활", categorySource: "DEFAULT", categoryReason: "household goods" },
        { ...ready, receiptId: "receipt-3", categoryName: "반려동물", categorySource: "NEW", categoryReason: "pet supplies" },
        { ...ready, receiptId: "receipt-4", categoryName: "기타", categorySource: "FALLBACK", categoryReason: "insufficient evidence" },
    ]);
    source.categoryOptions = [
        { name: "Food", source: "EXISTING" },
        { name: "생활", source: "DEFAULT" },
        { name: "기타", source: "DEFAULT" },
    ];
    const items = createReceiptReview(source);
    assert.deepEqual(items.map((item) => item.categorySource), ["EXISTING", "DEFAULT", "NEW", "FALLBACK"]);
    assert.ok(items.every((item) => validateReceiptForRegistration(item).registrable));
    assert.deepEqual(buildReceiptCategoryOptions(["Food"], source.categoryOptions, items).map(({ name }) => name), [
        "Food", "생활", "기타", "반려동물",
    ]);
    assert.equal(buildReceiptBatch(items).receipts[2].categorySource, "NEW");
});

test("mixed-language and currency receipts retain independent amounts and partial failures", () => {
    const items = reviews(ready,
        { ...ready, receiptId: "receipt-2", detectedLanguage: "ja", detectedCurrencyCode: "JPY", originalAmount: "1280", convertedAmount: "1280", exchangeRate: "1", conversionStatus: "NOT_REQUIRED" },
        { ...ready, receiptId: "receipt-3", detectedLanguage: "fr", detectedCurrencyCode: "EUR", conversionStatus: "RATE_UNAVAILABLE", convertedAmount: null, warnings: ["Provider unavailable"] },
        { ...ready, receiptId: "receipt-4", status: "UNREADABLE", originalAmount: null, detectedCurrencyCode: null, convertedAmount: null });
    assert.deepEqual(items.map((item) => item.selected), [true, true, true, true]);
    assert.equal(items[2].analysisWarnings[0], "Provider unavailable");
    assert.equal(items[3].originalAmount, "");
    assert.equal(items[3].originalCurrencyCode, "");
    assert.throws(() => buildReceiptBatch(items));
    assert.equal(buildReceiptBatch(selectRegisterableReceiptReviews(items)).receipts.length, 2);
});

test("selection changes only the requested card and batch sends exactly selected fields", () => {
    const initial = reviews(ready, { ...ready, receiptId: "receipt-2" });
    const items = selectReceiptReview(initial, initial[0].clientId, false);
    assert.equal(initial[0].selected, true);
    assert.equal(items[0].selected, false);
    assert.equal(items[1], initial[1]);
    const batch = buildReceiptBatch(items);
    assert.deepEqual(batch, { receipts: [{
        receiptId: "legacy-source:1:2", title: "Coffee", storeName: "Cafe", branchName: null,
        categoryName: "Food", categorySource: "EXISTING", categoryReason: null,
        purchaseTotal: "12.34", paymentBreakdown: [], cashTendered: null,
        change: null, originalAmount: "12.34", originalCurrencyCode: "USD",
        transactionDate: "2026-09-15", transactionTime: "20:13:39", memo: "Lunch", conversionQuoteId: "a".repeat(64),
        sourceImageId: "legacy-source", analysisRevision: 1,
        amountPolicyVersion: "receipt-book-amount-v1",
        amountReason: "PURCHASE_TOTAL_NO_PAYMENT_ALLOCATION", reviewStatus: "READY",
    }] });
    for (const field of ["exchangeRate", "convertedAmount", "exchangeRateProvider", "confidence", "selected", "conversion"]) {
        assert.equal(field in batch.receipts[0], false, `must not trust client ${field}`);
    }
});

test("papasu payment facts keep 7089 purchase total and derive 5020 book amount", () => {
    const papasu = {
        ...ready, receiptId: "papasu", title: "どらっぐ ぱぱす 船堀店",
        storeName: "どらっぐ ぱぱす", branchName: "船堀店", purchaseTotal: "7089",
        paymentBreakdown: [
            { paymentType: "LOYALTY_POINTS", amount: "2069", evidence: "ポイント支払", duplicateGroup: null },
            { paymentType: "CREDIT_CARD", amount: "5020", evidence: "クレジット", duplicateGroup: "card-1" },
            { paymentType: "CREDIT_CARD", amount: "5020", evidence: "カード明細", duplicateGroup: "card-1" },
        ], change: "0", bookAmount: "5020", originalAmount: "5020", detectedCurrencyCode: "JPY",
        convertedAmount: "5020", exchangeRate: "1", conversionStatus: "NOT_REQUIRED",
        amountPolicyVersion: "receipt-book-amount-v1", amountReason: "SETTLED_PAYMENT_EXCLUDING_LOYALTY_POINTS",
        reviewStatus: "READY",
    };
    const [item] = createReceiptReview(response([papasu]), "image-papasu", 3, "papasu.jpg");
    assert.equal(item.clientId, "image-papasu:3:papasu");
    assert.equal(item.purchaseTotal, "7089");
    assert.equal(item.originalAmount, "5020");
    const changed = editReceiptPayment(item, 0, "2000");
    assert.equal(changed.reviewStatus, "NEEDS_REVIEW");
    assert.equal(changed.originalAmount, "");
    assert.equal(changed.conversionStale, true);
    assert.equal(changed.selected, true);
});

test("cash tendered and change determine the settled cash amount without double counting", () => {
    const cash = {
        ...ready, purchaseTotal: "9.00", originalAmount: "9.00", bookAmount: "9.00",
        paymentBreakdown: [{ paymentType: "CASH", amount: "10.00", evidence: "Cash 10.00", duplicateGroup: null }],
        cashTendered: "10.00", change: "1.00",
    };
    const [item] = createReceiptReview(response([cash]));
    const recalculated = editReceiptPayment(item, 0, "10.00");
    assert.equal(recalculated.originalAmount, "9");
    assert.equal(recalculated.reviewStatus, "READY");
});

test("gross card heading plus points derives the net settlement", () => {
    const grossCard = {
        ...ready, purchaseTotal: "7089", originalAmount: "5020", bookAmount: "5020",
        paymentBreakdown: [
            { paymentType: "CREDIT_CARD", amount: "7089", evidence: "クレジット(NFC)", duplicateGroup: null },
            { paymentType: "LOYALTY_POINTS", amount: "2069", evidence: "ポイント支払", duplicateGroup: null },
        ],
    };
    const [item] = createReceiptReview(response([grossCard]));
    const recalculated = editReceiptPayment(item, 0, "7089");
    assert.equal(recalculated.originalAmount, "5020");
    assert.equal(recalculated.reviewStatus, "READY");
});

test("a single card allocation is an unambiguous inline correction and remains source-linked", () => {
    const [item] = reviews({
        ...ready,
        purchaseTotal: "12.34",
        paymentBreakdown: [{ paymentType: "CREDIT_CARD", amount: "12.34", evidence: "VISA", duplicateGroup: null }],
        bookAmount: "12.34",
        amountReason: "SETTLED_PAYMENT_EXCLUDING_LOYALTY_POINTS",
        reviewStatus: "READY",
    });

    assert.deepEqual(classifyReceiptInlineAmountEdit(item), { mode: "SINGLE_PAYMENT", paymentIndex: 0, reason: null });
    const changed = applyReceiptInlineAmountCorrection(item, "15.00");
    assert.ok(changed);
    assert.equal(changed.purchaseTotal, "15.00");
    assert.equal(changed.originalAmount, "15");
    assert.equal(changed.paymentBreakdown[0].amount, "15.00");
    assert.equal(changed.paymentBreakdown[0].evidence, "VISA");
    assert.equal(changed.amountCorrection.observedPurchaseTotal, "12.34");
    assert.equal(changed.amountCorrection.observedPaymentAmount, "12.34");
});

test("points, multiple allocations and cash change require detailed fact editing", () => {
    const [base] = reviews();
    const classify = (paymentBreakdown, cashTendered = null, change = null) => classifyReceiptInlineAmountEdit({
        ...base, paymentBreakdown, cashTendered, change,
    });
    assert.equal(classify([
        { paymentType: "LOYALTY_POINTS", amount: "2", evidence: "points", duplicateGroup: null },
        { paymentType: "CREDIT_CARD", amount: "10.34", evidence: "card", duplicateGroup: null },
    ]).reason, "POINTS");
    assert.equal(classify([
        { paymentType: "CREDIT_CARD", amount: "6", evidence: "card", duplicateGroup: null },
        { paymentType: "CASH", amount: "6.34", evidence: "cash", duplicateGroup: null },
    ]).reason, "MULTIPLE_PAYMENTS");
    assert.equal(classify([
        { paymentType: "CASH", amount: "20", evidence: "cash", duplicateGroup: null },
    ], "20", "7.66").reason, "CASH_CHANGE");
});

test("separate image revisions create source-linked stable candidate identities", () => {
    const [first] = createReceiptReview(response([ready]), "image-a", 1, "a.jpg");
    const [retry] = createReceiptReview(response([ready]), "image-a", 2, "a.jpg");
    const [second] = createReceiptReview(response([ready]), "image-b", 1, "b.jpg");
    assert.deepEqual([first.clientId, retry.clientId, second.clientId], [
        "image-a:1:receipt-1", "image-a:2:receipt-1", "image-b:1:receipt-1",
    ]);
    assert.deepEqual([first.registrationReceiptId, retry.registrationReceiptId, second.registrationReceiptId], [
        "image-a:1:1", "image-a:2:1", "image-b:1:1",
    ]);
});

test("batch receipt identifiers stay unique when separate AI responses reuse provider ids", () => {
    const [first] = createReceiptReview(response([ready]), "source-a", 1, "a.jpg");
    const [second] = createReceiptReview(response([ready]), "source-b", 1, "b.jpg");
    const batch = buildReceiptBatch([first, second]);
    assert.deepEqual(batch.receipts.map((item) => item.receiptId), ["source-a:1:1", "source-b:1:1"]);
    assert.equal(new Set(batch.receipts.map((item) => item.receiptId)).size, 2);
});

for (const [field, value] of [["originalAmount", "10.125"], ["originalCurrencyCode", "kwd"], ["transactionDate", "2026-09-14"]]) {
    test(`${field} edit immediately clears stale conversion and blocks batch registration`, () => {
        const [initial] = reviews();
        const edited = editReceiptReview(initial, field, value);
        assert.equal(edited.conversionStale, true);
        assert.equal(edited.selected, true);
        assert.equal(edited.conversion.convertedAmount, null);
        assert.equal(edited.conversion.exchangeRate, null);
        assert.equal(edited.conversion.effectiveRateDate, null);
        assert.equal(edited.conversion.exchangeRateProvider, null);
        assert.equal(edited.conversion.conversionQuoteId, null);
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

test("an idempotency key survives a failed retry and changes with the selected payload", async () => {
    const { getOrCreateReceiptBatchAttempt } = await import("../../src/utils/account-book/receiptReview.ts");
    const firstRequest = buildReceiptBatch(reviews());
    const first = getOrCreateReceiptBatchAttempt(null, firstRequest, () => "receipt-attempt-1");
    const replay = getOrCreateReceiptBatchAttempt(first, firstRequest, () => "must-not-run");
    assert.equal(replay, first);
    const changed = { receipts: [{ ...firstRequest.receipts[0], memo: "changed" }] };
    const second = getOrCreateReceiptBatchAttempt(first, changed, () => "receipt-attempt-2");
    assert.equal(second.idempotencyKey, "receipt-attempt-2");
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
        assert.equal(item.selected, true);
    }
    for (const currency of [null, "$", "¥", "USDD"]) {
        const [item] = reviews({ ...ready, detectedCurrencyCode: currency });
        assert.equal(item.selected, true);
        assert.equal(canRegisterReceipt(item), false);
        assert.throws(() => buildReceiptBatch([item]));
    }
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

test("one registration validation result drives row status, selection summary and batch eligibility", () => {
    const valid = reviews()[0];
    const missingCategory = { ...reviews({ ...ready, receiptId: "receipt-2", categoryName: null })[0], selected: true };
    const unselectedInvalid = { ...reviews({ ...ready, receiptId: "receipt-3", title: null })[0], selected: false };
    const result = validateReceiptForRegistration(missingCategory);
    assert.equal(result.registrable, false);
    assert.deepEqual(result.blockingIssues.map(({ code, field }) => ({ code, field })), [
        { code: "CATEGORY_REQUIRED", field: "categoryName" },
    ]);
    assert.deepEqual(summarizeReceiptSelection([valid, missingCategory, unselectedInvalid]), {
        selectedCount: 2,
        registrableCount: 1,
        blockedCount: 1,
    });
    assert.throws(() => buildReceiptBatch([valid, missingCategory, unselectedInvalid]), /current conversion|require review/);
});

test("select registerable only explicitly excludes invalid selected receipts", () => {
    const valid = reviews()[0];
    const invalid = { ...reviews({ ...ready, receiptId: "receipt-2", categoryName: null })[0], selected: true };
    const filtered = selectRegisterableReceiptReviews([valid, invalid]);
    assert.equal(filtered[0].selected, true);
    assert.equal(filtered[1].selected, false);
    assert.equal(buildReceiptBatch(filtered).receipts.length, 1);
});

test("metadata corrections clear current blockers without erasing historical AI warnings or quote", () => {
    const [initial] = reviews({ ...ready, categoryName: null, warnings: ["CATEGORY_REQUIRES_REVIEW"] });
    const quote = initial.conversion.conversionQuoteId;
    const corrected = editReceiptReview({ ...initial, selected: true }, "categoryName", "Food");
    assert.equal(validateReceiptForRegistration(corrected).registrable, true);
    assert.deepEqual(corrected.analysisWarnings, ["CATEGORY_REQUIRES_REVIEW"]);
    assert.equal(corrected.conversion.conversionQuoteId, quote);
    assert.equal(corrected.conversionStale, false);
});

test("review assisted selection stays separate from source confirmation and binds to draft revision", () => {
    const [item] = createReceiptReview(
        response([{ ...ready, boundingBox: [0.1, 0.2, 0.8, 0.9] }]),
        "image-assisted", 2, "assisted.jpg", true,
    );
    assert.equal(item.selected, true);
    assert.deepEqual(validateReceiptForRegistration(item).blockingIssues.map(({ code }) => code), [
        "REVIEW_CONFIRMATION_REQUIRED",
    ]);

    const confirmed = { ...completeReceiptReview(item), selected: true };
    assert.equal(validateReceiptForRegistration(confirmed).registrable, true);
    assert.equal(buildReceiptBatch([confirmed]).receipts[0].reviewedRevision, 0);
    assert.deepEqual(buildReceiptBatch([confirmed]).receipts[0].sourceRegion, [0.1, 0.2, 0.8, 0.9]);

    const changed = { ...editReceiptReview(confirmed, "title", "Corrected title"), draftRevision: 1 };
    assert.equal(changed.reviewedRevision, null);
    assert.equal(validateReceiptForRegistration(changed).blockingIssues.at(-1).code, "REVIEW_CONFIRMATION_REQUIRED");
});

test("manual source-region candidate is added as an unsaved blocked draft", () => {
    const item = createManualReceiptReview(
        "image-missing", 3, "multi.jpg", [0.55, 0.05, 0.95, 0.9], "KRW", "manual-fixed",
    );
    assert.equal(item.clientId, "image-missing:3:manual-fixed");
    assert.equal(item.manuallyAdded, true);
    assert.equal(item.selected, true);
    assert.equal(item.reviewMode, "ASSISTED");
    assert.equal(validateReceiptForRegistration(item).registrable, false);
    assert.ok(validateReceiptForRegistration(item).blockingIssues.some(({ code }) => code === "PURCHASE_TOTAL_INVALID"));
    assert.throws(() => buildReceiptBatch([{ ...item, selected: true }]));
});


test("new receipt candidates default selected while invalid and unreviewed drafts still block the entire batch", () => {
    // 준비: 정상, 카테고리 누락, 금액 누락을 한 분석에 포함한다.
    const source = response([ready,
        { ...ready, receiptId: "missing-category", categoryName: null },
        { ...ready, receiptId: "missing-amount", originalAmount: null, status: "UNREADABLE" },
    ]);

    // 실행: 기본 선택은 검토 완료/등록 가능 여부와 별개다.
    const items = createReceiptReview(source);
    const assisted = createReceiptReview(response([ready]), "assisted", 1, "source.jpg", true);

    // 검증: 자동 선택으로 누락 필드를 승인하거나 정상 항목만 저장하지 않는다.
    assert.deepEqual(items.map(item => item.selected), [true, true, true]);
    assert.deepEqual(summarizeReceiptSelection(items), { selectedCount: 3, registrableCount: 1, blockedCount: 2 });
    assert.throws(() => buildReceiptBatch(items));
    assert.equal(assisted[0].selected, true);
    assert.equal(assisted[0].reviewedRevision, null);
    assert.throws(() => buildReceiptBatch(assisted));
    assert.equal(buildReceiptBatch(selectRegisterableReceiptReviews(items)).receipts.length, 1);
});


for (const field of ["originalAmount", "purchaseTotal"]) {
    test(`modal ${field} correction keeps a single payment and purchase facts consistent`, () => {
        // 준비: 목록/표의 인라인 입력과 모달이 같은 단일 카드 사실을 수정한다.
        const [item] = reviews({ ...ready, purchaseTotal: "12.34", bookAmount: "12.34",
            paymentBreakdown: [{ paymentType: "CREDIT_CARD", amount: "12.34", evidence: "VISA", duplicateGroup: null }] });

        // 실행: 소수점 입력 중간값과 최종값도 모두 보존한다.
        const partial = editReceiptReview(item, field, "15.");
        const changed = editReceiptReview(partial, field, "15.00");

        // 검증: 이전 결제금액으로 다시 환산될 수 없고 새 quote가 필요하다.
        assert.equal(partial[field], "15.");
        assert.equal(canRegisterReceipt(partial), false);
        assert.equal(changed.purchaseTotal, "15.00");
        assert.equal(changed.paymentBreakdown[0].amount, "15.00");
        assert.equal(Number(changed.originalAmount), 15);
        assert.equal(changed.amountCorrection.observedOriginalAmount, "12.34");
        assert.equal(changed.amountCorrection.observedPaymentAmount, "12.34");
        assert.equal(changed.paymentBreakdown[0].evidence, "VISA");
        assert.equal(changed.conversionStale, true);
        assert.equal(changed.conversion.convertedAmount, null);
        assert.throws(() => buildReceiptBatch([changed]));
    });
}


test("conversion preview from an old amount or currency cannot mark a new draft ready", () => {
    // 준비: 새 금액 draft와 이전 금액의 성공 응답을 섞는다.
    const [item] = reviews();
    const changed = editReceiptReview(item, "originalAmount", "15.00");
    const key = receiptSourceKey(changed);

    // 실행 / 검증: Decimal 값이 다르면 quote를 보류하고, 표현만 다른 15/15.00은 허용한다.
    const oldAmount = applyReceiptConversion(changed, key, item.conversion);
    assert.equal(oldAmount.conversionStale, true);
    assert.equal(oldAmount.conversion.convertedAmount, null);
    assert.equal(canRegisterReceipt(oldAmount), false);
    const wrongCurrency = applyReceiptConversion(changed, key, { ...item.conversion, originalAmount: "15", originalCurrencyCode: "EUR" });
    assert.equal(wrongCurrency.conversionStale, true);
    const correct = applyReceiptConversion(changed, key, { ...item.conversion, originalAmount: "15", originalCurrencyCode: "USD", convertedAmount: "2200" });
    assert.equal(correct.conversionStale, false);
    assert.equal(correct.originalAmount, "15.00");
    assert.equal(canRegisterReceipt(correct), true);
});

test("complex point receipts derive the book amount only from corrected facts", () => {
    // 준비: 포인트를 제외한 반영액은 하나의 숫자만으로 정정할 수 없다.
    const [item] = reviews({ ...ready, purchaseTotal: "7089", bookAmount: "5020", originalAmount: "5020",
        paymentBreakdown: [
            { paymentType: "LOYALTY_POINTS", amount: "2069", evidence: "ポイント", duplicateGroup: null },
            { paymentType: "CREDIT_CARD", amount: "5020", evidence: "カード", duplicateGroup: null },
        ] });

    // 실행 / 검증: 반영액 단독 변경은 거부하고 정정된 구매총액·카드에서 계산한다.
    assert.equal(editReceiptReview(item, "originalAmount", "9999"), item);
    const total = editReceiptReview(item, "purchaseTotal", "7189");
    assert.equal(total.reviewStatus, "NEEDS_REVIEW");
    const corrected = editReceiptPayment(total, 1, "5120");
    assert.equal(corrected.originalAmount, "5120");
    assert.equal(corrected.paymentBreakdown[0].amount, "2069");
    assert.equal(corrected.reviewStatus, "READY");
    assert.equal(corrected.conversionStale, true);
});


test("clearing cash details restores simple amount editing without discarding payment evidence", () => {
    // 준비: 거스름돈이 있는 현금 영수증에서 상세 사실을 명시적으로 비운다.
    const [item] = reviews({ ...ready, purchaseTotal: "12.34", bookAmount: "12.34",
        paymentBreakdown: [{ paymentType: "CASH", amount: "12.34", evidence: "現金", duplicateGroup: null }],
        cashTendered: "20", change: "7.66" });

    // 실행 / 검증: 빈 문자열은 새로운 현금 지급 근거가 아니다.
    const cleared = editReceiptReview(editReceiptReview(item, "cashTendered", ""), "change", "");
    assert.equal(classifyReceiptInlineAmountEdit(cleared).mode, "SINGLE_PAYMENT");
    const corrected = editReceiptReview(cleared, "originalAmount", "15.00");
    assert.equal(corrected.paymentBreakdown[0].amount, "15.00");
    assert.equal(corrected.paymentBreakdown[0].evidence, "現金");
});


test("unrecorded prepayment can be reclassified without changing genuine points policy", () => {
    // 준비: 4,000 선결제와 4,030 추가 결제를 사용자가 이번에 함께 기록한다.
    const [item] = reviews({ ...ready, purchaseTotal: "8030", originalAmount: "4030", bookAmount: "4030",
        reviewStatus: "READY", amountReason: "SETTLED_PAYMENT_EXCLUDING_LOYALTY_POINTS",
        paymentBreakdown: [
            { paymentType: "LOYALTY_POINTS", amount: "4000", evidence: "ポイント利用", duplicateGroup: null },
            { paymentType: "CREDIT_CARD", amount: "4030", evidence: "カード", duplicateGroup: null },
        ], warnings: ["PAYMENT_TOTAL_MISMATCH"] });

    // 실행: 포인트를 자동 제거하지 않고 명시적인 결제 유형 정정으로만 선결제를 포함한다.
    const corrected = editReceiptPayment(item, 0, "4000", "OTHER_PAID");

    // 검증: 금액/quote/검토 상태를 함께 갱신하며 원래 관측과 경고는 보존한다.
    assert.equal(corrected.originalAmount, "8030");
    assert.equal(corrected.purchaseTotal, "8030");
    assert.equal(corrected.paymentBreakdown[0].paymentType, "OTHER_PAID");
    assert.equal(corrected.paymentBreakdown[0].evidence, "ポイント利用");
    assert.equal(corrected.observedPaymentTypes[0], "LOYALTY_POINTS");
    assert.equal(corrected.conversionStale, true);
    assert.equal(corrected.conversion.conversionQuoteId, null);
    assert.equal(canRegisterReceipt(corrected), false);
    assert.deepEqual(corrected.analysisWarnings, item.analysisWarnings);
    assert.equal(corrected.reviewedRevision, null);
    const reverted = editReceiptPayment(corrected, 0, "4000", "LOYALTY_POINTS");
    assert.equal(reverted.originalAmount, "4030");
    assert.equal(reverted.observedPaymentTypes[0], "LOYALTY_POINTS");
});

test("payment mismatch points to editable payment facts and remains blocked", () => {
    // 준비 / 실행: 총액과 결제 배분이 일치하지 않는 후보.
    const [item] = reviews({ ...ready, reviewStatus: "NEEDS_REVIEW", amountReason: "PAYMENT_TOTAL_MISMATCH" });
    const validation = validateReceiptForRegistration(item);

    // 검증: 모호한 원금액 오류 대신 결제 내역으로 이동할 수 있다.
    assert.equal(validation.registrable, false);
    assert.ok(validation.blockingIssues.some(issue => issue.code === "PAYMENT_TOTAL_MISMATCH" && issue.field === "paymentBreakdown"));
});


test("detailed edits refresh a previous inline correction summary", () => {
    // 준비: 현금 금액을 인라인에서 정정한 뒤 상세 결제 사실을 다시 수정한다.
    const [item] = reviews({ ...ready, purchaseTotal: "12.34", paymentBreakdown: [
        { paymentType: "CASH", amount: "12.34", evidence: "現金", duplicateGroup: null },
    ] });
    const inline = applyReceiptInlineAmountCorrection(item, "15.00");

    // 실행 / 검증: 오류 중에는 이전 정정액을 표시하지 않고 해결 후 새 반영액을 표시한다.
    const tendered = editReceiptReview(inline, "cashTendered", "20");
    assert.equal(tendered.amountCorrection.correctedAmount, "");
    const changed = editReceiptReview(tendered, "change", "3");
    const settled = editReceiptPayment(editReceiptReview(changed, "purchaseTotal", "17"), 0, "17");
    assert.equal(settled.originalAmount, "17");
    assert.equal(settled.amountCorrection.correctedAmount, "17");
    assert.equal(settled.amountCorrection.observedOriginalAmount, "12.34");
});


test("registration rejects a stale quote even when the stale flag was missed", () => {
    // 준비: 화면은 1,540으로 수정됐지만 이전 1,652의 quote/환산액이 남은 상태.
    const [item] = reviews({ ...ready, originalAmount: "1652", detectedCurrencyCode: "JPY", convertedAmount: "1652", conversionStatus: "NOT_REQUIRED" });
    const changed = { ...item, originalAmount: "1540", purchaseTotal: "1540", conversionStale: false };

    // 검증: 성공 상태 문자열만으로 등록 가능이라고 표시하거나 batch를 만들지 않는다.
    assert.equal(canRegisterReceipt(changed), false);
    assert.ok(validateReceiptForRegistration(changed).blockingIssues.some(issue => issue.code === "QUOTE_STALE"));
    assert.throws(() => buildReceiptBatch([changed]));
});

test("conversion for an earlier requested date cannot authorize a new date", () => {
    // 준비 / 실행: 금액은 같아도 요청일이 다른 환산 응답은 현재 원본에 쓸 수 없다.
    const [item] = reviews();
    const changed = editReceiptReview(item, "transactionDate", "2026-09-16");
    const converted = applyReceiptConversion(changed, receiptSourceKey(changed), item.conversion);

    // 검증: 이전 quote를 제거하고 재계산 상태를 유지한다.
    assert.equal(converted.conversionStale, true);
    assert.equal(converted.conversion.conversionQuoteId, null);
    assert.equal(canRegisterReceipt(converted), false);
});
