import { expect, request, test } from "@playwright/test";
import { encode } from "next-auth/jwt";
import fs from "node:fs";
import path from "node:path";

const enabled = process.env.E2E_RECEIPT_FINAL_GATE_SNAPSHOT === "1";
const appUrl = process.env.E2E_BASE_URL ?? "http://localhost:3010";
const apiUrl = (process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8080/api/v1").replace(/\/+$/, "");

type Transaction = {
    id: number; amount: string; originalAmount: string | null; exchangeRate: string | null;
    exchangeRateProvider: string | null; requestedRateDate: string | null; effectiveRateDate: string | null;
    conversionQuoteId: string | null;
};

test("RECEIPT-FINAL-GATE stored FX snapshots survive cache mutation and a new server session", async ({ context, page }) => {
    test.skip(!enabled, "Set E2E_RECEIPT_FINAL_GATE_SNAPSHOT=1 for the isolated snapshot gate.");
    test.setTimeout(420_000);
    page.setDefaultNavigationTimeout(90_000);
    const email = process.env.E2E_RECEIPT_EMAIL;
    const password = process.env.E2E_RECEIPT_PASSWORD;
    const secret = process.env.NEXTAUTH_SECRET;
    const sourceEvidencePath = process.env.E2E_RECEIPT_SOURCE_EVIDENCE;
    const evidencePath = process.env.E2E_RECEIPT_EVIDENCE;
    const mutatedCacheRate = process.env.E2E_RECEIPT_MUTATED_CACHE_RATE;
    const mutatedCacheDate = process.env.E2E_RECEIPT_MUTATED_CACHE_DATE;
    if (!email || !password || !secret || !sourceEvidencePath || !evidencePath
        || !mutatedCacheRate || !mutatedCacheDate)
        throw new Error("Snapshot credentials, secret, source evidence, cache rate/date and output path are required.");
    const source = JSON.parse(fs.readFileSync(sourceEvidencePath, "utf8")) as {
        accountBookId: number; registration: { savedTransactions: Transaction[] };
    };
    const expected = source.registration.savedTransactions;

    const api = await request.newContext({ baseURL: `${apiUrl}/` });
    const loginResponse = await api.post("auth/login", { data: { email, password } });
    expect(loginResponse.status()).toBe(200);
    const login = await loginResponse.json() as { body: { accessToken: string; accessTokenExpiresIn: number; role: "USER" | "ADMIN"; publicId: string } };
    const listResponse = await api.post(`account-books/${source.accountBookId}/transactions`, {
        headers: { Authorization: `Bearer ${login.body.accessToken}` },
        data: { year: 2026, month: 9, page: 0, size: 100 },
    });
    expect(listResponse.status()).toBe(200);
    const list = await listResponse.json() as { body: { page: { content: Transaction[] } } };
    const expectedIds = new Set(expected.map(item => item.id));
    const afterRestart = list.body.page.content.filter(item => expectedIds.has(item.id));
    expect(afterRestart).toHaveLength(expected.length);
    const snapshotFields = ["amount", "originalAmount", "exchangeRate", "exchangeRateProvider", "requestedRateDate", "effectiveRateDate", "conversionQuoteId"] as const;
    for (const before of expected) {
        const after = afterRestart.find(item => item.id === before.id)!;
        for (const field of snapshotFields) expect(after[field], `${before.id}.${field}`).toBe(before[field]);
        expect(after.exchangeRate).not.toBe(mutatedCacheRate);
    }

    const now = Math.floor(Date.now() / 1000); const maxAge = Math.max(login.body.accessTokenExpiresIn, 300);
    const token = await encode({ secret, maxAge, token: { name: "receipt-final-snapshot", email,
        sub: login.body.publicId, accessToken: login.body.accessToken,
        accessTokenExpires: Date.now() + login.body.accessTokenExpiresIn * 1000,
        role: login.body.role, publicId: login.body.publicId, iat: now, exp: now + maxAge,
        jti: `receipt-final-snapshot-${now}` } });
    await context.addCookies([{ name: "next-auth.session-token", value: token, url: appUrl,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + maxAge }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/ko/account-books/${source.accountBookId}`);
    const card = page.getByTestId(`transaction-card-${expected[0].id}`);
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "거래 상세보기", exact: true }).click();
    const detail = page.getByRole("dialog");
    await expect(detail).toContainText(expected[0].exchangeRate!);
    await expect(detail).toContainText(expected[0].exchangeRateProvider!);
    await expect(detail).not.toContainText(mutatedCacheRate);
    await page.screenshot({ path: evidencePath.replace(/\.json$/, ".png"), fullPage: true });
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify({ classification: "LIVE_SNAPSHOT_INVARIANCE",
        accountBookId: source.accountBookId,
        cacheMutation: { pair: "JPY/USD", requestedRateDate: mutatedCacheDate, rate: mutatedCacheRate },
        serverRestarted: true, newLoginSession: true, comparedFields: snapshotFields, before: expected, afterRestart }, null, 2));
    await api.dispose();
});
