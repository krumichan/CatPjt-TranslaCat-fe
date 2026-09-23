import { expect, request, test } from "@playwright/test";
import { encode } from "next-auth/jwt";
import fs from "node:fs";

const enabled = process.env.E2E_RECEIPT_RC === "1";
const appUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiUrl = (process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8080/api/v1").replace(/\/+$/, "");

test("RECEIPT-RC browser to AI, FX and database", async ({ context, page }) => {
    test.skip(!enabled, "Set E2E_RECEIPT_RC=1 for the isolated live receipt gate.");
    test.setTimeout(240_000);

    const email = process.env.E2E_RECEIPT_EMAIL;
    const password = process.env.E2E_RECEIPT_PASSWORD;
    const imagePath = process.env.E2E_RECEIPT_IMAGE;
    const secret = process.env.NEXTAUTH_SECRET;
    const evidencePath = process.env.E2E_RECEIPT_EVIDENCE;
    const replayResponsePath = process.env.E2E_RECEIPT_REPLAY_RESPONSE;
    if (!email || !password || !imagePath || !secret || !evidencePath) {
        throw new Error("Receipt RC credentials, image, NextAuth secret and evidence path are required.");
    }

    const api = await request.newContext({ baseURL: `${apiUrl}/` });
    if (process.env.E2E_RECEIPT_REGISTER === "1") {
        const registerResponse = await api.post("auth/register", {
            data: { email, password, username: "receipt-rc" },
        });
        expect(registerResponse.status()).toBe(200);
    }
    const loginResponse = await api.post("auth/login", { data: { email, password } });
    expect(loginResponse.status()).toBe(200);
    const login = await loginResponse.json() as {
        body: { accessToken: string; refreshToken: string; accessTokenExpiresIn: number; role: "USER" | "ADMIN"; publicId: string };
    };
    expect(login.body.accessToken).toBeTruthy();
    let accountBookId = process.env.E2E_RECEIPT_ACCOUNT_BOOK_ID ?? "1";
    if (process.env.E2E_RECEIPT_CREATE_BOOK === "1") {
        const bookResponse = await api.post("account-books", {
            headers: { Authorization: `Bearer ${login.body.accessToken}` },
            data: { name: "Receipt RC", category: "TEST", currencyCode: "USD" },
        });
        expect(bookResponse.status()).toBe(201);
        const book = await bookResponse.json() as { body: { id: number } };
        accountBookId = String(book.body.id);
    }
    if (replayResponsePath) {
        const captured = JSON.parse(fs.readFileSync(replayResponsePath, "utf8")) as {
            body: { receipts: Array<Record<string, unknown>> };
        };
        const receipt = captured.body.receipts[0];
        expect(receipt).toBeTruthy();
        const conversionResponse = await api.post(
            `account-books/${accountBookId}/transactions/receipt-conversion`,
            {
                headers: { Authorization: `Bearer ${login.body.accessToken}` },
                data: {
                    originalAmount: receipt.bookAmount,
                    originalCurrencyCode: receipt.originalCurrencyCode,
                    transactionDate: receipt.transactionDate,
                    purchaseTotal: receipt.purchaseTotal,
                    paymentBreakdown: receipt.paymentBreakdown,
                    cashTendered: receipt.cashTendered,
                    change: receipt.change,
                },
            },
        );
        expect(conversionResponse.status()).toBe(200);
        const conversion = await conversionResponse.json() as { body: Record<string, unknown> };
        Object.assign(receipt, conversion.body);
        await page.route("**/receipt-analysis", route => route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(captured),
        }));
    }

    const now = Math.floor(Date.now() / 1000);
    const maxAge = Math.max(login.body.accessTokenExpiresIn, 300);
    const sessionToken = await encode({
        secret,
        maxAge,
        token: {
            name: "receipt-rc",
            email,
            sub: login.body.publicId,
            accessToken: login.body.accessToken,
            accessTokenExpires: Date.now() + login.body.accessTokenExpiresIn * 1000,
            role: login.body.role,
            publicId: login.body.publicId,
            iat: now,
            exp: now + maxAge,
            jti: `receipt-rc-${now}`,
        },
    });
    await context.addCookies([{
        name: new URL(appUrl).protocol === "https:" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
        value: sessionToken,
        url: appUrl,
        httpOnly: true,
        secure: new URL(appUrl).protocol === "https:",
        sameSite: "Lax",
        expires: now + maxAge,
    }]);
    const sessionResponse = await page.request.get("/api/auth/session");
    expect(sessionResponse.status()).toBe(200);
    const session = await sessionResponse.json() as { accessToken?: string };
    expect(session.accessToken).toBeTruthy();

    const browserErrors: string[] = [];
    page.on("console", message => {
        if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", error => browserErrors.push(error.message));
    page.on("response", async response => {
        if (!response.url().includes("/transactions/receipt-analysis") || response.status() !== 200) return;
        try {
            const analysis = await response.json();
            fs.writeFileSync(evidencePath.replace(/\.json$/, "-analysis-response.json"), JSON.stringify(analysis, null, 2));
        } catch {
            // The browser assertions below still report an unreadable response.
        }
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/ko/account-books/${accountBookId}`);
    await expect(page.getByRole("button", { name: "거래 등록", exact: true })).toBeVisible();
    if (process.env.E2E_RECEIPT_REQUERY_ONLY === "1") {
        const month = page.locator("select").filter({ has: page.locator('option[value="2026-08"]') });
        await month.selectOption("2026-08");
        const transactions = page.getByTestId("account-book-transactions");
        await expect(transactions).toBeVisible();
        await expect(transactions).toContainText("どらっぐ ぱぱす 船堀店");
        await expect(transactions).toContainText("5020.00000000 JPY");
        await expect(transactions).toContainText("$31.43");
        await transactions.locator("details summary").click();
        await expect(transactions).toContainText("0.006260000000000000");
        await expect(transactions).toContainText("FRANKFURTER");
        await expect(transactions).toContainText("HALF_UP / 2 / receipt-fx-v1");
        if (process.env.E2E_RECEIPT_GRAPH_VERIFY === "1") {
            const storeChart = page
                .getByRole("heading", { name: "브랜드·가게별 지출", exact: true })
                .locator("xpath=ancestor::section[1]");
            await expect(storeChart).toContainText("どらっぐ ぱぱす");
            await expect(storeChart).toContainText("$43.77");
            await expect(storeChart).not.toContainText("船堀店");
            await expect(storeChart).not.toContainText("西葛西店");
        }
        await page.screenshot({ path: evidencePath.replace(/\.json$/, "-after-restart.png"), fullPage: true });
        const transactionResponse = await api.post(`account-books/${accountBookId}/transactions`, {
            headers: { Authorization: `Bearer ${login.body.accessToken}` },
            data: { year: 2026, month: 8, page: 0, size: 20, keyword: "ぱぱす" },
        });
        expect(transactionResponse.status()).toBe(200);
        const envelope = await transactionResponse.json() as { body: { page: { content: Array<Record<string, unknown>> } } };
        fs.writeFileSync(evidencePath.replace(/\.json$/, "-after-restart.json"), JSON.stringify({
            loginStatus: loginResponse.status(),
            transaction: envelope.body.page.content[0],
            browserErrors,
        }, null, 2));
        expect(browserErrors).toEqual([]);
        await api.dispose();
        return;
    }
    await page.getByRole("button", { name: "거래 등록", exact: true }).click();
    await page.getByRole("button", { name: "영수증 분석", exact: true }).click();
    if (process.env.E2E_RECEIPT_DRY_RUN === "1") {
        await api.dispose();
        return;
    }
    await page.locator('input[type="file"]').setInputFiles(imagePath);
    await expect(page.getByTestId("receipt-file-queue")).toContainText("대기");
    await page.getByRole("button", { name: "영수증 분석", exact: true }).last().click();

    const row = page.getByTestId("receipt-review-card");
    await expect(row).toHaveCount(1, { timeout: 180_000 });
    await expect(row).toContainText(/KakaoTalk_.*\.jpg · r1/);
    await row.getByRole("button", { name: "확인·수정", exact: true }).click();
    const editor = page.getByTestId("receipt-review-editor");
    await editor.locator("summary").click();
    await expect(editor.getByRole("textbox", { name: /^구매총액 \(포인트 사용 전\)/ })).toHaveValue("7089");
    await expect(editor.getByRole("textbox", { name: /^원본 통화 \(ISO 코드\)/ })).toHaveValue("JPY");
    await expect(editor.getByRole("textbox", { name: /^점포명/ })).toHaveValue(/ぱぱす/);
    await expect(editor.getByRole("textbox", { name: /^지점·위치/ })).toHaveValue(/船堀/);
    await expect(editor.getByRole("textbox", { name: /^거래명/ })).toHaveValue(/ぱぱす.*船堀/);
    await expect(editor).toContainText("5020 JPY");
    await expect(editor).toContainText("FRANKFURTER");
    const category = editor.getByRole("combobox", { name: "카테고리", exact: true });
    if (!(await category.inputValue()).trim()) {
        await category.selectOption("__DIRECT_INPUT__");
        await editor.getByPlaceholder("새 카테고리명 입력", { exact: true }).fill("쇼핑");
    }
    await editor.getByRole("button", { name: "변경사항 적용", exact: true }).click();
    if (!(await row.getByRole("checkbox").isChecked())) await row.getByRole("checkbox").check();
    await expect(row.getByRole("checkbox")).toBeChecked();

    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-review.png"), fullPage: true });
    await page.getByTestId("receipt-submit-selected").click();
    await expect(page.getByTestId("receipt-review-list")).toHaveCount(0, { timeout: 60_000 });

    const transactionResponse = await api.post(`account-books/${accountBookId}/transactions`, {
        headers: { Authorization: `Bearer ${login.body.accessToken}` },
        data: { year: 2026, month: 8, page: 0, size: 20, keyword: "ぱぱす" },
    });
    expect(transactionResponse.status()).toBe(200);
    const transactionEnvelope = await transactionResponse.json() as { body: { page: { content: Array<Record<string, unknown>> } } };
    const transaction = transactionEnvelope.body.page.content
        .filter(item => String(item.title).includes("ぱぱす"))
        .sort((left, right) => Number(right.id) - Number(left.id))[0];
    expect(transaction).toBeTruthy();

    const receiptMonth = page.locator("select").filter({ has: page.locator('option[value="2026-08"]') });
    await receiptMonth.selectOption("2026-08");
    const receiptCard = page.getByTestId(`transaction-card-${String(transaction.id)}`);
    await expect(receiptCard).toBeVisible();
    await receiptCard.getByRole("button", { name: "거래 상세보기", exact: true }).click();
    const receiptDetail = page.getByRole("dialog");
    await expect(receiptDetail).toContainText(/7089(?:\.0+)? JPY/);
    await expect(receiptDetail).toContainText("2069");
    await expect(receiptDetail).toContainText(/5020(?:\.0+)? JPY/);
    await expect(receiptDetail).toContainText("FRANKFURTER");
    await receiptDetail.getByRole("button", { name: "닫기", exact: true }).last().click();

    await page.getByRole("button", { name: "거래 등록", exact: true }).click();
    let transactionDialog = page.getByRole("dialog");
    await transactionDialog.getByRole("button", { name: "수입", exact: true }).click();
    await transactionDialog.getByRole("textbox", { name: /^거래명/ }).fill("UI income 20260922");
    const incomeSource = transactionDialog.getByRole("combobox", { name: /^수입처/ });
    await incomeSource.selectOption("__DIRECT_INPUT__");
    await transactionDialog.getByPlaceholder("새 점포명 입력", { exact: true }).fill("UI Income Source");
    const incomeCategory = transactionDialog.getByRole("combobox", { name: /^카테고리/ });
    await incomeCategory.selectOption("__DIRECT_INPUT__");
    await transactionDialog.getByPlaceholder("새 카테고리명 입력", { exact: true }).fill("Salary");
    await transactionDialog.getByRole("spinbutton", { name: /^금액/ }).fill("123.45");
    await transactionDialog.getByRole("textbox", { name: /^거래일/ }).fill("2026-09-22");
    await transactionDialog.getByRole("button", { name: "등록", exact: true }).click();
    await expect(transactionDialog).toHaveCount(0);

    const incomeResponse = await api.post(`account-books/${accountBookId}/transactions`, {
        headers: { Authorization: `Bearer ${login.body.accessToken}` },
        data: { year: 2026, month: 9, page: 0, size: 20, keyword: "UI income 20260922" },
    });
    expect(incomeResponse.status()).toBe(200);
    const incomeEnvelope = await incomeResponse.json() as { body: { page: { content: Array<Record<string, unknown>> } } };
    const incomeTransaction = incomeEnvelope.body.page.content[0];
    expect(incomeTransaction).toMatchObject({ type: "INCOME", storeName: "UI Income Source", category: "Salary" });
    const incomeMonth = page.locator("select").filter({ has: page.locator('option[value="2026-09"]') });
    await incomeMonth.selectOption("2026-09");
    const incomeCard = page.getByTestId(`transaction-card-${String(incomeTransaction.id)}`);
    await expect(incomeCard).toContainText("수입처: UI Income Source");
    await incomeCard.getByRole("button", { name: "거래 상세보기", exact: true }).click();
    const incomeDetail = page.getByRole("dialog");
    await expect(incomeDetail).toContainText("수입처");
    await expect(incomeDetail).toContainText("UI Income Source");
    await incomeDetail.getByRole("button", { name: "수정 화면으로 이동", exact: true }).click();
    transactionDialog = page.getByRole("dialog");
    await transactionDialog.getByRole("textbox", { name: /^거래명/ }).fill("UI income edited 20260922");
    await transactionDialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(transactionDialog).toHaveCount(0);

    const editedIncomeResponse = await api.post(`account-books/${accountBookId}/transactions`, {
        headers: { Authorization: `Bearer ${login.body.accessToken}` },
        data: { year: 2026, month: 9, page: 0, size: 20, keyword: "UI income edited 20260922" },
    });
    expect(editedIncomeResponse.status()).toBe(200);
    const editedIncomeEnvelope = await editedIncomeResponse.json() as { body: { page: { content: Array<Record<string, unknown>> } } };
    expect(editedIncomeEnvelope.body.page.content[0]).toMatchObject({
        id: incomeTransaction.id,
        type: "INCOME",
        storeName: "UI Income Source",
        category: "Salary",
        title: "UI income edited 20260922",
    });
    fs.writeFileSync(evidencePath, JSON.stringify({
        browserViewport: { width: 390, height: 844 },
        loginStatus: loginResponse.status(),
        receiptCount: 1,
        analysisMode: replayResponsePath ? "CAPTURED_LIVE_RESPONSE_REPLAY" : "LIVE",
        transaction,
        incomeTransaction: editedIncomeEnvelope.body.page.content[0],
        browserErrors,
    }, null, 2));
    expect(browserErrors).toEqual([]);
    await api.dispose();
});
