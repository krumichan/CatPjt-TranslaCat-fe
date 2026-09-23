import { expect, request, test, type Locator, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import fs from "node:fs";
import path from "node:path";
import { assertReceiptRuntimePreflight } from "../support/receipt-runtime-preflight";

const enabled = process.env.E2E_RECEIPT_REVIEW_ASSISTED === "1";
const appUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiUrl = (process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8080/api/v1").replace(/\/+$/, "");

type Correction = {
    marker: string;
    title: string;
    storeName: string;
    branchName: string;
    amount?: string;
};

async function correctAndReview(page: Page, rows: Locator, correction: Correction) {
    const row = rows.filter({ hasText: correction.marker }).first();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "확인·수정", exact: true }).click();
    const editor = page.getByTestId("receipt-review-editor");
    await expect(editor.getByTestId("receipt-source-preview")).toBeVisible();
    await editor.getByRole("textbox", { name: "거래명", exact: true }).fill(correction.title);
    await editor.getByRole("textbox", { name: "점포명", exact: true }).fill(correction.storeName);
    await editor.getByText("영수증 결제·환율 세부 정보", { exact: true }).click();
    await editor.getByRole("textbox", { name: "지점·위치", exact: true }).fill(correction.branchName);
    if (correction.amount) {
        await editor.getByRole("textbox", { name: "가계부 반영 원금액", exact: true }).fill(correction.amount);
    }
    // The captured LIVE analysis belongs to an earlier runtime/cache snapshot. Refresh every
    // replayed quote through the current BE before source confirmation and atomic registration.
    const conversion = page.waitForResponse(response => response.url().includes("/transactions/receipt-conversion")
        && response.request().method() === "POST");
    await editor.getByRole("button", { name: "환산 금액 다시 확인", exact: true }).click();
    expect((await conversion).status()).toBe(200);
    await expect(editor).toContainText(/FRANKFURTER/);
    await editor.getByRole("button", { name: "현재 원본과 입력값 확인 완료", exact: true }).click();
    await expect(editor.getByRole("button", { name: "현재 revision 원본 확인 완료", exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "변경사항 적용", exact: true }).click();
    return rows.filter({ hasText: correction.title }).first();
}

test("LIVE-REVIEW-ASSISTED captured AI response to source review, BE FX, MySQL and detail", async ({ context, page }) => {
    test.skip(!enabled, "Set E2E_RECEIPT_REVIEW_ASSISTED=1 for the isolated review-assisted gate.");
    test.setTimeout(420_000);
    page.setDefaultTimeout(25_000);
    page.setDefaultNavigationTimeout(90_000);

    const email = process.env.E2E_RECEIPT_EMAIL;
    const password = process.env.E2E_RECEIPT_PASSWORD;
    const secret = process.env.NEXTAUTH_SECRET;
    const accountBookId = process.env.E2E_RECEIPT_ACCOUNT_BOOK_ID;
    const image = process.env.E2E_RECEIPT_IMAGE;
    const replayPath = process.env.E2E_RECEIPT_ANALYSIS_REPLAY;
    const evidencePath = process.env.E2E_RECEIPT_EVIDENCE;
    if (!email || !password || !secret || !accountBookId || !image || !replayPath || !evidencePath)
        throw new Error("Review-assisted credentials, account book, source, replay and evidence path are required.");
    expect(fs.existsSync(image), image).toBe(true);
    expect(fs.existsSync(replayPath), replayPath).toBe(true);

    const api = await request.newContext({ baseURL: `${apiUrl}/` });
    const loginResponse = await api.post("auth/login", { data: { email, password } });
    expect(loginResponse.status()).toBe(200);
    const login = await loginResponse.json() as {
        body: { accessToken: string; accessTokenExpiresIn: number; role: "USER" | "ADMIN"; publicId: string };
    };
    const auth = { Authorization: `Bearer ${login.body.accessToken}` };
    const runtimeBefore = await assertReceiptRuntimePreflight(api, accountBookId, auth.Authorization);
    expect(runtimeBefore.providerCallCount).toBe(0);

    const now = Math.floor(Date.now() / 1000);
    const maxAge = Math.max(login.body.accessTokenExpiresIn, 300);
    const sessionToken = await encode({
        secret, maxAge,
        token: {
            name: "receipt-review-assisted", email, sub: login.body.publicId,
            accessToken: login.body.accessToken,
            accessTokenExpires: Date.now() + login.body.accessTokenExpiresIn * 1000,
            role: login.body.role, publicId: login.body.publicId,
            iat: now, exp: now + maxAge, jti: `receipt-review-assisted-${now}`,
        },
    });
    await context.addCookies([{
        name: "next-auth.session-token", value: sessionToken, url: appUrl,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + maxAge,
    }]);

    const replay = JSON.parse(fs.readFileSync(replayPath, "utf8"));
    expect(replay.body.analysisTraceId).toBeTruthy();
    expect(replay.body.receiptCount).toBe(4);
    await page.route("**/transactions/receipt-analysis", route => route.fulfill({
        status: 200, contentType: "application/json", body: JSON.stringify(replay),
    }));
    const batchBodies: Array<{ receipts: Array<Record<string, unknown>> }> = [];
    let analysisRequests = 0;
    let conversionRequests = 0;
    page.on("request", event => {
        if (event.url().includes("/transactions/receipt-analysis")) analysisRequests += 1;
        if (event.url().includes("/transactions/receipt-conversion")) conversionRequests += 1;
        if (event.url().includes("/transactions/receipt-batch"))
            batchBodies.push(event.postDataJSON() as { receipts: Array<Record<string, unknown>> });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/ko/account-books/${accountBookId}`);
    await page.getByRole("button", { name: "거래 등록", exact: true }).click();
    await page.getByRole("button", { name: "영수증 분석", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles(image);
    await page.getByRole("button", { name: "영수증 분석", exact: true }).last().click();
    await expect(page.getByTestId("receipt-review-card")).toHaveCount(4);
    expect(analysisRequests).toBe(1);
    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-source-before.png"), fullPage: true });

    const analysisHeader = page.getByRole("button", { name: /사진 1 · 영수증 4/ });
    if ((await analysisHeader.getAttribute("aria-expanded")) === "false") await analysisHeader.click();
    await page.getByRole("button", { name: "누락 영수증 영역 추가", exact: true }).click();
    await page.getByRole("button", { name: "전체 사진 사용", exact: true }).click();
    await page.getByRole("button", { name: "선택 영역 후보 추가", exact: true }).click();
    await expect(page.getByTestId("receipt-review-card")).toHaveCount(5);
    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-manual-region-added.png"), fullPage: true });

    await page.getByTestId("receipt-review-list").getByRole("button", { name: "표", exact: true }).click();
    const rows = page.getByTestId("receipt-review-card");
    const corrections: Correction[] = [
        { marker: "カラオケまねきねこ", title: "カラオケまねきねこ 船堀駅前店", storeName: "カラオケまねきねこ", branchName: "船堀駅前店" },
        { marker: "ROYAL KITCHENS", title: "ROYAL KITCHENS! 千葉県千葉市美浜区中瀬2-1", storeName: "ROYAL KITCHENS!", branchName: "千葉県千葉市美浜区中瀬2-1" },
        { marker: "AEON", title: "AEON フードスタイル船堀店", storeName: "AEON", branchName: "フードスタイル船堀店" },
        { marker: "LAWSON", title: "LAWSON 船堀店", storeName: "LAWSON", branchName: "船堀店", amount: "1680" },
    ];
    for (const correction of corrections) {
        const correctedRow = await correctAndReview(page, rows, correction);
        const checkbox = correctedRow.getByRole("checkbox");
        await expect(checkbox).toBeEnabled();
        await checkbox.check();
    }
    expect(conversionRequests).toBe(4);
    await expect(page.getByTestId("receipt-submit-selected")).toBeEnabled();
    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-review-complete.png"), fullPage: true });

    const registrationPromise = page.waitForResponse(response => response.url().includes("/transactions/receipt-batch")
        && response.request().method() === "POST");
    await page.getByTestId("receipt-submit-selected").click();
    const registrationResponse = await registrationPromise;
    const registrationText = await registrationResponse.text();
    expect(registrationResponse.status(), registrationText).toBe(200);
    const registration = JSON.parse(registrationText) as { body: Array<{ id: number; title: string }> };
    expect(registration.body).toHaveLength(4);
    expect(batchBodies).toHaveLength(1);
    const submitted = batchBodies[0].receipts;
    expect(submitted).toHaveLength(4);
    expect(submitted.every(candidate => candidate.reviewMode === "ASSISTED"
        && candidate.reviewedRevision === candidate.draftRevision)).toBe(true);
    expect(submitted.find(candidate => candidate.title === "LAWSON 船堀店")?.originalAmount).toBe("1680");

    const listed = await api.post(`account-books/${accountBookId}/transactions`, {
        headers: auth, data: { year: 2026, month: 9, page: 0, size: 100 },
    });
    expect(listed.status()).toBe(200);
    const listEnvelope = await listed.json() as { body: { page: { content: Array<Record<string, unknown>> } } };
    const ids = new Set(registration.body.map(item => item.id));
    const saved = listEnvelope.body.page.content.filter(item => ids.has(Number(item.id)));
    expect(saved).toHaveLength(4);
    expect(saved.every(item => item.exchangeRateProvider === "FRANKFURTER")).toBe(true);

    await page.reload();
    const lawson = registration.body.find(item => item.title === "LAWSON 船堀店")!;
    const card = page.getByTestId(`transaction-card-${lawson.id}`);
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "거래 상세보기", exact: true }).click();
    const detail = page.getByRole("dialog");
    await expect(detail).toContainText(/1680(?:\.0+)? JPY/);
    await expect(detail).toContainText("FRANKFURTER");
    await page.screenshot({ path: evidencePath.replace(/\.json$/, "-saved-detail.png"), fullPage: true });

    const runtimeAfter = await assertReceiptRuntimePreflight(api, accountBookId, auth.Authorization);
    expect(runtimeAfter.providerCallCount).toBe(0);
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify({
        classification: "LIVE_REVIEW_ASSISTED_E2E",
        aiInput: {
            mode: "CAPTURED_LIVE_AI_RESPONSE_REPLAY",
            traceId: replay.body.analysisTraceId,
            newProviderCalls: 0,
        },
        runtimeBefore, runtimeAfter,
        accountBookId,
        sourceImage: image,
        sourceReceiptCount: replay.body.receiptCount,
        manualRegionCandidateAdded: true,
        correctedTitles: corrections.map(item => item.title),
        conversionRequests,
        batchSize: submitted.length,
        reviewedRevisions: submitted.map(candidate => ({
            receiptId: candidate.receiptId,
            draftRevision: candidate.draftRevision,
            reviewedRevision: candidate.reviewedRevision,
            sourceRegion: candidate.sourceRegion,
        })),
        transactionIds: registration.body.map(item => item.id),
        saved,
    }, null, 2));
    await api.dispose();
});
