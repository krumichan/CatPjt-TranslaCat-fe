import assert from "node:assert/strict";
import test from "node:test";
import { getReceiptImageDimensions } from "../../src/utils/account-book/receiptImageDimensions.ts";
import { normalizeReceiptImageFileName } from "../../src/utils/account-book/receiptImageFileName.ts";
import { resizeReceiptImage } from "../../src/utils/account-book/resizeReceiptImage.ts";
import { getInitialAmount, getInitialCategoryValue, getInitialDirectCategoryName, getTodayText } from "../../src/utils/account-book/transactionForm.ts";

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

test("receipt upload preserves a high-resolution original when it already fits the byte limit", async () => {
    const originalImage = globalThis.Image;
    const originalUrl = globalThis.URL;
    const file = new File([new Uint8Array(3_190_415)], "four-receipts.jpg", {
        type: "image/jpeg",
        lastModified: 1,
    });
    class LoadedImage {
        naturalWidth = 3024;
        naturalHeight = 4032;
        set src(_value) { queueMicrotask(() => this.onload?.()); }
    }
    globalThis.Image = LoadedImage;
    globalThis.URL = { createObjectURL: () => "blob:test", revokeObjectURL: () => undefined };
    try {
        const prepared = await resizeReceiptImage(file);
        assert.equal(prepared, file);
        assert.equal(prepared.size, 3_190_415);
    } finally {
        globalThis.Image = originalImage;
        globalThis.URL = originalUrl;
    }
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

test("manual create keeps category unselected instead of silently choosing the first option", () => {
    assert.equal(getInitialCategoryValue("CREATE", null, ["Food", "Travel"]), "");
    assert.equal(getInitialDirectCategoryName("CREATE", null, ["Food", "Travel"]), "");
});

test("manual default date uses the user's local calendar day", () => {
    assert.equal(getTodayText(new Date(2026, 8, 19, 0, 1)), "2026-09-19");
});


for (const maxEdge of [2000, 1600]) {
    test(`receipt upload applies the pixel limit even below 5 MiB (${maxEdge})`, async () => {
        // 준비: 바이트 제한은 통과하지만 1,200만 화소인 휴대전화 사진.
        const previous = { Image: globalThis.Image, URL: globalThis.URL, document: globalThis.document };
        const file = new File([new Uint8Array(3_000_000)], "receipts.jpg", { type: "image/jpeg", lastModified: 1 });
        const encoded = [];
        const canvas = {
            width: 0, height: 0,
            getContext: () => ({ fillRect() {}, drawImage() {}, fillStyle: "" }),
            toBlob(callback, type, quality) {
                encoded.push({ width: this.width, height: this.height, type, quality });
                callback(new Blob([new Uint8Array(400_000)], { type }));
            },
        };
        class LoadedImage {
            naturalWidth = 3024;
            naturalHeight = 4032;
            set src(_value) { queueMicrotask(() => this.onload?.()); }
        }
        globalThis.Image = LoadedImage;
        globalThis.URL = { createObjectURL: () => "blob:test", revokeObjectURL() {} };
        globalThis.document = { createElement: () => canvas };
        try {
            // 실행: 앱이 실제 업로드 전에 호출하는 함수를 사용한다.
            const prepared = await resizeReceiptImage(file, { maxEdge, quality: 0.85 });

            // 검증: 원본 파일은 남기고 종횡비·JPEG 품질·출력 상한을 맞춘다.
            const edge = maxEdge;
            assert.deepEqual(encoded, [{ width: edge * 0.75, height: edge, type: "image/jpeg", quality: 0.85 }]);
            assert.notEqual(prepared, file);
            assert.equal(prepared.size, 400_000);
            assert.equal(file.size, 3_000_000);
        } finally {
            Object.assign(globalThis, previous);
        }
    });
}
