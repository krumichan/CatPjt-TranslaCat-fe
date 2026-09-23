import { expect, request, test, type Locator, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
    assertReceiptRuntimePreflight,
    expectSameReceiptRuntime,
    type ReceiptRuntimeIdentity,
} from "../support/receipt-runtime-preflight";

const enabled = process.env.E2E_RECEIPT_VISION_PARALLEL === "1";
const appUrl = process.env.E2E_BASE_URL ?? "http://localhost:3010";
const apiUrl = (process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8080/api/v1").replace(/\/+$/, "");

type TruthReceipt = {
    merchant: string;
    branch?: string;
    purchaseTotal: string;
    bookAmount: string;
    currency: string;
    date: string;
};
type TruthSample = {
    id: string;
    sha256: string;
    expectedReceiptCount: number;
    receipts: TruthReceipt[];
};
type Receipt = {
    receiptId: string;
    title: string | null;
    storeName: string | null;
    branchName: string | null;
    purchaseTotal: string | null;
    bookAmount: string | null;
    originalAmount: string | null;
    originalCurrencyCode: string | null;
    transactionDate: string | null;
    status: string;
    warnings: string[];
};
type Analysis = {
    body: {
        receipts: Receipt[];
        receiptCount: number;
        analysisTraceId?: string | null;
        runtimeIdentity?: ReceiptRuntimeIdentity | null;
    };
};
type Transaction = {
    id: number;
    title: string;
    storeName: string | null;
    amount: string;
    transactionDate: string;
    originalAmount: string | null;
    originalCurrencyCode: string | null;
    purchaseTotal: string | null;
    exchangeRate: string | null;
    exchangeRateProvider: string | null;
};
type BrowserTiming = {
    filename: string;
    fetchStartMs: number;
    fetchEndMs: number;
    status: number;
};

function sha256(bytes: Buffer) {
    return crypto.createHash("sha256").update(bytes).digest("hex");
}

function key(value: string | null) {
    return (value ?? "").normalize("NFKC").toLocaleLowerCase().replace(/[\s!.・]/g, "");
}

function decimal(value: string | null) {
    if (value === null || !/^\d+(?:\.\d+)?$/.test(value)) return null;
    const [whole, fraction = ""] = value.split(".");
    return `${whole.replace(/^0+(?=\d)/, "")}.${fraction.replace(/0+$/, "")}`;
}

async function reviewSource(
    page: Page,
    rows: Locator,
    sourceFile: string,
    truth: TruthReceipt,
    overrides: { bookAmount?: string; categoryLabel?: string } = {},
) {
    const row = rows.filter({ hasText: sourceFile }).first();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "확인·수정", exact: true }).click();
    const editor = page.getByTestId("receipt-review-editor");
    await expect(editor.getByTestId("receipt-source-preview")).toBeVisible();
    await editor.getByRole("textbox", { name: "거래명", exact: true })
        .fill(`${truth.merchant}${truth.branch ? ` ${truth.branch}` : ""}`);
    await editor.getByRole("textbox", { name: "점포명", exact: true }).fill(truth.merchant);
    const category = editor.getByRole("combobox", { name: "카테고리", exact: true });
    await category.selectOption({ label: overrides.categoryLabel ?? "식비" });
    await editor.getByRole("textbox", { name: "가계부 반영 원금액", exact: true })
        .fill(overrides.bookAmount ?? truth.bookAmount);
    await editor.locator('input[type="date"]').fill(truth.date);
    await editor.getByText("영수증 결제·환율 세부 정보", { exact: true }).click();
    if (truth.branch) {
        await editor.getByRole("textbox", { name: "지점·위치", exact: true }).fill(truth.branch);
    }
    const cashTendered = editor.getByRole("textbox", { name: "현금 지급액", exact: true });
    const change = editor.getByRole("textbox", { name: "거스름돈", exact: true });
    if (await cashTendered.count() > 0
        && decimal(await cashTendered.inputValue()) === decimal(truth.bookAmount)
        && await change.inputValue() === "") {
        // A cash allocation equal to the tendered amount, with no observed change,
        // duplicates the same payment fact. Keep the source-linked cash allocation.
        await cashTendered.fill("");
    }
    const recalculate = editor.getByRole("button", { name: "환산 금액 다시 확인", exact: true });
    if (await recalculate.isEnabled()) {
        const conversion = page.waitForResponse(response =>
            response.url().includes("/transactions/receipt-conversion")
            && response.request().method() === "POST",
        );
        await recalculate.click();
        expect((await conversion).status()).toBe(200);
    }
    await editor.getByRole("button", { name: "현재 원본과 입력값 확인 완료", exact: true }).click();
    await editor.getByRole("button", { name: "변경사항 적용", exact: true }).click();
    const corrected = rows.filter({ hasText: truth.merchant }).filter({ hasText: sourceFile }).first();
    await expect(corrected).toBeVisible();
    const checkbox = corrected.getByRole("checkbox");
    await expect(checkbox).toBeEnabled();
    if (!(await checkbox.isChecked())) await checkbox.check();
}

test("RECEIPT-VISION-PARALLEL A/B/C performance and review-assisted live registration", async ({ context, page }) => {
    test.skip(!enabled, "Set E2E_RECEIPT_VISION_PARALLEL=1 for the isolated live gate.");
    test.setTimeout(900_000);
    page.setDefaultTimeout(35_000);
    page.setDefaultNavigationTimeout(90_000);

    const email = process.env.E2E_RECEIPT_EMAIL;
    const password = process.env.E2E_RECEIPT_PASSWORD;
    const secret = process.env.NEXTAUTH_SECRET;
    const manifestPath = process.env.E2E_RECEIPT_GROUND_TRUTH;
    const evidencePath = process.env.E2E_RECEIPT_EVIDENCE;
    const traceDirectory = process.env.E2E_RECEIPT_TRACE_DIR;
    const cOnly = process.env.E2E_RECEIPT_C_ONLY === "1";
    const turkeyPath = process.env.E2E_RECEIPT_TURKEY_IMAGE;
    const papasuPath = process.env.E2E_RECEIPT_PAPASU_IMAGE;
    const corePath = process.env.E2E_RECEIPT_CORE_IMAGE;
    if (!email || !password || !secret || !manifestPath || !evidencePath || !traceDirectory
        || !turkeyPath || !papasuPath || !corePath) {
        throw new Error("Credentials, frozen truth, evidence, trace and A/B/C files are required.");
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { samples: TruthSample[] };
    const truth = (id: string) => {
        const sample = manifest.samples.find(candidate => candidate.id === id);
        if (!sample) throw new Error(`Frozen truth missing for ${id}.`);
        return sample;
    };
    const turkey = truth("public-turkish-1000");
    const papasu = truth("user-papasu");
    const core = truth("core-user-multi-02");
    const sourceFiles = [
        [turkeyPath, turkey], [papasuPath, papasu], [corePath, core],
    ] as const;
    for (const [file, sample] of sourceFiles) {
        expect(sha256(fs.readFileSync(file))).toBe(sample.sha256);
    }

    const api = await request.newContext({ baseURL: `${apiUrl}/` });
    const register = await api.post("auth/register", {
        data: { email, password, username: "receipt-vision-parallel" },
    });
    expect([200, 409]).toContain(register.status());
    const loginResponse = await api.post("auth/login", { data: { email, password } });
    expect(loginResponse.status()).toBe(200);
    const login = await loginResponse.json() as {
        body: {
            accessToken: string;
            accessTokenExpiresIn: number;
            role: "USER" | "ADMIN";
            publicId: string;
        };
    };
    const auth = { Authorization: `Bearer ${login.body.accessToken}` };
    const bookResponse = await api.post("account-books", {
        headers: auth,
        data: { name: `Vision parallel ${Date.now()}`, category: "TEST", currencyCode: "USD" },
    });
    expect(bookResponse.status()).toBe(201);
    const accountBookId = ((await bookResponse.json()) as { body: { id: number } }).body.id;
    expect((await api.post(`account-books/${accountBookId}/transactions/register`, {
        headers: auth,
        data: {
            type: "EXPENSE", title: "Category seed", storeName: "Seed", category: "식비",
            amount: "1.00", transactionDate: "2026-09-22", memo: "vision parallel gate",
        },
    })).ok()).toBe(true);
    const runtimeBefore = await assertReceiptRuntimePreflight(api, accountBookId, auth.Authorization);
    const hasPriorCheckpoint = (["A", "B", "C"] as const).some(name =>
        fs.existsSync(evidencePath.replace(/\.json$/, `-${name}-checkpoint.json`)),
    );
    if (!hasPriorCheckpoint) expect(runtimeBefore.providerCallCount).toBe(0);

    const now = Math.floor(Date.now() / 1000);
    const maxAge = Math.max(login.body.accessTokenExpiresIn, 300);
    const sessionToken = await encode({
        secret,
        maxAge,
        token: {
            name: "receipt-vision-parallel", email, sub: login.body.publicId,
            accessToken: login.body.accessToken,
            accessTokenExpires: Date.now() + login.body.accessTokenExpiresIn * 1000,
            role: login.body.role, publicId: login.body.publicId,
            iat: now, exp: now + maxAge, jti: `receipt-vision-parallel-${now}`,
        },
    });
    await context.addCookies([{
        name: "next-auth.session-token", value: sessionToken, url: appUrl,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + maxAge,
    }]);
    await page.addInitScript(() => {
        const originalFetch = window.fetch.bind(window);
        const timings: BrowserTiming[] = [];
        Object.defineProperty(window, "__receiptVisionTimings", { value: timings });
        window.fetch = async (input, init) => {
            const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            if (!url.includes("/transactions/receipt-analysis") || !(init?.body instanceof FormData)) {
                return originalFetch(input, init);
            }
            const file = init.body.get("file");
            const filename = file instanceof File ? file.name : "unknown";
            const fetchStartMs = performance.now();
            const response = await originalFetch(input, init);
            timings.push({ filename, fetchStartMs, fetchEndMs: performance.now(), status: response.status });
            return response;
        };
    });

    const runs: Array<Record<string, unknown>> = [];
    const latestAnalyses: Analysis[] = [];
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/ko/account-books/${accountBookId}`);

    const analyze = async (name: "A" | "B" | "C", files: string[], expectedResponses: number) => {
        latestAnalyses.length = 0;
        const responseListener = async (response: import("@playwright/test").Response) => {
            if (response.status() === 200 && response.url().includes("/transactions/receipt-analysis")) {
                latestAnalyses.push(await response.json() as Analysis);
            }
        };
        page.on("response", responseListener);
        await page.getByRole("button", { name: "거래 등록", exact: true }).click();
        await page.getByRole("button", { name: "영수증 분석", exact: true }).click();
        await page.locator('input[type="file"]').setInputFiles(files);
        const startedMs = await page.evaluate(() => performance.now());
        await page.getByRole("button", { name: "영수증 분석", exact: true }).last().click();
        await expect.poll(() => latestAnalyses.length, { timeout: 120_000 }).toBe(expectedResponses);
        const expectedCandidates = latestAnalyses.reduce((sum, item) => sum + item.body.receiptCount, 0);
        await expect(page.getByTestId("receipt-review-card")).toHaveCount(expectedCandidates);
        const displayedMs = await page.evaluate(() => performance.now());
        const timings = await page.evaluate(() =>
            (window as typeof window & { __receiptVisionTimings?: BrowserTiming[] })
                .__receiptVisionTimings ?? [],
        );
        const currentTimings = timings.slice(-expectedResponses);
        const traces = latestAnalyses.map(analysis => {
            expectSameReceiptRuntime(runtimeBefore, analysis.body.runtimeIdentity);
            const traceId = analysis.body.analysisTraceId!;
            const tracePath = path.join(traceDirectory, `${traceId}.json`);
            expect(fs.existsSync(tracePath)).toBe(true);
            return JSON.parse(fs.readFileSync(tracePath, "utf8")) as Record<string, unknown>;
        });
        runs.push({
            name, files, startedMs, displayedMs,
            totalMs: displayedMs - startedMs,
            firstResultMs: Math.min(...currentTimings.map(item => item.fetchEndMs)) - startedMs,
            browserTimings: currentTimings,
            analyses: structuredClone(latestAnalyses),
            traces,
        });
        fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
        fs.writeFileSync(
            evidencePath.replace(/\.json$/, `-${name}-checkpoint.json`),
            JSON.stringify(runs.at(-1), null, 2),
        );
        await page.screenshot({ path: evidencePath.replace(/\.json$/, `-${name}.png`), fullPage: true });
        page.off("response", responseListener);
    };

    const runOrResume = async (name: "A" | "B", files: string[], expectedResponses: number) => {
        const checkpoint = evidencePath.replace(/\.json$/, `-${name}-checkpoint.json`);
        if (fs.existsSync(checkpoint)) {
            runs.push({
                ...(JSON.parse(fs.readFileSync(checkpoint, "utf8")) as Record<string, unknown>),
                resumedFromCheckpoint: true,
            });
            return;
        }
        await analyze(name, files, expectedResponses);
        await page.getByRole("dialog").getByRole("button", { name: "취소", exact: true }).click();
    };

    if (!cOnly) {
        await runOrResume("A", [turkeyPath], 1);
        await runOrResume("B", [corePath], 1);
    }
    const cCheckpoint = evidencePath.replace(/\.json$/, "-C-checkpoint.json");
    if (fs.existsSync(cCheckpoint)) {
        const checkpoint = JSON.parse(fs.readFileSync(cCheckpoint, "utf8")) as {
            analyses: Analysis[];
            browserTimings: BrowserTiming[];
            [key: string]: unknown;
        };
        runs.push({ ...checkpoint, resumedFromCheckpoint: true });
        const byFilename = new Map(checkpoint.browserTimings.map((timing, index) => [
            timing.filename,
            checkpoint.analyses[index],
        ]));
        let fallbackIndex = 0;
        await page.route("**/transactions/receipt-analysis", async route => {
            const payload = route.request().postDataBuffer()?.toString("latin1") ?? "";
            const matched = [...byFilename.entries()].find(([filename]) => payload.includes(filename))?.[1]
                ?? checkpoint.analyses[fallbackIndex++];
            await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(matched) });
        });
        await page.getByRole("button", { name: "거래 등록", exact: true }).click();
        await page.getByRole("button", { name: "영수증 분석", exact: true }).click();
        await page.locator('input[type="file"]').setInputFiles([turkeyPath, papasuPath, corePath]);
        await page.getByRole("button", { name: "영수증 분석", exact: true }).last().click();
        const candidateCount = checkpoint.analyses.reduce((sum, item) => sum + item.body.receiptCount, 0);
        await expect(page.getByTestId("receipt-review-card")).toHaveCount(candidateCount);
        latestAnalyses.splice(0, latestAnalyses.length, ...structuredClone(checkpoint.analyses));
        await page.unrouteAll({ behavior: "wait" });
    } else {
        await analyze("C", [turkeyPath, papasuPath, corePath], 3);
    }

    const automaticC = latestAnalyses.flatMap(item => item.body.receipts);
    const automaticMatches = [turkey, papasu, core].flatMap(sample =>
        sample.receipts.map(expected => {
            const merchant = sample.id === "public-turkish-1000" ? "hanedangrup" : key(expected.merchant);
            const matches = automaticC.filter(actual =>
                key(actual.storeName).includes(merchant) || key(actual.title).includes(merchant),
            );
            const actual = matches.length === 1 ? matches[0] : null;
            return {
                sampleId: sample.id,
                expected,
                matchCount: matches.length,
                actual,
                exactCore: actual !== null
                    && decimal(actual.purchaseTotal) === decimal(expected.purchaseTotal)
                    && decimal(actual.bookAmount) === decimal(expected.bookAmount)
                    && actual.originalCurrencyCode === expected.currency
                    && actual.transactionDate === expected.date,
            };
        }),
    );

    const providerCountBeforeReview = (
        await assertReceiptRuntimePreflight(api, accountBookId, auth.Authorization)
    ).providerCallCount;
    const rows = page.getByTestId("receipt-review-card");
    const lawsonTruth = core.receipts.find(item => key(item.merchant).includes("lawson"));
    if (!lawsonTruth) throw new Error("Frozen core truth is missing LAWSON.");
    await page.setViewportSize({ width: 1024, height: 844 });
    await page.getByTestId("receipt-review-list")
        .getByRole("button", { name: "표", exact: true }).click();
    const lawsonRow = rows.filter({ hasText: "LAWSON" }).first();
    await expect(lawsonRow).toBeVisible();
    const inlineCategory = lawsonRow.getByRole("combobox");
    const categoryBefore = await inlineCategory.inputValue();
    await inlineCategory.selectOption("생활");
    await expect(inlineCategory).toHaveValue("생활");
    await lawsonRow.getByRole("button", { name: /1680 JPY/ }).click();
    const inlineAmount = lawsonRow.getByRole("textbox", { name: /원통화 반영액/ });
    await inlineAmount.fill("1681");
    await expect(page.getByTestId("receipt-submit-selected")).toBeDisabled();
    const inlineConversionPromise = page.waitForResponse(response =>
        response.url().includes("/transactions/receipt-conversion")
        && response.request().method() === "POST",
    );
    await inlineAmount.press("Enter");
    const inlineConversionResponse = await inlineConversionPromise;
    expect(inlineConversionResponse.status()).toBe(200);
    const inlineConversion = await inlineConversionResponse.json() as Record<string, unknown>;
    await expect(lawsonRow).toContainText("1681 JPY");
    await expect(lawsonRow).toContainText("관측 1680 → 사용자 수정 1681");
    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-inline-edited.png"), fullPage: true });
    const providerCountAfterInline = (
        await assertReceiptRuntimePreflight(api, accountBookId, auth.Authorization)
    ).providerCallCount;
    expect(providerCountAfterInline).toBe(providerCountBeforeReview);

    await reviewSource(page, rows, path.basename(turkeyPath), turkey.receipts[0]);
    await reviewSource(page, rows, path.basename(papasuPath), papasu.receipts[0]);
    // The inline edit is a draft-only gate. Keep that exact row unselected so the
    // registration proof remains independent from the historical automatic G2
    // error in another LAWSON candidate from the same four-receipt photograph.
    await expect(lawsonRow.getByRole("checkbox")).not.toBeChecked();
    const providerCountAfterReview = (
        await assertReceiptRuntimePreflight(api, accountBookId, auth.Authorization)
    ).providerCallCount;
    expect(providerCountAfterReview).toBe(providerCountBeforeReview);

    await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
    const batchRequestPromise = page.waitForRequest(request =>
        request.url().includes("/transactions/receipt-batch")
        && request.method() === "POST",
    );
    const batchResponsePromise = page.waitForResponse(response =>
        response.url().includes("/transactions/receipt-batch")
        && response.request().method() === "POST",
    );
    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-reviewed.png"), fullPage: true });
    await page.getByTestId("receipt-submit-selected").click();
    const batchRequest = await batchRequestPromise;
    const batchPayload = batchRequest.postDataJSON() as Record<string, unknown>;
    const batchResponse = await batchResponsePromise;
    const batchResponseText = await batchResponse.text();
    fs.writeFileSync(
        evidencePath.replace(/\.json$/, "-batch-diagnostic.json"),
        JSON.stringify({
            status: batchResponse.status(),
            request: batchPayload,
            response: JSON.parse(batchResponseText),
        }, null, 2),
    );
    expect(batchResponse.status()).toBe(200);
    const saved = (JSON.parse(batchResponseText) as { body: Transaction[] }).body;
    fs.writeFileSync(
        evidencePath.replace(/\.json$/, "-registration-checkpoint.json"),
        JSON.stringify({ accountBookId, saved }, null, 2),
    );
    expect(saved).toHaveLength(2);
    const savedTurkey = saved.find(item => key(item.title).includes("hanedangrup"))!;
    const savedPapasu = saved.find(item => key(item.title).includes(key("どらっぐ ぱぱす")))!;
    expect(savedTurkey.originalCurrencyCode).toBe("TRY");
    expect(savedTurkey.exchangeRateProvider).toBe("FRANKFURTER");
    expect(decimal(savedTurkey.originalAmount)).toBe(decimal("70.00"));
    expect(decimal(savedPapasu.purchaseTotal)).toBe(decimal("7089"));
    expect(decimal(savedPapasu.originalAmount)).toBe(decimal("5020"));
    expect(savedPapasu.exchangeRateProvider).toBe("FRANKFURTER");
    expect(saved.some(item => key(item.title).includes("lawson"))).toBe(false);

    await page.reload();
    for (const transaction of saved) {
        const month = transaction.transactionDate.slice(0, 7);
        await page.locator("select").filter({
            has: page.locator(`option[value="${month}"]`),
        }).selectOption(month);
        const card = page.getByTestId(`transaction-card-${transaction.id}`);
        await expect(card).toBeVisible();
        await card.getByRole("button", { name: "거래 상세보기", exact: true }).click();
        await expect(page.getByRole("dialog")).toContainText("FRANKFURTER");
        await page.getByRole("dialog").getByRole("button", { name: "닫기", exact: true }).last().click();
    }
    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-saved.png"), fullPage: true });

    const runtimeAfter = await assertReceiptRuntimePreflight(api, accountBookId, auth.Authorization);
    const evidence = {
        classification: "LIVE_VISION_PARALLEL_REVIEW_ASSISTED_E2E",
        runtimeBefore,
        runtimeAfter,
        accountBookId,
        sources: sourceFiles.map(([file, sample]) => ({
            id: sample.id,
            path: file,
            sha256: sample.sha256,
            bytes: fs.statSync(file).size,
        })),
        runs,
        automaticC: { candidates: automaticC, matches: automaticMatches },
        providerCountBeforeReview,
        inlineFlow: {
            merchant: "LAWSON",
            categoryBefore,
            categoryAfter: "생활",
            observedOriginalAmount: "1680",
            correctedOriginalAmount: "1681",
            conversion: inlineConversion,
            providerCountBefore: providerCountBeforeReview,
            providerCountAfter: providerCountAfterInline,
        },
        providerCountAfterReview,
        saved,
    };
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    await api.dispose();
});
