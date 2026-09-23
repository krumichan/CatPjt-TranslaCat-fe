import { expect, request, test } from "@playwright/test";
import { encode } from "next-auth/jwt";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { assertReceiptRuntimePreflight, expectSameReceiptRuntime, type ReceiptRuntimeIdentity } from "../support/receipt-runtime-preflight";

const enabled = process.env.E2E_RECEIPT_FINAL_GATE_MULTI === "1";
const appUrl = process.env.E2E_BASE_URL ?? "http://localhost:3010";
const apiUrl = (process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8080/api/v1").replace(/\/+$/, "");

type TruthReceipt = {
    merchant: string; purchaseTotal: string; bookAmount: string; currency: string; date: string;
    branch?: string;
    paymentBreakdown?: Array<{ type: string; amount: string }>;
};
type TruthSample = { id: string; sha256: string; expectedReceiptCount: number; receipts: TruthReceipt[] };
type Receipt = {
    title: string | null; storeName: string | null; branchName: string | null;
    purchaseTotal: string | null; bookAmount: string | null;
    originalCurrencyCode: string | null; transactionDate: string | null;
    paymentBreakdown: Array<{ paymentType: string; amount: string }>;
};
type Analysis = { body: { receipts: Receipt[]; receiptCount: number; analysisTraceId?: string | null; runtimeIdentity?: ReceiptRuntimeIdentity | null } };
type Transaction = {
    id: number; title: string; storeName: string | null; amount: string; transactionDate: string;
    originalAmount: string | null; originalCurrencyCode: string | null; purchaseTotal: string | null;
    bookAmount: string | null; exchangeRate: string | null; exchangeRateProvider: string | null;
    conversionQuoteId: string | null;
};

function sha256(bytes: Buffer) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function key(value: string | null) { return (value ?? "").normalize("NFKC").toLocaleLowerCase().replace(/[\s!.・]/g, ""); }
function numeric(value: string | null) {
    if (value === null || !/^\d+(?:\.\d+)?$/.test(value)) return null;
    const [whole, fraction = ""] = value.split(".");
    return `${whole.replace(/^0+(?=\d)/, "")}.${fraction.replace(/0+$/, "")}`;
}
function multiplyHalfUp(left: string, right: string, places: number) {
    const parse = (value: string) => {
        const [whole, fraction = ""] = value.split(".");
        return { integer: BigInt(`${whole}${fraction}`), scale: fraction.length };
    };
    const a = parse(left); const b = parse(right); const product = a.integer * b.integer;
    const scale = a.scale + b.scale;
    if (scale <= places) return (product * BigInt(10) ** BigInt(places - scale)).toString();
    const divisor = BigInt(10) ** BigInt(scale - places);
    const rounded = product / divisor
        + ((product % divisor) * BigInt(2) >= divisor ? BigInt(1) : BigInt(0));
    return rounded.toString().padStart(places + 1, "0");
}
function cents(value: string) {
    const [whole, fraction = ""] = value.split(".");
    return `${whole}${fraction.padEnd(2, "0").slice(0, 2)}`.replace(/^0+(?=\d)/, "");
}

test("RECEIPT-FINAL-GATE multiple files keep source identity, Papasu net amount and overseas FX", async ({ context, page }) => {
    test.skip(!enabled, "Set E2E_RECEIPT_FINAL_GATE_MULTI=1 for the isolated live multi-file gate.");
    test.setTimeout(600_000);
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(90_000);

    const email = process.env.E2E_RECEIPT_EMAIL;
    const password = process.env.E2E_RECEIPT_PASSWORD;
    const secret = process.env.NEXTAUTH_SECRET;
    const manifestPath = process.env.E2E_RECEIPT_GROUND_TRUTH;
    const evidencePath = process.env.E2E_RECEIPT_EVIDENCE;
    const traceDirectory = process.env.E2E_RECEIPT_TRACE_DIR;
    const imagePaths = (process.env.E2E_RECEIPT_IMAGES ?? "").split(";").filter(Boolean);
    const sampleIds = (process.env.E2E_RECEIPT_SAMPLE_IDS ?? "").split(";").filter(Boolean);
    if (!email || !password || !secret || !manifestPath || !evidencePath || !traceDirectory
        || imagePaths.length < 2 || imagePaths.length !== sampleIds.length)
        throw new Error("Credentials, manifest, trace/evidence paths and aligned multi-file sample inputs are required.");

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { samples: TruthSample[] };
    const truths = sampleIds.map(id => {
        const sample = manifest.samples.find(candidate => candidate.id === id);
        if (!sample) throw new Error(`Frozen truth missing for ${id}.`);
        return sample;
    });
    const sourceEvidence = imagePaths.map((imagePath, index) => {
        const bytes = fs.readFileSync(imagePath);
        expect(sha256(bytes)).toBe(truths[index].sha256);
        return { id: truths[index].id, path: imagePath, sha256: sha256(bytes), bytes: bytes.length };
    });

    const api = await request.newContext({ baseURL: `${apiUrl}/` });
    const register = await api.post("auth/register", { data: { email, password, username: "receipt-final-multi" } });
    expect([200, 409]).toContain(register.status());
    const loginResponse = await api.post("auth/login", { data: { email, password } });
    expect(loginResponse.status()).toBe(200);
    const login = await loginResponse.json() as { body: { accessToken: string; accessTokenExpiresIn: number; role: "USER" | "ADMIN"; publicId: string } };
    const auth = { Authorization: `Bearer ${login.body.accessToken}` };
    const bookResponse = await api.post("account-books", { headers: auth, data: { name: `Receipt multi ${Date.now()}`, category: "TEST", currencyCode: "USD" } });
    expect(bookResponse.status()).toBe(201);
    const accountBookId = ((await bookResponse.json()) as { body: { id: number } }).body.id;
    expect((await api.post(`account-books/${accountBookId}/transactions/register`, { headers: auth, data: {
        type: "EXPENSE", title: "Category seed", storeName: "Seed", category: "식비",
        amount: "1.00", transactionDate: "2026-09-22", memo: "isolated multi-file gate",
    } })).ok()).toBe(true);
    const runtimeIdentity = await assertReceiptRuntimePreflight(api, accountBookId, auth.Authorization);

    const now = Math.floor(Date.now() / 1000); const maxAge = Math.max(login.body.accessTokenExpiresIn, 300);
    const sessionToken = await encode({ secret, maxAge, token: {
        name: "receipt-final-multi", email, sub: login.body.publicId, accessToken: login.body.accessToken,
        accessTokenExpires: Date.now() + login.body.accessTokenExpiresIn * 1000,
        role: login.body.role, publicId: login.body.publicId, iat: now, exp: now + maxAge, jti: `receipt-final-multi-${now}`,
    } });
    await context.addCookies([{ name: "next-auth.session-token", value: sessionToken, url: appUrl,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + maxAge }]);

    await page.addInitScript(() => {
        const originalFetch = window.fetch.bind(window); const uploads: Array<Record<string, unknown>> = [];
        Object.defineProperty(window, "__receiptFinalGateMultiUploads", { value: uploads });
        window.fetch = async (input, init) => {
            const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            if (url.includes("/transactions/receipt-analysis") && init?.body instanceof FormData) {
                const file = init.body.get("file");
                if (file instanceof File) {
                    const bytes = await file.arrayBuffer(); const digest = await window.crypto.subtle.digest("SHA-256", bytes);
                    uploads.push({ filename: file.name, bytes: file.size,
                        sha256: Array.from(new Uint8Array(digest), part => part.toString(16).padStart(2, "0")).join("") });
                }
            }
            return originalFetch(input, init);
        };
    });
    const analyses: Analysis[] = [];
    page.on("response", async response => {
        if (response.status() === 200 && response.url().includes("/transactions/receipt-analysis"))
            analyses.push(await response.json() as Analysis);
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/ko/account-books/${accountBookId}`);
    await page.getByRole("button", { name: "거래 등록", exact: true }).click();
    await page.getByRole("button", { name: "영수증 분석", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles(imagePaths);
    await page.getByRole("button", { name: "영수증 분석", exact: true }).last().click();
    await expect.poll(() => analyses.length, { timeout: 360_000 }).toBe(imagePaths.length);
    analyses.forEach(analysis => expectSameReceiptRuntime(runtimeIdentity, analysis.body.runtimeIdentity));
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    const responseReplayPaths = analyses.map((analysis, index) => {
        const replayPath = evidencePath.replace(/\.json$/, `-analysis-${index + 1}.json`);
        fs.writeFileSync(replayPath, JSON.stringify(analysis, null, 2));
        return replayPath;
    });
    const allReceipts = analyses.flatMap(item => item.body.receipts);
    const expectedTotal = truths.reduce((total, truth) => total + truth.expectedReceiptCount, 0);
    await expect(page.getByTestId("receipt-review-card")).toHaveCount(expectedTotal);
    expect(allReceipts).toHaveLength(expectedTotal);

    const matches = truths.flatMap(truth => truth.receipts.map(expected => {
        // The public Turkish receipt prints a legally suffixed merchant name whose
        // OTOM./OTO. abbreviation varies without changing the visible HANEDAN GRUP
        // identity. Amount, currency and date remain independent matching evidence.
        const merchantIdentity = truth.id === "public-turkish-1000" ? key("HANEDAN GRUP") : key(expected.merchant);
        const candidates = allReceipts.filter(actual => key(actual.storeName).includes(merchantIdentity)
            || key(actual.title).includes(merchantIdentity));
        const actual = candidates.length === 1 ? candidates[0] : null;
        const branch = expected.branch ? key(expected.branch) : null;
        return { sampleId: truth.id, expected, actual, matchCount: candidates.length,
            coreMatches: actual !== null
                && (branch === null || key(actual.branchName).includes(branch) || key(actual.title).includes(branch))
                && numeric(actual.purchaseTotal) === numeric(expected.purchaseTotal)
                && numeric(actual.bookAmount) === numeric(expected.bookAmount)
                && actual.originalCurrencyCode === expected.currency && actual.transactionDate === expected.date };
    }));
    expect(matches.every(match => match.matchCount === 1 && match.coreMatches)).toBe(true);
    const papasu = matches.find(match => match.sampleId === "user-papasu")!;
    expect(papasu.actual!.paymentBreakdown.some(item => item.paymentType === "LOYALTY_POINTS" && numeric(item.amount) === numeric("2069"))).toBe(true);
    expect(papasu.actual!.paymentBreakdown.some(item => item.paymentType === "CREDIT_CARD" && numeric(item.amount) === numeric("5020"))).toBe(true);

    const uploads = await page.evaluate(() => (window as typeof window & { __receiptFinalGateMultiUploads?: Array<Record<string, unknown>> }).__receiptFinalGateMultiUploads ?? []);
    expect(uploads).toHaveLength(imagePaths.length);
    for (const source of sourceEvidence) expect(uploads.some(upload => upload.sha256 === source.sha256 && upload.bytes === source.bytes)).toBe(true);
    const traceEvidence = analyses.map(analysis => {
        const traceId = analysis.body.analysisTraceId!; const tracePath = path.join(traceDirectory, `${traceId}.json`);
        expect(fs.existsSync(tracePath)).toBe(true);
        const trace = JSON.parse(fs.readFileSync(tracePath, "utf8")) as { providerCallCount: number; providerAttempts: Array<Record<string, unknown>> };
        return { traceId, providerCallCount: trace.providerCallCount, providerAttempts: trace.providerAttempts };
    });

    const rows = page.getByTestId("receipt-review-card");
    for (let index = 0; index < expectedTotal; index += 1) {
        const row = rows.nth(index); const checkbox = row.getByRole("checkbox"); const text = await row.innerText();
        const shouldSave = text.includes("ぱぱす") || text.toLocaleLowerCase().includes("hanedan");
        if (shouldSave && !(await checkbox.isChecked())) await checkbox.check();
        if (!shouldSave && await checkbox.isChecked()) await checkbox.uncheck();
    }
    await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
    let batch: { receipts: Array<Record<string, unknown>> } | null = null;
    page.on("request", requestEvent => {
        if (requestEvent.url().includes("/transactions/receipt-batch")) batch = requestEvent.postDataJSON() as { receipts: Array<Record<string, unknown>> };
    });
    const saveResponsePromise = page.waitForResponse(response => response.url().includes("/transactions/receipt-batch") && response.request().method() === "POST");
    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-review.png"), fullPage: true });
    await page.getByTestId("receipt-submit-selected").click();
    const saveResponse = await saveResponsePromise; expect(saveResponse.status()).toBe(200);
    const saved = ((await saveResponse.json()) as { body: Transaction[] }).body;
    expect(saved).toHaveLength(2); expect(batch!.receipts).toHaveLength(2);
    const papasuSaved = saved.find(item => key(item.storeName).includes(key("どらっぐ ぱぱす")))!;
    const turkishSaved = saved.find(item => key(item.storeName).includes(key("Hanedan")) || key(item.title).includes(key("Hanedan")))!;
    expect(numeric(papasuSaved.purchaseTotal)).toBe(numeric("7089")); expect(numeric(papasuSaved.originalAmount)).toBe(numeric("5020"));
    expect(turkishSaved.originalCurrencyCode).toBe("TRY"); expect(turkishSaved.exchangeRateProvider).toBe("FRANKFURTER");
    expect(cents(turkishSaved.amount)).toBe(multiplyHalfUp(turkishSaved.originalAmount!, turkishSaved.exchangeRate!, 2));

    const evidence = { classification: "LIVE_AUTO_E2E_MULTI_FILE", accountBookId, concurrencyLimit: 2, runtimeIdentity,
        sourceEvidence, uploads, responseReplayPaths, expectedTotal, actualTotal: allReceipts.length, matches, traceEvidence,
        actualProviderCalls: traceEvidence.reduce((total, item) => total + item.providerCallCount, 0),
        selectedBatchSize: batch!.receipts.length, saved, nonSelectedCoreSaved: saved.some(item => ["カラオケまねきねこ", "ROYAL", "AEON", "LAWSON"].some(name => key(item.storeName).includes(key(name)))),
        turkishIndependentConversion: { originalAmount: turkishSaved.originalAmount, rate: turkishSaved.exchangeRate,
            expectedMinorUnits: multiplyHalfUp(turkishSaved.originalAmount!, turkishSaved.exchangeRate!, 2), actualMinorUnits: cents(turkishSaved.amount) } };
    expect(evidence.nonSelectedCoreSaved).toBe(false);
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true }); fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    await api.dispose();
});
