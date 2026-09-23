import { expect, request, test } from "@playwright/test";
import { encode } from "next-auth/jwt";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { assertReceiptRuntimePreflight, expectSameReceiptRuntime, type ReceiptRuntimeIdentity } from "../support/receipt-runtime-preflight";

const enabled = process.env.E2E_RECEIPT_FINAL_GATE === "1";
const appUrl = process.env.E2E_BASE_URL ?? "http://localhost:3010";
const apiUrl = (process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8080/api/v1").replace(/\/+$/, "");

type ExpectedReceipt = {
    position: string;
    merchant: string;
    branch?: string;
    purchaseTotal: string;
    bookAmount: string;
    currency: string;
    date: string;
};

type AnalysisReceipt = {
    receiptId: string;
    title: string | null;
    storeName: string | null;
    branchName: string | null;
    purchaseTotal: string | null;
    bookAmount: string | null;
    originalAmount: string | null;
    originalCurrencyCode: string | null;
    transactionDate: string | null;
    categoryName: string | null;
    categorySource: string | null;
    status: string;
    warnings: string[];
};

type AnalysisEnvelope = {
    body: {
        receipts: AnalysisReceipt[];
        receiptCount: number;
        analysisTraceId?: string | null;
        runtimeIdentity?: ReceiptRuntimeIdentity | null;
    };
};

type TransactionRecord = {
    id: number;
    title: string;
    storeName: string | null;
    amount: string | number;
    transactionDate: string;
    originalAmount?: string | null;
    originalCurrencyCode?: string | null;
    purchaseTotal?: string | null;
    bookAmount?: string | null;
    exchangeRate?: string | null;
    exchangeRateProvider?: string | null;
    requestedRateDate?: string | null;
    effectiveRateDate?: string | null;
    conversionQuoteId?: string | null;
};

function sha256(value: Buffer) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

function decimal(value: string | null) {
    if (value === null || !/^[0-9]+(?:\.[0-9]+)?$/.test(value)) return null;
    const [whole, fraction = ""] = value.split(".");
    return `${whole.replace(/^0+(?=\d)/, "")}.${fraction.replace(/0+$/, "")}`;
}

function merchantKey(value: string | null) {
    return (value ?? "").normalize("NFKC").toLocaleLowerCase().replace(/[\s!.・]/g, "");
}

test("RECEIPT-FINAL-GATE actual browser preserves source pixels and recognizes the core photo", async ({ context, page }) => {
    test.skip(!enabled, "Set E2E_RECEIPT_FINAL_GATE=1 for the isolated live final gate.");
    test.setTimeout(420_000);
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(90_000);

    const email = process.env.E2E_RECEIPT_EMAIL;
    const password = process.env.E2E_RECEIPT_PASSWORD;
    const secret = process.env.NEXTAUTH_SECRET;
    const imagePath = process.env.E2E_RECEIPT_CORE_IMAGE;
    const manifestPath = process.env.E2E_RECEIPT_GROUND_TRUTH;
    const evidencePath = process.env.E2E_RECEIPT_EVIDENCE;
    const phase = process.env.E2E_RECEIPT_FINAL_GATE_PHASE ?? "recognition";
    const traceDirectory = process.env.E2E_RECEIPT_TRACE_DIR;
    if (!email || !password || !secret || !imagePath || !manifestPath || !evidencePath)
        throw new Error("Receipt final-gate credentials, secret, image, manifest and evidence path are required.");

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
        samples: Array<{ id: string; sha256: string; expectedReceiptCount: number; receipts: ExpectedReceipt[] }>;
    };
    const truth = manifest.samples.find(sample => sample.id === "core-user-multi-02");
    if (!truth) throw new Error("Frozen core truth is missing.");
    const sourceBytes = fs.readFileSync(imagePath);
    expect(sha256(sourceBytes)).toBe(truth.sha256);

    const api = await request.newContext({ baseURL: `${apiUrl}/` });
    let loginResponse = await api.post("auth/login", { data: { email, password } });
    if (loginResponse.status() !== 200) {
        const register = await api.post("auth/register", {
            data: { email, password, username: "receipt-final-gate" },
        });
        expect(register.status()).toBe(200);
        loginResponse = await api.post("auth/login", { data: { email, password } });
    }
    expect(loginResponse.status()).toBe(200);
    const login = await loginResponse.json() as {
        body: { accessToken: string; accessTokenExpiresIn: number; role: "USER" | "ADMIN"; publicId: string };
    };
    const auth = { Authorization: `Bearer ${login.body.accessToken}` };
    const bookResponse = await api.post("account-books", {
        headers: auth,
        data: { name: `Receipt final gate ${Date.now()}`, category: "TEST", currencyCode: "USD" },
    });
    expect(bookResponse.status()).toBe(201);
    const book = await bookResponse.json() as { body: { id: number } };
    const accountBookId = book.body.id;
    const seedResponse = await api.post(`account-books/${accountBookId}/transactions/register`, {
        headers: auth,
        data: {
            type: "EXPENSE", title: "Category seed", storeName: "Seed",
            category: "식비", amount: "1.00", transactionDate: "2026-09-22", memo: "isolated final gate",
        },
    });
    expect(seedResponse.ok()).toBe(true);
    const runtimeIdentity = await assertReceiptRuntimePreflight(api, accountBookId, auth.Authorization);

    const now = Math.floor(Date.now() / 1000);
    const maxAge = Math.max(login.body.accessTokenExpiresIn, 300);
    const sessionToken = await encode({
        secret,
        maxAge,
        token: {
            name: "receipt-final-gate", email, sub: login.body.publicId,
            accessToken: login.body.accessToken,
            accessTokenExpires: Date.now() + login.body.accessTokenExpiresIn * 1000,
            role: login.body.role, publicId: login.body.publicId,
            iat: now, exp: now + maxAge, jti: `receipt-final-gate-${now}`,
        },
    });
    await context.addCookies([{
        name: "next-auth.session-token", value: sessionToken, url: appUrl,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + maxAge,
    }]);

    await page.addInitScript(() => {
        const originalFetch = window.fetch.bind(window);
        const uploadRecords: Array<Record<string, unknown>> = [];
        Object.defineProperty(window, "__receiptFinalGateUploads", { value: uploadRecords });
        window.fetch = async (input, init) => {
            const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            if (url.includes("/transactions/receipt-analysis") && init?.body instanceof FormData) {
                const value = init.body.get("file");
                if (value instanceof File) {
                    try {
                        const bytes = await value.arrayBuffer();
                        const digest = await window.crypto.subtle.digest("SHA-256", bytes);
                        uploadRecords.push({
                            filename: value.name,
                            mime: value.type,
                            bytes: value.size,
                            sha256: Array.from(new Uint8Array(digest), part => part.toString(16).padStart(2, "0")).join(""),
                        });
                    } catch (error) {
                        uploadRecords.push({ observerError: error instanceof Error ? error.name : "UNKNOWN" });
                    }
                }
            }
            return originalFetch(input, init);
        };
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/ko/account-books/${accountBookId}`);
    await page.getByRole("button", { name: "거래 등록", exact: true }).click();
    await page.getByRole("button", { name: "영수증 분석", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles(imagePath);
    const responsePromise = page.waitForResponse(
        response => response.url().includes("/transactions/receipt-analysis")
            && response.request().method() === "POST",
        { timeout: 240_000 },
    );
    await page.getByRole("button", { name: "영수증 분석", exact: true }).last().click();
    const analysisResponse = await responsePromise;
    const envelope = await analysisResponse.json() as AnalysisEnvelope;
    expectSameReceiptRuntime(runtimeIdentity, envelope.body.runtimeIdentity);
    const uploads = await page.evaluate(() =>
        (window as typeof window & { __receiptFinalGateUploads?: Array<Record<string, unknown>> })
            .__receiptFinalGateUploads ?? [],
    );
    const transmitted = uploads[0];
    if (!transmitted) throw new Error("Browser upload observer did not capture the prepared file.");
    const byteIdenticalToSource = transmitted.sha256 === sha256(sourceBytes)
        && transmitted.bytes === sourceBytes.length;

    const actualByTruth = truth.receipts.map(expected => {
        const key = merchantKey(expected.merchant);
        const matches = envelope.body.receipts.filter(candidate =>
            merchantKey(candidate.storeName).includes(key) || merchantKey(candidate.title).includes(key),
        );
        const actual = matches.length === 1 ? matches[0] : null;
        const branch = expected.branch ? merchantKey(expected.branch) : null;
        return {
            position: expected.position,
            expected,
            matchCount: matches.length,
            receiptId: actual?.receiptId ?? null,
            actual,
            fieldMatches: {
                branch: actual !== null && (
                    branch === null
                    || merchantKey(actual.branchName).includes(branch)
                    || merchantKey(actual.title).includes(branch)
                ),
                purchaseTotal: actual !== null && decimal(actual.purchaseTotal) === decimal(expected.purchaseTotal),
                bookAmount: actual !== null && decimal(actual.bookAmount) === decimal(expected.bookAmount),
                currency: actual?.originalCurrencyCode === expected.currency,
                date: actual?.transactionDate === expected.date,
            },
        };
    });
    const traceId = envelope.body.analysisTraceId ?? null;
    let providerAttempts: Array<Record<string, unknown>> | null = null;
    if (traceId && traceDirectory) {
        const tracePath = path.join(traceDirectory, `${traceId}.json`);
        await expect.poll(() => fs.existsSync(tracePath), { timeout: 10_000 }).toBe(true);
        const trace = JSON.parse(fs.readFileSync(tracePath, "utf8")) as {
            providerAttempts?: Array<Record<string, unknown>>;
            stages?: { providerAttempts?: Array<Record<string, unknown>> };
        };
        providerAttempts = trace.providerAttempts ?? trace.stages?.providerAttempts ?? null;
    }
    const evidence: Record<string, unknown> = {
        classification: phase === "e2e" ? "LIVE_AUTO_E2E" : "LIVE_AUTO_RECOGNITION",
        actualProviderCalls: providerAttempts?.length ?? null,
        accountBookId,
        runtimeIdentity,
        source: { path: imagePath, sha256: sha256(sourceBytes), bytes: sourceBytes.length },
        browserTransmitted: {
            ...transmitted,
            byteIdenticalToSource,
        },
        httpStatus: analysisResponse.status(),
        analysisTraceId: traceId,
        providerAttempts,
        expectedReceiptCount: truth.expectedReceiptCount,
        actualReceiptCount: envelope.body.receiptCount,
        oneToOne: actualByTruth,
        rawResponse: envelope,
    };
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    await page.screenshot({ path: evidencePath.replace(/\.json$/, ".png"), fullPage: true });

    expect(byteIdenticalToSource).toBe(true);
    expect(envelope.body.receiptCount).toBe(truth.expectedReceiptCount);
    expect(envelope.body.receipts).toHaveLength(truth.expectedReceiptCount);
    expect(actualByTruth.every(item => item.matchCount === 1)).toBe(true);
    expect(actualByTruth.every(item => Object.values(item.fieldMatches).every(Boolean))).toBe(true);
    await expect(page.getByTestId("receipt-review-card")).toHaveCount(truth.expectedReceiptCount);

    if (phase === "e2e") {
        const rows = page.getByTestId("receipt-review-card");
        for (let index = 0; index < truth.expectedReceiptCount; index += 1) {
            const checkbox = rows.nth(index).getByRole("checkbox");
            await expect(checkbox).toBeEnabled();
            if (!(await checkbox.isChecked())) await checkbox.check();
        }
        await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();

        let batchRequestBody: { receipts: Array<Record<string, unknown>> } | null = null;
        let idempotencyKey: string | null = null;
        page.on("request", requestEvent => {
            if (!requestEvent.url().includes("/transactions/receipt-batch")) return;
            batchRequestBody = requestEvent.postDataJSON() as { receipts: Array<Record<string, unknown>> };
            idempotencyKey = requestEvent.headers()["idempotency-key"] ?? null;
        });
        const registrationResponsePromise = page.waitForResponse(response =>
            response.url().includes("/transactions/receipt-batch")
                && response.request().method() === "POST",
        );
        await page.getByTestId("receipt-submit-selected").click();
        const registrationResponse = await registrationResponsePromise;
        expect(registrationResponse.status()).toBe(200);
        const registrationEnvelope = await registrationResponse.json() as { body: TransactionRecord[] };
        await expect(page.getByTestId("receipt-review-list")).toHaveCount(0, { timeout: 60_000 });
        expect(batchRequestBody).not.toBeNull();
        expect(idempotencyKey).toBeTruthy();
        expect(batchRequestBody!.receipts).toHaveLength(truth.expectedReceiptCount);

        const batchMatches = truth.receipts.map(expected => {
            const candidates = batchRequestBody!.receipts.filter(candidate =>
                merchantKey(String(candidate.storeName ?? "")).includes(merchantKey(expected.merchant))
                || merchantKey(String(candidate.title ?? "")).includes(merchantKey(expected.merchant)),
            );
            const actual = candidates.length === 1 ? candidates[0] : null;
            const branch = expected.branch ? merchantKey(expected.branch) : null;
            return {
                merchant: expected.merchant,
                matchCount: candidates.length,
                coreFieldsUnedited: actual !== null
                    && (
                        branch === null
                        || merchantKey(String(actual.branchName ?? "")).includes(branch)
                        || merchantKey(String(actual.title ?? "")).includes(branch)
                    )
                    && decimal(String(actual.purchaseTotal ?? "")) === decimal(expected.purchaseTotal)
                    && decimal(String(actual.originalAmount ?? "")) === decimal(expected.bookAmount)
                    && actual.originalCurrencyCode === expected.currency
                    && actual.transactionDate === expected.date,
            };
        });
        expect(batchMatches.every(item => item.matchCount === 1 && item.coreFieldsUnedited)).toBe(true);

        const replayResponse = await api.post(`account-books/${accountBookId}/transactions/receipt-batch`, {
            headers: { ...auth, "Idempotency-Key": idempotencyKey! },
            data: batchRequestBody!,
        });
        expect(replayResponse.status()).toBe(200);
        const replayEnvelope = await replayResponse.json() as { body: TransactionRecord[] };
        expect(replayEnvelope.body.map(item => item.id).sort((a, b) => a - b))
            .toEqual(registrationEnvelope.body.map(item => item.id).sort((a, b) => a - b));

        const listResponse = await api.post(`account-books/${accountBookId}/transactions`, {
            headers: auth,
            data: { year: 2026, month: 9, page: 0, size: 100 },
        });
        expect(listResponse.status()).toBe(200);
        const listEnvelope = await listResponse.json() as {
            body: { page: { content: TransactionRecord[] } };
        };
        const savedIds = new Set(registrationEnvelope.body.map(item => item.id));
        const savedTransactions = listEnvelope.body.page.content.filter(item => savedIds.has(item.id));
        expect(savedTransactions).toHaveLength(truth.expectedReceiptCount);
        expect(savedTransactions.every(item => item.exchangeRateProvider === "FRANKFURTER"
            && typeof item.exchangeRate === "string"
            && typeof item.conversionQuoteId === "string")).toBe(true);

        await page.reload();
        const september = page.locator("select").filter({ has: page.locator('option[value="2026-09"]') });
        await september.selectOption("2026-09");
        const detailCard = page.getByTestId(`transaction-card-${registrationEnvelope.body[0].id}`);
        await expect(detailCard).toBeVisible();
        await detailCard.getByRole("button", { name: "거래 상세보기", exact: true }).click();
        const detail = page.getByRole("dialog");
        await expect(detail).toContainText("FRANKFURTER");
        await expect(detail).toContainText(/receipt-fx-v1/);
        await page.screenshot({ path: evidencePath.replace(/\.json$/, "-after-register.png"), fullPage: true });

        Object.assign(evidence, {
            registration: {
                status: registrationResponse.status(),
                batchMatches,
                idempotencyKeySha256: sha256(Buffer.from(idempotencyKey!)),
                firstTransactionIds: registrationEnvelope.body.map(item => item.id),
                replayStatus: replayResponse.status(),
                replayTransactionIds: replayEnvelope.body.map(item => item.id),
                savedTransactions,
            },
        });
        fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    }
    await api.dispose();
});
