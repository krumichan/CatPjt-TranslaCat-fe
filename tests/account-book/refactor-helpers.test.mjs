import assert from "node:assert/strict";
import test from "node:test";
import {
    toTransactionCreateRequest,
    toTransactionUpdateRequest,
} from "../../src/utils/account-book/detail/transactionRequest.ts";
import {
    receiptFieldId,
    receiptRowClassName,
} from "../../src/utils/account-book/receiptReviewPresentation.ts";
import { normalizedReceiptPoint } from "../../src/utils/account-book/receiptRegion.ts";

const formValues = {
    type: "EXPENSE",
    title: "  スーパー 船堀店  ",
    storeName: " スーパー ",
    categoryName: " 食費 ",
    amount: "1234.005",
    transactionDate: "2026-09-19",
    memo: " レシート原文 ",
};

for (const [name, build] of [
    ["create", toTransactionCreateRequest],
    ["update", toTransactionUpdateRequest],
]) {
    test(`transaction ${name} mapping preserves decimal strings and source-language names`, () => {
        assert.deepEqual(build(formValues), {
            type: "EXPENSE",
            title: "スーパー 船堀店",
            storeName: "スーパー",
            category: "食費",
            amount: "1234.005",
            transactionDate: "2026-09-19",
            memo: "レシート原文",
        });
        assert.equal(formValues.title, "  スーパー 船堀店  ");
    });

    test(`transaction ${name} mapping handles income sources and nullable optional fields`, () => {
        assert.deepEqual(build({
            ...formValues,
            type: "INCOME",
            storeName: "  ",
            memo: undefined,
        }), {
            type: "INCOME",
            title: "スーパー 船堀店",
            storeName: null,
            category: "食費",
            amount: "1234.005",
            transactionDate: "2026-09-19",
            memo: null,
        });
    });
}

test("receipt field ids keep existing focus/error associations", () => {
    assert.equal(receiptFieldId("image-1:2:receipt-3", "categoryName"),
        "receipt-image-1:2:receipt-3-categoryName");
    assert.equal(receiptFieldId("image-1:2:receipt-3", "conversion"),
        "receipt-image-1:2:receipt-3-conversion");
});

for (const [state, expected] of [
    ["PENDING", "bg-amber-500/[0.08] dark:bg-amber-300/[0.09]"],
    ["READY", "bg-emerald-500/[0.07] dark:bg-emerald-300/[0.08]"],
    ["NEEDS_REVIEW", "bg-red-500/[0.07] dark:bg-red-400/[0.09]"],
]) {
    test(`receipt ${state} background preserves the light/dark styles`, () => {
        assert.equal(receiptRowClassName(state), expected);
    });
}

test("region coordinates are relative to the displayed image box", () => {
    const rect = { left: 10, top: 20, width: 200, height: 400 };
    assert.deepEqual(normalizedReceiptPoint(rect, 110, 220), { x: 0.5, y: 0.5 });
    assert.deepEqual(normalizedReceiptPoint(rect, 10, 20), { x: 0, y: 0 });
});

test("region coordinates keep the existing clamp at the image boundary", () => {
    const rect = { left: 10, top: 20, width: 200, height: 400 };
    assert.deepEqual(normalizedReceiptPoint(rect, -50, 900), { x: 0, y: 1 });
    assert.deepEqual(normalizedReceiptPoint(rect, 900, -50), { x: 1, y: 0 });
});
