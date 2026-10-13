import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import ko from "../../messages/ko/writingParagraph.json";
import type { ParagraphFeedbackResult, ParagraphWritingPlan } from "../../src/types/language-learning/paragraphWriting";

type QaUser = { label: string; publicId: string; accessToken: string; refreshToken: string };
type PartCheck = { requirementId: string; status: string };
type FixedCase = { id: string; writingType: "TRANSLATION" | "GUIDED" | "FREE"; answer: string; answerSha256: string;
    manifest: { items: { prompt: string }[] }; expected: { observationStatuses: Record<string, "MET" | "UNMET" | "UNCERTAIN">;
        necessaryCorrections: string; partChecks: PartCheck[] | PartCheck | null } };
type FixedPlan = { caseId: string; failureTest: boolean; ownerLabel: string; planId: number; itemId: number; answerSha256: string };
const runtime = process.env.E2E_WRITING_RUNTIME_DIR ?? "";
const baseURL = process.env.E2E_BASE_URL ?? "";
const apiURL = process.env.E2E_API_BASE_URL ?? "";
const api = `${apiURL}/language-learning/writing/curated`;
const texts = ko.ParagraphWriting;

function read<T>(file: string): T {
    return JSON.parse(fs.readFileSync(path.join(runtime, file), "utf8")) as T;
}

function fixture(id: string, failureTest = false): { source: FixedCase; plan: FixedPlan; user: QaUser } {
    const file = id.startsWith("T") ? "../fixed-translation-regression.json" : "../fixed-feedback-cases.json";
    const source = read<{ cases: FixedCase[] }>(file).cases.find((row) => row.id === id);
    const plan = read<{ plans: FixedPlan[] }>("fixed-plans.json").plans.find((row) => row.caseId === id && row.failureTest === failureTest);
    const user = read<QaUser[]>("private/users.json").find((row) => row.label === plan?.ownerLabel);
    if (!source || !plan || !user) throw new Error(`Fixed owned QA fixture missing: ${id}/${failureTest}`);
    return { source, plan, user };
}

function calls(): number {
    const file = path.join(runtime, "offline-replay-calls.jsonl");
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).length : 0;
}

async function authenticate(context: BrowserContext, user: QaUser): Promise<void> {
    // 실제 scratch BE login의 JWT를 정상 서명한 NextAuth cookie에 담는다.
    const token = await encode({ secret: process.env.NEXTAUTH_SECRET!, maxAge: 3600, token: {
        sub: user.publicId, publicId: user.publicId, role: "USER", loginSessionId: randomUUID(),
        accessToken: user.accessToken, refreshToken: user.refreshToken, accessTokenExpires: Date.now() + 3600_000,
    } });
    await context.addCookies([{ name: "next-auth.session-token", value: token, url: baseURL, httpOnly: true,
        secure: false, sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 3600 }]);
}

async function submit(page: Page, itemId: number, answer: string): Promise<ParagraphWritingPlan> {
    await page.getByLabel("나의 답안", { exact: true }).fill(answer);
    const received = page.waitForResponse((response) => response.url() === `${api}/plans/items/${itemId}/answers` && response.request().method() === "POST");
    await page.getByRole("button", { name: "답안 저장 후 참고 보기", exact: true }).click();
    const response = await received;
    expect(response.status()).toBe(200);
    return (await response.json() as { body: ParagraphWritingPlan }).body;
}

async function assertDisplayed(page: Page, result: ParagraphFeedbackResult, answerId: number): Promise<void> {
    const feedback = page.getByTestId(`paragraph-feedback-${answerId}`);
    await expect(feedback).toBeVisible();
    await expect(feedback.getByText(texts.feedbackReferenceOnly, { exact: true })).toBeVisible();
    for (const row of result.observations) {
        await expect(feedback.getByText(`${row.requirementId} · ${texts.requirementStates[row.status]}`, { exact: true })).toBeVisible();
        for (const [index, part] of (row.requirementParts ?? []).entries()) {
            const card = feedback.getByTestId(`paragraph-part-${row.requirementId}-${index + 1}`);
            await expect(card.getByTestId("paragraph-part-status")).toHaveText(texts.requirementPartStates[part.status]);
            await expect(card.getByTestId("paragraph-part-requirement")).toHaveText(part.requirementQuote);
        }
    }
    if (result.necessaryCorrections.length === 0) await expect(feedback.locator("strong").filter({ hasText: texts.necessaryCorrection })).toHaveCount(0);
    for (const correction of result.necessaryCorrections) {
        await expect(feedback.getByText(`${texts.necessaryCorrection} · ${correction.requirementId}`, { exact: true })).toBeVisible();
    }
}

test.beforeAll(() => {
    expect(runtime, "Owned E2E_WRITING_RUNTIME_DIR is required").not.toBe("");
    expect(process.env.NEXTAUTH_SECRET, "Owned NEXTAUTH_SECRET is required").toBeTruthy();
    expect(new URL(baseURL).hostname).toBe("127.0.0.1");
    expect(new URL(apiURL).hostname).toBe("127.0.0.1");
});

for (const id of ["G01", "G02", "G03", "G04", "G05", "G06", "F01", "F02", "F03", "F04", "F05", "F06", "T01", "T02"]) {
    test(`고정 ${id}: 실제 DB·HTTP·UI 판정, offline live 응답 재생`, async ({ context, page }, testInfo) => {
        test.setTimeout(90_000);
        // 준비: 문항 snapshot은 DB fixture이며, 답안과 피드백은 실제 브라우저 제출로만 생성한다.
        const { source, plan, user } = fixture(id);
        await authenticate(context, user);
        await page.setViewportSize({ width: 390, height: 844 });
        const before = calls();
        await page.goto(`/ko/language-learning/writing/paragraph?planId=${plan.planId}`);
        const item = page.getByTestId("paragraph-item-1");
        await expect(item.getByTestId("paragraph-source")).toHaveText(source.manifest.items[0].prompt);
        await expect(item.getByRole("region", { name: "참고 답안과 체크리스트", exact: true })).toHaveCount(0);

        // 실행: raw 실모델 응답은 동일 입력 hash에만 replay하며 공개 HTTP 결과는 mock하지 않는다.
        const saved = await submit(page, plan.itemId, source.answer);
        const attempt = saved.items[0].attempts[0];
        expect(saved.personalizedFeedbackStatus).toBe("ACTIVE_QA");
        expect(attempt.feedback?.status).toBe("SUCCEEDED");
        const result = attempt.feedback!.result!;
        expect(result.policyVersion).toBe("curated-writing-feedback-v10");
        expect(Object.fromEntries(result.observations.map((row) => [row.requirementId, row.status]))).toEqual(source.expected.observationStatuses);
        if (source.expected.necessaryCorrections === "EMPTY") expect(result.necessaryCorrections).toHaveLength(0);
        if (source.expected.necessaryCorrections === "AUTHORIZED_TASK_FACT_CONFLICT_PATCH_REQUIRED") {
            expect(result.necessaryCorrections.length).toBeGreaterThan(0);
        }
        const parts = source.expected.partChecks;
        for (const check of (Array.isArray(parts) ? parts : parts ? [parts] : [])) {
            expect(result.observations.find((row) => row.requirementId === check.requirementId)?.requirementParts?.some((part) => part.status === check.status)).toBe(true);
        }
        expect(attempt.answer).toBe(source.answer);
        expect(attempt.evaluation).toBeNull();
        await assertDisplayed(page, result, attempt.answerId);
        expect(calls()).toBe(before + 1);

        // 검증: 새로고침과 중복 답안 접수는 기존 결과를 그대로 읽고 모델 호출을 만들지 않는다.
        await page.reload();
        await assertDisplayed(page, result, attempt.answerId);
        const duplicate = await context.request.post(`${api}/plans/items/${plan.itemId}/answers`, {
            headers: { Authorization: `Bearer ${user.accessToken}` },
            data: { answer: source.answer, contentRevision: saved.items[0].contentRevision },
        });
        expect(duplicate.status()).toBe(200);
        expect((await duplicate.json() as { body: ParagraphWritingPlan }).body).toEqual(saved);

        // 부정 검증: 다른 소유자와 오래된 revision은 저장 결과에 접근하거나 덮어쓸 수 없다.
        const other = read<QaUser[]>("private/users.json").find((row) => row.label !== user.label)!;
        const foreign = await context.request.get(`${api}/plans/${plan.planId}`, { headers: { Authorization: `Bearer ${other.accessToken}` } });
        expect(foreign.status()).toBe(404);
        const stale = await context.request.post(`${api}/plans/items/${plan.itemId}/answers`, {
            headers: { Authorization: `Bearer ${user.accessToken}` }, data: { answer: source.answer, contentRevision: "0".repeat(64) },
        });
        expect(stale.status()).toBe(409);
        expect(calls()).toBe(before + 1);
        await expect.poll(async () => (await item.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(330);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByTestId(`paragraph-feedback-${attempt.answerId}`).screenshot({ path: testInfo.outputPath(`${id}-feedback-mobile.png`) });
        await authenticate(context, other);
        await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
        await expect(page.getByTestId("paragraph-source")).toHaveCount(0);
        await expect(page.getByTestId(`paragraph-feedback-${attempt.answerId}`)).toHaveCount(0);
        expect(calls()).toBe(before + 1);
        await testInfo.attach("provenance", { contentType: "application/json", body: Buffer.from(JSON.stringify({
            caseId: id, fixtureSeededTask: true, actualBeLlDb: true, modelBoundary: "offline replay of exact recorded live command",
            newPaidCalls: 0, answerSha256: plan.answerSha256, savedResultPolicy: result.policyVersion,
        })) });
    });
}

test("실제 LL 검증 실패는 FAILED로 표시하고 명시 재시도만 저장 피드백을 복구한다", async ({ context, page }) => {
    test.setTimeout(90_000);
    // 준비: 한 번의 합성 잘못된 raw output을 LL validator에 전달한다. 공개 응답은 주입하지 않는다.
    const { source, plan, user } = fixture("G01", true);
    await authenticate(context, user);
    await page.goto(`/ko/language-learning/writing/paragraph?planId=${plan.planId}`);
    await expect(page.getByTestId("paragraph-item-1")).toBeVisible();
    const before = calls();
    fs.writeFileSync(path.join(runtime, "fail-next-feedback-output"), "one invalid raw output");

    // 실행·검증: 실패한 feedback도 답안은 보존하고, 새로고침은 자동 재시도하지 않는다.
    const failed = await submit(page, plan.itemId, source.answer);
    const attempt = failed.items[0].attempts[0];
    expect(attempt.feedback?.status).toBe("FAILED");
    expect(attempt.feedback?.result).toBeNull();
    expect(attempt.feedback?.canRetry).toBe(true);
    await expect(page.getByTestId(`paragraph-feedback-${attempt.answerId}`)).toContainText(texts.feedbackStates.FAILED);
    await page.reload();
    await expect(page.getByRole("region", { name: texts.savedAnswer, exact: true }).getByText(source.answer, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: texts.retryFeedback, exact: true })).toBeVisible();
    expect(calls()).toBe(before + 1);

    // 명시적 재시도만 같은 고정 실모델 응답을 replay하여 정상 저장한다.
    const received = page.waitForResponse((response) => response.url() === `${api}/plans/answers/${attempt.answerId}/feedback/retry` && response.request().method() === "POST");
    await page.getByRole("button", { name: texts.retryFeedback, exact: true }).click();
    const response = await received;
    expect(response.status()).toBe(200);
    const recovered = (await response.json() as { body: ParagraphWritingPlan }).body.items[0].attempts[0];
    expect(recovered.answer).toBe(source.answer);
    expect(recovered.feedback?.status).toBe("SUCCEEDED");
    await assertDisplayed(page, recovered.feedback!.result!, recovered.answerId);
    expect(calls()).toBe(before + 2);
});
