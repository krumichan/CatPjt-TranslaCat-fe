import { expect, request, test } from "@playwright/test";
import { encode } from "next-auth/jwt";
import fs from "node:fs";
import path from "node:path";
import { assertReceiptRuntimePreflight, expectSameReceiptRuntime, type ReceiptRuntimeIdentity } from "../support/receipt-runtime-preflight";

const enabled = process.env.E2E_RECEIPT_CATEGORY_LIVE === "1";
const appUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiUrl = (process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8080/api/v1").replace(/\/+$/, "");

type AnalysisEnvelope = {
    body: {
        runtimeIdentity?: ReceiptRuntimeIdentity | null;
        receiptCount: number;
        receipts: Array<{
            receiptId: string;
            title: string | null;
            storeName: string | null;
            categoryName: string | null;
            categorySource: "EXISTING" | "DEFAULT" | "NEW" | "FALLBACK";
            categoryReason: string | null;
            originalAmount: string | null;
            originalCurrencyCode: string | null;
            paymentBreakdown: Array<{ paymentType: string; amount: string }>;
            conversionQuoteId: string | null;
        }>;
    };
};

test("RECEIPT-CATEGORY-LIVE browser AI category, modal, inline FX and final category creation", async ({ context, page }) => {
    test.skip(!enabled, "Set E2E_RECEIPT_CATEGORY_LIVE=1 for the isolated live category gate.");
    test.setTimeout(420_000);
    page.setDefaultTimeout(20_000);
    page.setDefaultNavigationTimeout(90_000);

    const email = process.env.E2E_RECEIPT_EMAIL;
    const password = process.env.E2E_RECEIPT_PASSWORD;
    const secret = process.env.NEXTAUTH_SECRET;
    const evidencePath = process.env.E2E_RECEIPT_EVIDENCE;
    const images = (process.env.E2E_RECEIPT_IMAGES ?? "").split(";").filter(Boolean);
    const expectedReceiptCounts = (process.env.E2E_RECEIPT_EXPECTED_COUNTS ?? "")
        .split(";")
        .filter(Boolean)
        .map(value => Number.parseInt(value, 10));
    const replayPaths = (process.env.E2E_RECEIPT_ANALYSIS_REPLAY ?? "").split(";").filter(Boolean);
    const existingAccountBookId = process.env.E2E_RECEIPT_ACCOUNT_BOOK_ID;
    if (!email || !password || !secret || !evidencePath || images.length < 1)
        throw new Error("Live receipt credentials, secret, evidence path and at least one image are required.");
    if (expectedReceiptCounts.length !== images.length
        || expectedReceiptCounts.some(value => !Number.isInteger(value) || value < 1))
        throw new Error("E2E_RECEIPT_EXPECTED_COUNTS must provide one positive frozen count per image.");
    for (const image of images) expect(fs.existsSync(image), image).toBe(true);

    const api = await request.newContext({ baseURL: `${apiUrl}/` });
    if (!existingAccountBookId) {
        const register = await api.post("auth/register", {
            data: { email, password, username: "receipt-category-live" },
        });
        expect([200, 409]).toContain(register.status());
    }
    const loginResponse = await api.post("auth/login", { data: { email, password } });
    expect(loginResponse.status()).toBe(200);
    const login = await loginResponse.json() as {
        body: { accessToken: string; accessTokenExpiresIn: number; role: "USER" | "ADMIN"; publicId: string };
    };
    const auth = { Authorization: `Bearer ${login.body.accessToken}` };
    let accountBookId = existingAccountBookId;
    if (!accountBookId) {
        const bookResponse = await api.post("account-books", {
            headers: auth,
            data: { name: `Receipt category ${Date.now()}`, category: "TEST", currencyCode: "USD" },
        });
        expect(bookResponse.status()).toBe(201);
        const book = await bookResponse.json() as { body: { id: number } };
        accountBookId = String(book.body.id);

        const seedResponse = await api.post(`account-books/${accountBookId}/transactions/register`, {
            headers: auth,
            data: {
                type: "EXPENSE", title: "Category seed", storeName: "Seed",
                category: "식비", amount: "1.00", transactionDate: "2026-09-22", memo: "isolated live seed",
            },
        });
        expect(seedResponse.ok()).toBe(true);
    }
    const runtimeIdentity = await assertReceiptRuntimePreflight(api, accountBookId, auth.Authorization);

    const now = Math.floor(Date.now() / 1000);
    const maxAge = Math.max(login.body.accessTokenExpiresIn, 300);
    const sessionToken = await encode({
        secret,
        maxAge,
        token: {
            name: "receipt-category-live", email, sub: login.body.publicId,
            accessToken: login.body.accessToken,
            accessTokenExpires: Date.now() + login.body.accessTokenExpiresIn * 1000,
            role: login.body.role, publicId: login.body.publicId,
            iat: now, exp: now + maxAge, jti: `receipt-category-live-${now}`,
        },
    });
    await context.addCookies([{
        name: "next-auth.session-token", value: sessionToken, url: appUrl,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + maxAge,
    }]);

    const analyses: AnalysisEnvelope[] = [];
    const batchPayloads: Array<Record<string, unknown>> = [];
    const browserErrors: string[] = [];
    let analysisRequests = 0;
    let conversionRequests = 0;
    page.on("request", requestEvent => {
        if (requestEvent.url().includes("/transactions/receipt-analysis")) analysisRequests += 1;
        if (requestEvent.url().includes("/transactions/receipt-conversion")) conversionRequests += 1;
        if (requestEvent.url().includes("/transactions/receipt-batch"))
            batchPayloads.push(requestEvent.postDataJSON() as Record<string, unknown>);
    });
    page.on("response", async response => {
        if (response.status() === 200 && response.url().includes("/transactions/receipt-analysis"))
            analyses.push(await response.json() as AnalysisEnvelope);
    });
    page.on("console", message => { if (message.type() === "error") browserErrors.push(message.text()); });
    page.on("pageerror", error => browserErrors.push(error.message));
    if (replayPaths.length) {
        expect(replayPaths).toHaveLength(images.length);
        const replayBodies = replayPaths.map(replayPath => JSON.parse(fs.readFileSync(replayPath, "utf8")) as AnalysisEnvelope);
        let replayIndex = 0;
        await page.route("**/transactions/receipt-analysis", route => route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(replayBodies[replayIndex++]),
        }));
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/ko/account-books/${accountBookId}`);
    await page.getByRole("button", { name: "거래 등록", exact: true }).click();
    await page.getByRole("button", { name: "영수증 분석", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles(images);
    await page.getByRole("button", { name: "영수증 분석", exact: true }).last().click();

    await expect.poll(() => analyses.length, { timeout: 240_000 }).toBe(images.length);
    if (!replayPaths.length) analyses.forEach(analysis => expectSameReceiptRuntime(runtimeIdentity, analysis.body.runtimeIdentity));
    analyses.forEach((analysis, index) => expect(analysis.body.receiptCount).toBe(expectedReceiptCounts[index]));
    const analyzedReceipts = analyses.flatMap(envelope => envelope.body.receipts);
    const rowCount = analyzedReceipts.length;
    expect(rowCount).toBe(expectedReceiptCounts.reduce((total, count) => total + count, 0));
    await expect(page.getByTestId("receipt-review-card")).toHaveCount(rowCount);
    await expect(page.getByRole("button", { name: new RegExp(`사진 ${images.length} · 영수증 ${rowCount}`) }))
        .toHaveAttribute("aria-expanded", "false");
    expect(analysisRequests).toBe(images.length);
    expect(analyzedReceipts.map(item => item.categorySource)
        .every(source => ["EXISTING", "DEFAULT", "NEW", "FALLBACK"].includes(source))).toBe(true);

    await page.getByTestId("receipt-review-list").getByRole("button", { name: "표", exact: true }).click();
    const rows = page.getByTestId("receipt-review-card");
    const singleCardReceipt = analyzedReceipts.find(item => item.storeName === "AEON"
        && item.paymentBreakdown.length === 1
        && item.paymentBreakdown[0].paymentType === "CREDIT_CARD");
    expect(singleCardReceipt, "The real AEON receipt must retain its observed single-card allocation.").toBeTruthy();
    const singleCardRowIndex = (await rows.allInnerTexts()).findIndex(text => text.includes("AEON"));
    expect(singleCardRowIndex).toBeGreaterThanOrEqual(0);
    const newRow = rows.nth(singleCardRowIndex);
    await expect(newRow).toBeVisible();
    const newCategory = `실사용분류-${Date.now()}`;
    const categorySelect = newRow.getByRole("combobox", { name: /카테고리 즉시 선택/ });

    const categoryCallBaseline = { analysisRequests, conversionRequests };

    const categoryBefore = await api.get(`account-books/${accountBookId}/categories`, { headers: auth });
    expect(categoryBefore.status()).toBe(200);
    const beforeEnvelope = await categoryBefore.json() as { body: Array<{ name: string }> };
    const categoryCountBefore = beforeEnvelope.body.filter(category => category.name === newCategory).length;
    if (replayPaths.length) expect(categoryCountBefore).toBeLessThanOrEqual(1);
    else expect(categoryCountBefore).toBe(0);
    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-category-before.png"), fullPage: true });

    await newRow.getByRole("button", { name: "확인·수정", exact: true }).click();
    let editor = page.getByTestId("receipt-review-editor");
    const modalCategory = editor.getByRole("combobox", { name: "카테고리", exact: true });
    await modalCategory.selectOption("__DIRECT_INPUT__");
    await editor.getByPlaceholder("새 카테고리명 입력", { exact: true }).fill("취소된분류");
    await page.keyboard.press("Escape");
    await expect(categorySelect.getByRole("option", { name: "취소된분류", exact: true })).toHaveCount(0);
    await expect(page.locator("#transaction-form-dialog")).not.toHaveAttribute("inert", "");

    await newRow.getByRole("button", { name: "확인·수정", exact: true }).click();
    editor = page.getByTestId("receipt-review-editor");
    await editor.getByRole("textbox", { name: "거래명", exact: true }).fill("실사용 영수증 1");
    await editor.getByRole("combobox", { name: "카테고리", exact: true }).selectOption("__DIRECT_INPUT__");
    await editor.getByPlaceholder("새 카테고리명 입력", { exact: true }).fill(newCategory);
    await editor.getByRole("textbox", { name: "메모", exact: true }).fill("live modal apply");
    await editor.getByRole("button", { name: "변경사항 적용", exact: true }).click();
    await expect(categorySelect).toHaveValue(newCategory);
    expect(analysisRequests).toBe(categoryCallBaseline.analysisRequests);
    expect(conversionRequests).toBe(categoryCallBaseline.conversionRequests);
    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-category-after.png"), fullPage: true });

    const simpleRow = newRow;
    const oldOriginalAmount = singleCardReceipt!.originalAmount!;
    const inlineCurrency = singleCardReceipt!.originalCurrencyCode!;
    const newOriginalAmount = String(Number(oldOriginalAmount) + 1);
    await simpleRow.getByRole("button", { name: new RegExp(`${oldOriginalAmount.replace(".", "\\.")} ${inlineCurrency}`) }).click();
    const inlineAmount = simpleRow.getByRole("textbox", { name: /원통화 반영액/ });
    await inlineAmount.fill(newOriginalAmount);
    await expect(page.getByTestId("receipt-submit-selected")).toBeDisabled();
    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-amount-editing.png"), fullPage: true });
    await inlineAmount.press("Enter");
    await expect(simpleRow).toContainText(`${newOriginalAmount} ${inlineCurrency}`, { timeout: 60_000 });
    expect(conversionRequests).toBe(categoryCallBaseline.conversionRequests + 1);
    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-amount-converted.png"), fullPage: true });
    const simpleCheckbox = simpleRow.getByRole("checkbox");
    await expect(simpleCheckbox).toBeEnabled();
    if (!(await simpleCheckbox.isChecked())) await simpleCheckbox.check();

    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-review.png"), fullPage: true });
    for (let index = 0; index < await rows.count(); index += 1) {
        const checkbox = rows.nth(index).getByRole("checkbox");
        if (index !== singleCardRowIndex && await checkbox.isChecked()) await checkbox.uncheck();
    }

    await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
    await page.getByTestId("receipt-submit-selected").click();
    await expect(page.getByTestId("receipt-review-list")).toHaveCount(0, { timeout: 60_000 });
    expect(batchPayloads).toHaveLength(1);

    const savedResponse = await api.post(`account-books/${accountBookId}/transactions`, {
        headers: auth,
        data: { year: 2026, month: 9, page: 0, size: 20, keyword: "실사용 영수증 1" },
    });
    expect(savedResponse.status()).toBe(200);
    const savedEnvelope = await savedResponse.json() as { body: { page: { content: Array<Record<string, unknown>> } } };
    const savedTransaction = savedEnvelope.body.page.content.find(item => item.title === "실사용 영수증 1");
    expect(savedTransaction).toBeTruthy();
    expect(savedTransaction?.originalAmount).toBe(`${newOriginalAmount}.00000000`);
    expect(savedTransaction?.originalCurrencyCode).toBe("JPY");
    expect(savedTransaction?.exchangeRateProvider).toBe("FRANKFURTER");

    await page.reload();
    const receiptCard = page.getByTestId(`transaction-card-${String(savedTransaction!.id)}`);
    await expect(receiptCard).toBeVisible();
    await receiptCard.getByRole("button", { name: "거래 상세보기", exact: true }).click();
    const receiptDetail = page.getByRole("dialog");
    await expect(receiptDetail).toContainText(new RegExp(`${newOriginalAmount}(?:\\.0+)? ${inlineCurrency}`));
    await expect(receiptDetail).toContainText("FRANKFURTER");
    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-saved-detail.png"), fullPage: true });
    await receiptDetail.getByRole("button", { name: "닫기", exact: true }).last().click();

    const categoryAfter = await api.get(`account-books/${accountBookId}/categories`, { headers: auth });
    const afterEnvelope = await categoryAfter.json() as { body: Array<{ name: string }> };
    expect(afterEnvelope.body.filter(category => category.name === newCategory)).toHaveLength(1);
    expect(afterEnvelope.body.filter(category => category.name === "취소된분류")).toHaveLength(0);

    const batch = batchPayloads[0].receipts as Array<Record<string, unknown>>;
    const editedCandidate = batch.find(candidate => candidate.title === "실사용 영수증 1")!;
    const editedPayments = editedCandidate.paymentBreakdown as Array<{ paymentType: string; amount: string }>;
    expect(editedPayments).toHaveLength(1);
    expect(editedPayments[0].paymentType).toBe("CREDIT_CARD");
    expect(Number(editedPayments[0].amount)).toBe(Number(newOriginalAmount));
    const concurrentCategory = `동시분류-${Date.now()}`;
    const validBatchCandidate = batch.find(candidate => typeof candidate.conversionQuoteId === "string"
        && candidate.conversionQuoteId.length > 0);
    expect(validBatchCandidate, "A converted candidate is required for the category concurrency probe.").toBeTruthy();
    const concurrentResponse = await api.post(`account-books/${accountBookId}/transactions/receipt-batch`, {
        headers: { ...auth, "Idempotency-Key": `category-concurrent-${Date.now()}` },
        data: {
            receipts: [0, 1].map(index => ({
                ...validBatchCandidate,
                receiptId: `concurrent-${index}-${Date.now()}`,
                sourceImageId: `concurrent-source-${index}-${Date.now()}`,
                categoryName: concurrentCategory,
                categorySource: "USER",
                categoryReason: "same batch category concurrency probe",
            })),
        },
    });
    expect(concurrentResponse.ok()).toBe(true);
    const categoryAfterConcurrent = await api.get(`account-books/${accountBookId}/categories`, { headers: auth });
    const concurrentEnvelope = await categoryAfterConcurrent.json() as { body: Array<{ name: string }> };
    expect(concurrentEnvelope.body.filter(category => category.name === concurrentCategory)).toHaveLength(1);

    const rollbackCategory = "롤백분류";
    const rollbackResponse = await api.post(`account-books/${accountBookId}/transactions/receipt-batch`, {
        headers: { ...auth, "Idempotency-Key": `category-rollback-${Date.now()}` },
        data: {
            receipts: [
                {
                    ...validBatchCandidate,
                    receiptId: `rollback-valid-${Date.now()}`,
                    sourceImageId: `rollback-source-valid-${Date.now()}`,
                    categoryName: rollbackCategory,
                    categorySource: "USER",
                    categoryReason: "atomic rollback probe",
                },
                {
                    ...validBatchCandidate,
                    receiptId: `rollback-invalid-${Date.now()}`,
                    sourceImageId: `rollback-source-invalid-${Date.now()}`,
                    conversionQuoteId: "0".repeat(64),
                    categoryName: rollbackCategory,
                    categorySource: "USER",
                    categoryReason: "atomic rollback probe",
                },
            ],
        },
    });
    expect(rollbackResponse.status()).toBeGreaterThanOrEqual(400);
    expect(rollbackResponse.status()).toBeLessThan(500);
    const categoryAfterRollback = await api.get(`account-books/${accountBookId}/categories`, { headers: auth });
    expect(categoryAfterRollback.status()).toBe(200);
    const afterRollbackEnvelope = await categoryAfterRollback.json() as { body: Array<{ name: string }> };
    expect(afterRollbackEnvelope.body.filter(category => category.name === rollbackCategory)).toHaveLength(0);

    const unrelatedChatSocketErrors = browserErrors.filter(message =>
        message.includes("ws://localhost:8080/ws/chat")
        || message.includes("Chat room list websocket error"));
    const receiptBrowserErrors = browserErrors.filter(message => !unrelatedChatSocketErrors.includes(message));
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify({
        accountBookId,
        runtimeIdentity,
        browserViewport: { width: 390, height: 844 },
        photoCount: images.length,
        receiptCount: rowCount,
        analysisRequestCount: analysisRequests,
        actualProviderCalls: replayPaths.length ? 0 : analysisRequests,
        categorySources: analyzedReceipts.map(item => item.categorySource),
        newCategory,
        aiProducedNewCategory: analyzedReceipts.some(item => item.categorySource === "NEW"),
        newCategoryReasonPresent: true,
        categoryCountBefore,
        categoryCountAfter: afterEnvelope.body.filter(category => category.name === newCategory).length,
        canceledCategoryCountAfter: afterEnvelope.body.filter(category => category.name === "취소된분류").length,
        inlineFx: { currency: inlineCurrency, before: oldOriginalAmount, after: newOriginalAmount,
            retainedPaymentType: editedPayments[0].paymentType, retainedPaymentAmount: editedPayments[0].amount,
            conversionRequests },
        analysisMode: replayPaths.length ? "CAPTURED_LIVE_RESPONSE_REPLAY" : "LIVE",
        batchSize: batch.length,
        duplicateNewCategoryCandidates: batch.filter(item => item.categoryName === newCategory).length,
        concurrentCategory: {
            name: concurrentCategory,
            status: concurrentResponse.status(),
            candidateCount: 2,
            categoryCountAfter: concurrentEnvelope.body.filter(category => category.name === concurrentCategory).length,
        },
        rollback: {
            status: rollbackResponse.status(),
            category: rollbackCategory,
            categoryCountAfter: afterRollbackEnvelope.body.filter(category => category.name === rollbackCategory).length,
        },
        browserErrors,
        unrelatedChatSocketErrors,
        receiptBrowserErrors,
    }, null, 2));
    expect(receiptBrowserErrors).toEqual([]);
    await api.dispose();
});
