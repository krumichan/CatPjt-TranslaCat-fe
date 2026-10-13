import { expect, test, type BrowserContext, type Page, type Response } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { WritingPreparation } from "../../src/types/language-learning/writingPreparation";
import type { ParagraphWritingPlan, ParagraphWritingPreview } from "../../src/types/language-learning/paragraphWriting";

type QaUser = { label: string; publicId: string; accessToken: string; refreshToken: string; userId: number };
type SyntheticCall = { traceId: string; taskName: string; repairReasonCodes: string[] | null; repairNotesSha256: string | null; synthetic: boolean };
const runtimeDirectory = process.env.E2E_WRITING_RUNTIME_DIR ?? "";
const baseURL = process.env.E2E_BASE_URL ?? "";
const apiURL = process.env.E2E_API_BASE_URL ?? "";
const secret = process.env.NEXTAUTH_SECRET ?? "";
const root = `${apiURL}/language-learning/writing/curated`;
const labels = { TRANSLATION: "번역 작문", GUIDED: "가이드 작문", FREE: "자유 작문" } as const;

function user(label: string): QaUser {
    const users = JSON.parse(fs.readFileSync(path.join(runtimeDirectory, "private/users.json"), "utf8")) as QaUser[];
    const selected = users.find((value) => value.label === label);
    if (!selected) throw new Error(`Owned QA user ${label} is missing`);
    return selected;
}

function calls(): SyntheticCall[] {
    const file = path.join(runtimeDirectory, "synthetic-calls.jsonl");
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean)
        .map((line) => JSON.parse(line) as SyntheticCall)
        .filter((call) => call.taskName === "LANGUAGE_LEARNING_CURATED_WRITING_GENERATION");
}

async function authenticate(context: BrowserContext, label: string): Promise<void> {
    // 준비: 실제 BE login으로 발급한 scratch 계정 토큰을 정상 NextAuth cookie에 넣는다.
    const qa = user(label);
    const now = Math.floor(Date.now() / 1000);
    const token = await encode({ secret, maxAge: 3600, token: {
        sub: qa.publicId, publicId: qa.publicId, role: "USER", loginSessionId: randomUUID(),
        accessToken: qa.accessToken, refreshToken: qa.refreshToken,
        accessTokenExpires: Date.now() + 3600_000, iat: now, exp: now + 3600, jti: randomUUID(),
    } });
    await context.addCookies([{ name: "next-auth.session-token", value: token, url: baseURL,
        httpOnly: true, secure: false, sameSite: "Lax", expires: now + 3600 }]);
}

async function responseBody<T>(response: Response): Promise<T> {
    expect(response.status(), `${response.request().method()} ${new URL(response.url()).pathname}`).toBe(200);
    return (await response.json() as { body: T }).body;
}

async function clickResponse<T>(page: Page, name: string, endpoint: string): Promise<T> {
    const response = page.waitForResponse((value) => value.url() === endpoint && value.request().method() === "POST");
    await page.getByRole("button", { name, exact: true }).click();
    return responseBody<T>(await response);
}

async function ready(page: Page): Promise<void> {
    await expect(page.getByTestId("paragraph-writing-page")).toHaveAttribute("aria-busy", "false");
}

test.describe.configure({ mode: "serial" });
test.beforeAll(() => {
    // 이 파일은 전체 실서비스 스택을 준비한 전용 실행만 허용한다. 누락을 skip으로 숨기지 않는다.
    expect(runtimeDirectory, "E2E_WRITING_RUNTIME_DIR").not.toBe("");
    expect(secret, "NEXTAUTH_SECRET").not.toBe("");
    expect(new URL(baseURL).hostname).toBe("127.0.0.1");
    expect(new URL(apiURL).hostname).toBe("127.0.0.1");
});

for (const [index, writingType] of (["TRANSLATION", "GUIDED", "FREE"] as const).entries()) {
    test(`실제 DB·HTTP·브라우저 ${writingType} 후보→사유→교체→제출·조회`, async ({ context, page }, testInfo) => {
        test.setTimeout(120_000);
        // 준비: 세 유형은 서로 다른 실제 scratch 계정을 사용한다. Provider만 합성이다.
        await authenticate(context, ["a", "b", "c"][index]);
        const initialCalls = calls().length;
        // FREE는 모바일로 처음 진입하고 다른 두 유형은 사용 도중 화면을 축소한다.
        if (writingType === "FREE") await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("/ko/language-learning/writing/paragraph");
        await expect(page.getByTestId("writing-preparation-panel")).toBeVisible();
        await page.getByRole("button", { name: labels[writingType], exact: true }).click();
        await page.getByLabel("준비할 단계", { exact: true }).selectOption(writingType === "TRANSLATION" ? "2" : "3");
        await page.getByLabel("주제", { exact: true }).selectOption("library-use");

        // 실행: 브라우저 클릭이 FE→BE→LL→MySQL 및 합성 Provider HTTP를 실제로 통과한다.
        const original = await clickResponse<WritingPreparation>(page, "새 후보 준비", `${root}/preparations`);
        expect(original.status).toBe("SUCCEEDED");
        // 합성 HTTP 경계는 현행 고정 provider/model 필드만 흉내 낸다. 실제 provenance를 별도로 확인한다.
        expect(original.provider).toBe("openai");
        expect(original.model).toBe("gpt-5.6-luna");
        expect(calls().find((call) => call.traceId === original.preparationId)?.synthetic).toBe(true);
        expect(original.quality).toMatchObject({ contractStatus: "PASSED", semanticStatus: "NOT_REVIEWED", humanReview: "NOT_PERFORMED", releaseStatus: "QA_ONLY" });
        expect(original.candidate).not.toBeNull();
        expect(original.candidate).not.toHaveProperty("referenceAnswers");
        expect(original.candidate).not.toHaveProperty("validAlternative");
        await expect(page.getByTestId("prepared-prompt")).toHaveText(original.candidate!.prompt);
        await expect(page.getByText("형식 검사는 의미 정확성을 보장하지 않습니다. 사람 검수는 수행하지 않았습니다.", { exact: true })).toBeVisible();
        expect(calls()).toHaveLength(initialCalls + 1);
        await ready(page);
        await page.getByRole("button", { name: "이 후보로 확보 가능 수 확인하기", exact: true }).click();
        const target = writingType === "TRANSLATION" ? 5 : 1;
        await page.getByLabel("목표 문항 수", { exact: true }).fill(String(target));
        const preview = await clickResponse<ParagraphWritingPreview>(page, "확보 가능 문항 확인", `${root}/plans/preview`);
        expect(preview).toMatchObject({ baseBand: 3, targetItemCount: target, acquiredItemCount: 1, remainingItemCount: target - 1 });
        expect(preview.requiresPartialConsent).toBe(target > 1);
        await ready(page);
        const plan = await clickResponse<ParagraphWritingPlan>(page, target > 1 ? "부족 수를 남기고 확보분으로 시작" : "목표대로 시작", `${root}/plans`);
        expect(plan.items).toHaveLength(1);
        expect(plan.targetItemCount).toBe(target);
        expect(plan.items[0].preparationRequestKey).toBe(original.requestKey);
        expect(plan.items[0]).not.toHaveProperty("reference");
        expect(plan.items[0]).toMatchObject({ targetBand: writingType === "TRANSLATION" ? 2 : 3,
            difficulty: writingType === "TRANSLATION" ? "REVIEW" : "NORMAL" });
        const item = page.getByTestId(`paragraph-item-${plan.items[0].order}`);
        await expect(item.getByTestId("paragraph-source")).toHaveText(original.candidate!.prompt);
        await expect(item.getByRole("region", { name: "참고 답안과 체크리스트", exact: true })).toHaveCount(0);
        await item.getByLabel("나의 답안", { exact: true }).fill("원래 문항에만 속하는 미저장 초안");

        // 실행: 화면의 서버 사유와 사용자 의견을 보낸 뒤 미답안 문항에만 명시적으로 적용한다.
        const notes = `${writingType} 이유와 조건을 더 분명하게 해 주세요. 기존 답안은 보존해 주세요.`;
        await page.getByLabel("문제가 된 부분이나 원하는 개선점", { exact: true }).fill(notes);
        const repaired = await clickResponse<WritingPreparation>(page, writingType === "TRANSLATION" ? "사유를 보내 다른 문제 준비" : "사유를 보내 한 번 수정", `${root}/preparations`);
        expect(repaired.status).toBe("SUCCEEDED");
        expect(repaired.repairOfRequestKey).toBe(original.requestKey);
        expect(repaired.repairNotes).toBe(notes);
        expect(repaired.canRepair).toBe(false);
        expect(repaired.repairBlockedReason).toBe("REPAIR_LIMIT");
        if (writingType === "TRANSLATION") expect(repaired.candidate!.topicKey).not.toBe(original.candidate!.topicKey);
        expect(repaired.candidate!.prompt).not.toBe(original.candidate!.prompt);
        const repairCall = calls().find((call) => call.traceId === repaired.preparationId);
        expect(repairCall?.repairReasonCodes).toEqual(original.quality.reasonCodes);
        expect(repairCall?.repairNotesSha256).toBe(createHash("sha256").update(notes).digest("hex"));
        expect(calls()).toHaveLength(initialCalls + 2);
        await ready(page);
        const replacement = await clickResponse<ParagraphWritingPlan>(page, "이 미답안 문항에 적용", `${root}/plans/items/${plan.items[0].itemId}/replacement`);
        expect(replacement.planRevision).toBe(plan.planRevision + 1);
        expect(replacement.items[0].contentRevision).not.toBe(plan.items[0].contentRevision);
        await expect(item.getByTestId("paragraph-source")).toHaveText(repaired.candidate!.prompt);
        await expect(item.getByLabel("나의 답안", { exact: true })).toHaveValue("");
        expect(await page.evaluate(() => Object.values(localStorage).includes("원래 문항에만 속하는 미저장 초안"))).toBe(true);
        expect(calls()).toHaveLength(initialCalls + 2);

        // 검증: 답안 제출 후에만 참고 자료를 공개하며 새로고침은 모델 호출을 만들지 않는다.
        const answer = "図書館で友達と勉強する予定です。試験が近いので、週末に復習したいと思います。";
        await item.getByLabel("나의 답안", { exact: true }).fill(answer);
        const submitted = await clickResponse<ParagraphWritingPlan>(page, "답안 저장 후 참고 보기", `${root}/plans/items/${plan.items[0].itemId}/answers`);
        expect(submitted.items[0].attempts).toHaveLength(1);
        expect(submitted.items[0].attempts[0].answer).toBe(answer);
        expect(submitted.items[0].reference?.referenceAnswers.length).toBeGreaterThanOrEqual(2);
        await expect(item.getByRole("region", { name: "참고 답안과 체크리스트", exact: true })).toBeVisible();
        await page.reload();
        await expect(item.getByText(answer, { exact: true })).toBeVisible();
        await expect(page.getByTestId("prepared-prompt")).toHaveText(repaired.candidate!.prompt);
        await ready(page);
        expect(calls()).toHaveLength(initialCalls + 2);
        await page.setViewportSize({ width: 390, height: 844 });
        // 앱 셸의 200ms margin 전환 중간을 정상 화면으로 판정하지 않는다. 내용 폭도 확인한다.
        await expect.poll(async () => (await page.getByTestId("writing-preparation-panel").boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(330);
        await expect.poll(async () => (await item.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(330);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.getByTestId("writing-preparation-panel").screenshot({ path: testInfo.outputPath(`${writingType.toLowerCase()}-mobile-preparation.png`) });
        await item.screenshot({ path: testInfo.outputPath(`${writingType.toLowerCase()}-mobile-item.png`) });

        // 검증: 동일 브라우저 계정을 바꿔도 이전 사용자 원문·답안이 남지 않는다.
        await authenticate(context, ["b", "c", "a"][index]);
        await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
        await expect(page.getByTestId("paragraph-source")).toHaveCount(0);
        await expect(page.getByTestId("prepared-prompt")).toHaveCount(0);
        await expect(page.getByText(answer, { exact: true })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "새 후보 준비", exact: true })).toBeEnabled();
        expect(calls()).toHaveLength(initialCalls + 2);
        await testInfo.attach("actual-stack-summary", { contentType: "application/json", body: Buffer.from(JSON.stringify({
            writingType, target, acquired: 1, generatedCalls: 2, provider: "synthetic", realDatabase: true,
            realBeHttp: true, originalKey: original.requestKey, repairKey: repaired.requestKey, planId: plan.dailySetId,
        })) });
    });
}

test("실제 브라우저 Provider 실패·새로고침은 자동 재호출하지 않는다", async ({ context, page }) => {
    test.setTimeout(60_000);
    // 준비: 소유 합성 경계의 다음 한 번만 실패시키며 제품 응답은 mock하지 않는다.
    await authenticate(context, "a");
    await page.goto("/ko/language-learning/writing/paragraph");
    await expect(page.getByTestId("writing-preparation-panel")).toBeVisible();
    const before = calls().length;
    fs.writeFileSync(path.join(runtimeDirectory, "fail-next-model-call"), "one explicit synthetic provider failure");
    await page.getByLabel("주제", { exact: true }).selectOption("home-task");

    // 실행·검증: 실패는 안내로 표시하고 같은 URL의 GET은 저장된 실패만 복원한다.
    const failed = await clickResponse<WritingPreparation>(page, "새 후보 준비", `${root}/preparations`);
    expect(failed.status).toBe("FAILED");
    expect(failed.candidate).toBeNull();
    expect(failed.quality.reasonCodes).toContain("PROVIDER_FAILED");
    await expect(page.getByText("모델 호출 과정에서 오류가 발생했습니다.", { exact: true })).toBeVisible();
    expect(calls()).toHaveLength(before + 1);
    await page.reload();
    await expect(page.getByText("모델 호출 과정에서 오류가 발생했습니다.", { exact: true })).toBeVisible();
    expect(calls()).toHaveLength(before + 1);
});

test("실제 저장 뒤 응답 유실 시 원래 문항 조회가 복구 키를 지우지 않는다", async ({ context, page }, testInfo) => {
    test.setTimeout(90_000);
    // 준비: 실제 서버 응답을 받은 뒤 브라우저 전달만 끊는다. 가짜 응답 본문은 주입하지 않는다.
    await authenticate(context, "a");
    await page.goto("/ko/language-learning/writing/paragraph");
    await expect(page.getByTestId("writing-preparation-panel")).toBeVisible();
    await page.getByRole("button", { name: "자유 작문", exact: true }).click();
    await page.getByLabel("준비할 단계", { exact: true }).selectOption("3");
    const before = calls().length;
    const original = await clickResponse<WritingPreparation>(page, "새 후보 준비", `${root}/preparations`);
    expect(original.status).toBe("SUCCEEDED");
    await ready(page);
    await page.getByRole("button", { name: "이 후보로 확보 가능 수 확인하기", exact: true }).click();
    await page.getByLabel("목표 문항 수", { exact: true }).fill("1");
    await clickResponse<ParagraphWritingPreview>(page, "확보 가능 문항 확인", `${root}/plans/preview`);
    await ready(page);
    const plan = await clickResponse<ParagraphWritingPlan>(page, "목표대로 시작", `${root}/plans`);
    const item = page.getByTestId(`paragraph-item-${plan.items[0].order}`);
    await ready(page);
    let resolveSaved: (value: WritingPreparation) => void = () => { throw new Error("Repair response waiter not initialized"); };
    const savedRepair = new Promise<WritingPreparation>((resolve) => { resolveSaved = resolve; });
    await page.route(`${root}/preparations`, async (route) => {
        const request = route.request().postDataJSON() as { repairOfRequestKey?: string };
        if (!request.repairOfRequestKey) return route.continue();
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        resolveSaved((await response.json() as { body: WritingPreparation }).body);
        await route.abort("failed");
    });

    // 실행: DB 저장은 완료했으나 화면에서는 실패한 요청의 키와 사용자 메모를 보존한다.
    const note = "조건을 바꾸지 말고 의미가 더 분명한 원문으로 다듬어 주세요.";
    await page.getByLabel("문제가 된 부분이나 원하는 개선점", { exact: true }).fill(note);
    await page.getByRole("button", { name: "사유를 보내 한 번 수정", exact: true }).click();
    const repair = await savedRepair;
    expect(repair.status).toBe("SUCCEEDED");
    await expect(page.getByText("요청에 실패했습니다. 정상 문항과 작성한 답안은 유지됩니다. 저장 내용을 확인한 뒤 다시 시도해 주세요.", { exact: true })).toBeVisible();
    await ready(page);
    await item.getByRole("button", { name: "품질 안내 및 다시 준비", exact: true }).click();
    expect(new URL(page.url()).searchParams.get("preparationKey")).toBe(repair.requestKey);
    await expect(page.getByRole("button", { name: "새 후보 준비", exact: true })).toBeDisabled();
    await expect(page.getByLabel("문제가 된 부분이나 원하는 개선점", { exact: true })).toHaveValue(note);
    await expect(item.getByTestId("paragraph-source")).toHaveText(original.candidate!.prompt);
    expect(await page.evaluate((key) => Object.values(sessionStorage).some((value) => value.includes(key)), repair.requestKey)).toBe(true);
    expect(calls()).toHaveLength(before + 2);

    // 검증: 저장 결과 GET으로 복구한 후 명시적 적용한다. 생성 요청 재전송이나 추가 호출은 없다.
    const recoveredResponse = page.waitForResponse((response) => response.url() === `${root}/preparations/${repair.requestKey}` && response.request().method() === "GET");
    await page.getByRole("button", { name: "저장 결과 확인", exact: true }).click();
    const recovered = await responseBody<WritingPreparation>(await recoveredResponse);
    expect(recovered).toEqual(repair);
    await ready(page);
    await clickResponse<ParagraphWritingPlan>(page, "이 미답안 문항에 적용", `${root}/plans/items/${plan.items[0].itemId}/replacement`);
    await expect(item.getByTestId("paragraph-source")).toHaveText(repair.candidate!.prompt);
    await page.reload();
    await expect(item.getByTestId("paragraph-source")).toHaveText(repair.candidate!.prompt);
    await expect(page.getByTestId("prepared-prompt")).toHaveText(repair.candidate!.prompt);
    expect(calls()).toHaveLength(before + 2);
    await testInfo.attach("fault-injection-provenance", { contentType: "application/json", body: Buffer.from(JSON.stringify({
        responseSource: "real BE HTTP and LL DB", injectedFault: "route.fetch completed, then route.abort before browser delivery",
        syntheticModel: true, generatedCalls: 2, recoveryGeneratedCalls: 0,
    })) });
});
