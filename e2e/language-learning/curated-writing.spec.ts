import { expect, installMockAuthCookie, test } from "../fixtures/mock-test";
import { fulfillApiJson, fulfillJson } from "../support/api-mocks";
import { mockLanguageLearningBase } from "../support/language-learning-mocks";
import { responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const kinds = ["TRANSLATION", "GUIDED", "FREE"] as const;

test("세 유형의 QA 문항·답변·참고·기록은 브라우저에서 점수/생성 없이 이어진다", async ({ page }) => {
    if (process.env.NEXT_PUBLIC_WRITING_CURATED_QA !== "true") {
        throw new Error("Curated Writing browser QA must run with explicit QA flag");
    }
    await mockLanguageLearningBase(page);
    let createCalls = 0;
    let answerCalls = 0;
    let legacyCalls = 0;
    let stored: ReturnType<typeof setFor> | null = null;
    let failOnce = true;
    await page.route("**/api/v1/language-learning/writing/daily**", async (route) => {
        legacyCalls++;
        await route.fulfill({ status: 500 });
    });
    await page.route("**/api/v1/language-learning/writing/curated/**", async (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        if (path.endsWith("/sets") && route.request().method() === "POST") {
            createCalls++;
            const body = route.request().postDataJSON() as { writingType: typeof kinds[number] };
            stored = stored?.writingType === body.writingType ? stored : setFor(body.writingType);
            await fulfillApiJson(route, responseDto(stored));
            return;
        }
        if (path.endsWith("/answers") && route.request().method() === "POST") {
            answerCalls++;
            if (failOnce) {
                failOnce = false;
                await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify(responseDto(null, 503, "retry")) });
                return;
            }
            const body = route.request().postDataJSON() as { answer: string; contentRevision: string };
            expect(body.contentRevision).toBe("f".repeat(64));
            stored!.items[0].answered = true;
            stored!.items[0].canSubmit = false;
            stored!.items[0].attempts = [{ answerId: -901, attemptDate: "2026-10-04", answer: body.answer,
                submittedAt: "2026-10-04T03:00:00", resultPolicy: "REFERENCE_ONLY", evaluation: null }];
            stored!.items[0].reference = { checklist: ["의미 전달"], referenceAnswers: ["参考例です。"],
                alternativeNote: "다른 표현도 가능합니다.", isOnlyCorrectAnswer: false };
            await fulfillApiJson(route, responseDto(stored));
            return;
        }
        if (path.includes("/history/")) {
            await fulfillApiJson(route, responseDto(stored));
            return;
        }
        if (route.request().method() === "GET") {
            await fulfillApiJson(route, responseDto(stored));
            return;
        }
        await route.fulfill({ status: 404 });
    });

    await page.goto("/ko/language-learning/writing");
    await expect(page.getByTestId("curated-writing-page")).toBeVisible();
    for (const [index, kind] of kinds.entries()) {
        if (index) await page.getByRole("button", { name: { GUIDED: "가이드 작문", FREE: "자유 작문" }[kind as "GUIDED" | "FREE"] }).click();
        await page.getByRole("button", { name: "오늘 문항 열기" }).click();
        await expect(page.getByTestId("curated-writing-set")).toBeVisible();
        await expect(page.locator("[data-testid^='curated-writing-item-']")).toHaveCount(5);
        await expect(page.getByText("参考例です。")).toHaveCount(0);
        if (index === 0) {
            const answer = page.locator("#curated-answer--201");
            await answer.fill("私の回答です。");
            await page.getByRole("button", { name: "답변 저장" }).first().click();
            await expect(page.getByText("요청에 실패했습니다. 작성한 답변은 유지됩니다.")).toBeVisible();
            await expect(answer).toHaveValue("私の回答です。");
            await page.getByRole("button", { name: "답변 저장" }).first().click();
            await expect(page.getByText("参考例です。")).toBeVisible();
            await page.reload();
            await page.getByRole("button", { name: "오늘 문항 열기" }).click();
            await expect(page.getByText("参考例です。")).toBeVisible();
            await page.getByLabel("지난 기록 날짜").fill("2026-10-04");
            await page.getByRole("button", { name: "기록 보기" }).click();
            await expect(page.getByText("私の回答です。")).toBeVisible();
        }
    }
    expect(createCalls).toBe(4);
    expect(answerCalls).toBe(2);
    expect(legacyCalls).toBe(0);
});

test("로그인 계정 전환 뒤 이전 소유자의 문항과 초안을 지우고 새 요청을 새 로그인에 묶는다", async ({ page, context }) => {
    if (process.env.NEXT_PUBLIC_WRITING_CURATED_QA !== "true") throw new Error("Curated Writing browser QA requires QA flag");
    await mockLanguageLearningBase(page);
    let user = TEST_USERS.A;
    let loginSessionId = "curated-owner-a";
    await installMockAuthCookie(context, "USER", { user, loginSessionId });
    await page.route("**/api/auth/session", (route) => fulfillJson(route, {
        loginSessionId,
        user: { name: user.nickname, email: user.email, publicId: user.publicId,
            role: "USER", accessTokenExpires: Date.now() + 3_600_000 },
        accessToken: `mock-access-token-${user.key}`,
        expires: new Date(Date.now() + 3_600_000).toISOString(),
    }));
    const actors: string[] = [];
    await page.route("**/api/v1/language-learning/writing/curated/sets", async (route) => {
        actors.push(route.request().headers().authorization ?? "");
        await fulfillApiJson(route, responseDto({ ...setFor("TRANSLATION"),
            items: setFor("TRANSLATION").items.map((item) => ({ ...item, originText: `${user.key} 소유 문항 ${item.order}` })) }));
    });

    await page.goto("/ko/language-learning/writing");
    await page.getByRole("button", { name: "오늘 문항 열기" }).click();
    await expect(page.getByText("A 소유 문항 1")).toBeVisible();
    await page.locator("#curated-answer--201").fill("A의 저장 전 초안");

    user = TEST_USERS.B;
    loginSessionId = "curated-owner-b";
    await installMockAuthCookie(context, "USER", { user, loginSessionId });
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(page.getByText("A 소유 문항 1")).toHaveCount(0);
    await expect(page.locator("#curated-answer--201")).toHaveCount(0);
    await page.getByRole("button", { name: "오늘 문항 열기" }).click();
    await expect(page.getByText("B 소유 문항 1")).toBeVisible();
    await expect(page.locator("#curated-answer--201")).toHaveValue("");
    expect(actors).toEqual(["Bearer mock-access-token-A", "Bearer mock-access-token-B"]);
});

function setFor(writingType: typeof kinds[number]) {
    return {
        dailySetId: -101, learningDate: "2026-10-04", writingType,
        policyVersion: "curated-writing-v1" as const, resultPolicy: "REFERENCE_ONLY" as const,
        releaseId: "qa", originLanguage: "ko", learningLanguage: "ja", baseBand: 3,
        status: "READY" as const, sentenceCount: 5 as const, generatedItemCount: 5 as const,
        replacementCount: 0, rePractice: false, reviewAvailable: true,
        personalizedFeedbackStatus: "DISABLED_PENDING_QUALITY_GATE" as const,
        items: Array.from({ length: 5 }, (_, index) => ({
            itemId: -201-index, order: index+1, difficulty: index === 0 ? "REVIEW" : index === 4 ? "CHALLENGE" : "NORMAL",
            targetBand: index === 0 ? 2 : index === 4 ? 4 : 3,
            catalogId: `qa-${index}`, catalogVersion: 1, contentRevision: "f".repeat(64),
            originText: `문항 ${index+1}`, providedFacts: [], requiredIntents: [], responseConstraints: [], topicKey: "qa",
            answered: false, canSubmit: true, attempts: [] as Array<{answerId: number; attemptDate: string; answer: string;
                submittedAt: string; resultPolicy: "REFERENCE_ONLY"; evaluation: null}>,
            reference: undefined as undefined | {checklist: string[]; referenceAnswers: string[]; alternativeNote: string; isOnlyCorrectAnswer: false},
        })),
    };
}
