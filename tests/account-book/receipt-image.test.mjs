import assert from "node:assert/strict";
import test from "node:test";
import { getReceiptImageDimensions } from "../../src/utils/account-book/receiptImageDimensions.ts";
import { normalizeReceiptImageFileName } from "../../src/utils/account-book/receiptImageFileName.ts";
import { getInitialAmount, getInitialCategoryValue, getInitialDirectCategoryName, getTodayText } from "../../src/components/account-book/detail/modal/transaction-form/utils.ts";

test("receipt resizing bounds landscape, portrait and square longest edges while preserving aspect", () => {
    assert.deepEqual(getReceiptImageDimensions(6000, 4000), { width: 2400, height: 1600 });
    assert.deepEqual(getReceiptImageDimensions(4000, 6000), { width: 1600, height: 2400 });
    assert.deepEqual(getReceiptImageDimensions(8000, 8000), { width: 2400, height: 2400 });
    assert.deepEqual(getReceiptImageDimensions(1400, 18000), { width: 187, height: 2400 });
});

test("receipt resizing keeps small originals and never upscales", () => {
    assert.deepEqual(getReceiptImageDimensions(1200, 800), { width: 1200, height: 800 });
    assert.deepEqual(getReceiptImageDimensions(2400, 1600), { width: 2400, height: 1600 });
    assert.deepEqual(getReceiptImageDimensions(1, 10000), { width: 1, height: 2400 });
});

test("invalid decoded image dimensions are rejected before canvas allocation", () => {
    for (const value of [0, -1, NaN, Infinity]) {
        assert.throws(() => getReceiptImageDimensions(value, 1200));
        assert.throws(() => getReceiptImageDimensions(1200, value));
        assert.throws(() => getReceiptImageDimensions(1200, 1200, value));
    }
});

test("preserved receipt images have a MIME-compatible suffix even for jfif or extensionless uploads", () => {
    assert.equal(normalizeReceiptImageFileName("receipt.jfif", "image/jpeg"), "receipt.jpg");
    assert.equal(normalizeReceiptImageFileName("receipt", "image/jpeg"), "receipt.jpg");
    assert.equal(normalizeReceiptImageFileName("scan.jpeg", "image/jpeg"), "scan.jpeg");
    assert.equal(normalizeReceiptImageFileName("영수증.JPG", "image/jpeg"), "영수증.JPG");
    assert.equal(normalizeReceiptImageFileName("scan.jpg", "image/png"), "scan.png");
    assert.equal(normalizeReceiptImageFileName("scan", "image/webp"), "scan.webp");
});

test("manual transaction edits retain exact stored decimal strings and direct categories", () => {
    const transaction = { amount: "9007199254740993.125", category: "New category" };
    assert.equal(getInitialAmount("EDIT", transaction), "9007199254740993.125");
    assert.equal(getInitialCategoryValue("EDIT", transaction, []), "__DIRECT_INPUT__");
    assert.equal(getInitialDirectCategoryName("EDIT", transaction, []), "New category");
    assert.equal(getInitialCategoryValue("EDIT", transaction, ["New category"]), "New category");
});

test("manual default date uses the user's local calendar day", () => {
    assert.equal(getTodayText(new Date(2026, 8, 19, 0, 1)), "2026-09-19");
});
