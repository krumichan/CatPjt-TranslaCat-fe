import { expect, test } from "../fixtures/mock-test";
import { mockParagraphWriting, paragraphPlan } from "../support/paragraph-writing-mocks";

test.beforeEach(() => {
    if (process.env.WRITING_PARAGRAPH_QA !== "true") throw new Error("Paragraph mock UI requires an explicitly enabled isolated QA runtime.");
});

for (const count of [1, 2, 3, 5, 10, 20, 30, 50, 100]) {
    test(`PARAGRAPH N=${count}: preview, explicit start and page size are independent`, async ({ page }) => {
        // 준비
        const state = await mockParagraphWriting(page);
        await page.goto("/ko/language-learning/writing/paragraph");

        // 실행
        await page.getByLabel("목표 문항 수", { exact: true }).fill(String(count));
        await page.getByRole("button", { name: "확보 가능 문항 확인" }).click();
        expect(state.starts).toBe(0);
        await page.getByRole("button", { name: "목표대로 시작" }).click();

        // 검증
        await expect(page.getByTestId("paragraph-targetCount")).toHaveText(String(count));
        await expect(page.getByTestId("paragraph-acquiredCount")).toHaveText(String(count));
        await expect(page.locator("article[data-testid^='paragraph-item-']")).toHaveCount(Math.min(count, 10));
        for (let index = 1; index < Math.ceil(count / 10); index++) await page.getByRole("button", { name: "다음 문항" }).click();
        await expect(page.getByTestId(`paragraph-item-${count}`)).toBeVisible();
        await page.getByRole("button", { name: "저장된 계획 새로고침" }).click();
        await page.reload();
        await expect(page.getByTestId("paragraph-targetCount")).toHaveText(String(count));
        expect(state.starts).toBe(1);
        expect(state.answers).toBe(0);
        expect(state.legacy).toBe(0);
    });
}

for (const [type, label] of [["TRANSLATION", "번역 작문"], ["GUIDED", "가이드 작문"], ["FREE", "자유 작문"]] as const) {
    test(`PARAGRAPH ${type}: multiline answer/reference/history without score or automatic writes`, async ({ page }, testInfo) => {
        // 준비
        const state = await mockParagraphWriting(page);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("/ko/language-learning/writing/paragraph");
        await page.getByRole("button", { name: label, exact: true }).click();
        await page.getByLabel("목표 문항 수", { exact: true }).fill("1");
        await page.getByRole("button", { name: "확보 가능 문항 확인" }).click();
        await page.getByRole("button", { name: "목표대로 시작" }).click();
        await expect(page.getByRole("region", { name: "참고 답안과 체크리스트" })).toHaveCount(0);
        await expect(page.getByTestId("paragraph-source")).toHaveCSS("white-space", "pre-wrap");
        await page.getByLabel("확보된 문항의 분량 미리보기").check();
        await expect(page.getByText(`안내 원문 ${state.stored!.items[0].originText.length}자`, { exact: true })).toBeVisible();
        await expect(page.getByText("예상 답안 분량 미산정", { exact: true })).toBeVisible();
        const answer = "A first paragraph with enough detail.\n\nA second paragraph with a different idea.";

        // 실행
        await page.getByLabel("나의 답안", { exact: true }).fill(answer);
        await page.getByRole("button", { name: "답안 저장 후 참고 보기" }).click();
        await expect(page.getByRole("region", { name: "참고 답안과 체크리스트" })).toBeVisible();
        await page.reload();
        await page.getByRole("button", { name: "저장 기록 열기" }).click();

        // 검증
        await expect(page.getByRole("region", { name: "저장된 답안" })).toContainText(answer);
        await expect(page.getByTestId("paragraph-submittedCount")).toHaveText("1");
        await expect(page.getByTestId("paragraph-feedbackCount")).toHaveText("0");
        await expect(page.getByTestId("paragraph-progress")).toContainText("참고 학습 제출 완료");
        expect(state.writes.find((entry) => entry.path.endsWith("/answers"))?.body).toEqual({ answer, contentRevision: "revision-0" });
        expect(state.starts).toBe(1);
        expect(state.answers).toBe(1);
        expect(state.legacy).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath("paragraph-mobile.png"), fullPage: true });
    });
}

test("PARAGRAPH shortage 27/30 is explicit, restoration preserves acquired items", async ({ page }) => {
    const state = await mockParagraphWriting(page, { available: 27 });
    await page.goto("/ko/language-learning/writing/paragraph");
    await page.getByLabel("목표 문항 수", { exact: true }).fill("30");
    await page.getByRole("button", { name: "확보 가능 문항 확인" }).click();
    await expect(page.getByText("목표 30개 · 확보 가능 27개 · 부족 3개")).toBeVisible();
    expect(state.starts).toBe(0);
    await page.getByRole("button", { name: "부족 수를 남기고 확보분으로 시작" }).click();
    await expect(page.getByTestId("paragraph-remainingCount")).toHaveText("3");
    const original = structuredClone(state.stored!.items);
    expect(state.writes.find((entry) => entry.path === "")?.body.allowPartial).toBe(true);
    await page.getByRole("button", { name: "부족 문항만 다시 확보" }).click();
    await expect(page.getByTestId("paragraph-remainingCount")).toHaveText("0");
    expect(state.stored!.items.slice(0, 27)).toEqual(original);
    expect(state.restores).toBe(1);
    expect(state.writes.find((entry) => entry.path.endsWith("/restore"))?.body).toEqual({ planRevision: 1 });
});

test("PARAGRAPH expansion retains answered text/revision; bounds never submit invalid N", async ({ page }) => {
    const state = await mockParagraphWriting(page);
    await page.goto("/ko/language-learning/writing/paragraph");
    for (const invalid of ["0", "-1", "2.5", "101", "9007199254740992", "text"]) {
        await page.getByLabel("목표 문항 수", { exact: true }).fill(invalid);
        await expect(page.getByRole("button", { name: "확보 가능 문항 확인" })).toBeDisabled();
    }
    expect(state.writes).toHaveLength(0);
    await page.getByLabel("목표 문항 수", { exact: true }).fill("10");
    await page.getByRole("button", { name: "확보 가능 문항 확인" }).click();
    await page.getByRole("button", { name: "목표대로 시작" }).click();
    await page.getByLabel("나의 답안", { exact: true }).first().fill("Preserved answer.\n\nSecond paragraph.");
    await page.getByRole("button", { name: "답안 저장 후 참고 보기" }).first().click();
    await expect(page.getByTestId("paragraph-submittedCount")).toHaveText("1");
    const original = structuredClone(state.stored!.items);
    await page.getByLabel("목표 문항 수", { exact: true }).fill("30");
    await page.getByRole("button", { name: "목표 확대", exact: true }).click();
    await expect(page.getByTestId("paragraph-targetCount")).toHaveText("30");
    expect(state.stored!.items.slice(0, 10)).toEqual(original);
    expect(state.writes.find((entry) => entry.path.endsWith("/target"))?.body).toEqual({ targetItemCount: 30, planRevision: 1 });
});

for (const failure of [409, 503]) {
    test(`PARAGRAPH ${failure} preserves multiline draft and never automatically retries`, async ({ page }) => {
        const state = await mockParagraphWriting(page, { submitFailure: failure });
        await page.goto("/ko/language-learning/writing/paragraph");
        await page.getByRole("button", { name: "확보 가능 문항 확인" }).click();
        await page.getByRole("button", { name: "목표대로 시작" }).click();
        const answer = "Draft before failure.\n\nPreserve this paragraph.";
        await page.getByLabel("나의 답안", { exact: true }).first().fill(answer);
        await page.getByRole("button", { name: "답안 저장 후 참고 보기" }).first().click();
        await expect(page.getByTestId("paragraph-writing-page").getByRole("alert")).toContainText(failure === 409 ? "문항 또는 계획이 변경" : "요청에 실패");
        await expect(page.getByLabel("나의 답안", { exact: true }).first()).toHaveValue(answer);
        await page.reload();
        await expect(page.getByLabel("나의 답안", { exact: true }).first()).toHaveValue(answer);
        expect(state.answers).toBe(1);
        expect(state.starts).toBe(1);
    });
}

test("PARAGRAPH leaked pre-answer reference fails closed", async ({ page }) => {
    await mockParagraphWriting(page, { leak: true });
    await page.goto("/ko/language-learning/writing/paragraph");
    await page.getByRole("button", { name: "확보 가능 문항 확인" }).click();
    await page.getByRole("button", { name: "목표대로 시작" }).click();
    await expect(page.getByTestId("paragraph-writing-page").getByRole("alert")).toContainText("공개 조건을 확인할 수 없어");
    await expect(page.getByTestId("paragraph-progress")).toHaveCount(0);
    await expect(page.getByText("HIDDEN-ANSWER")).toHaveCount(0);
});

test("PARAGRAPH deleted or foreign saved plan clears displayed source after a denied read", async ({ page }) => {
    // 준비
    const state = await mockParagraphWriting(page);
    await page.goto("/ko/language-learning/writing/paragraph");
    await page.getByRole("button", { name: "확보 가능 문항 확인" }).click();
    await page.getByRole("button", { name: "목표대로 시작" }).click();
    await expect(page.getByTestId("paragraph-item-1")).toBeVisible();

    // 실행 / 검증
    state.readStatus = 404;
    await page.getByRole("button", { name: "저장된 계획 새로고침" }).click();
    await expect(page.getByTestId("paragraph-writing-page").getByRole("alert")).toBeVisible();
    await expect(page.getByTestId("paragraph-progress")).toHaveCount(0);
    await expect(page.getByTestId("paragraph-source")).toHaveCount(0);
    expect(state.starts).toBe(1);
    expect(state.answers).toBe(0);
});

for (const policy of ["curated-writing-feedback-v6", "curated-writing-feedback-v7"] as const) {
test(`PARAGRAPH ${policy}: partial absence has no invented quote while grounded correction remains visible`, async ({ page }, testInfo) => {
    // 준비: 실제로 있는 시각과 없는 이유를 분리한 저장 결과만 합성한다. 모델 품질 검증은 아니다.
    const state = await mockParagraphWriting(page);
    const plan = paragraphPlan(1);
    Object.assign(plan, { status: "COMPLETED", learningLanguage: "ja", personalizedFeedbackStatus: "ACTIVE_QA", submittedItemCount: 1, feedbackCompletedItemCount: 1 });
    const item = plan.items[0];
    item.answered = true;
    item.canSubmit = false;
    item.taskRequirements = ["시각과 이유 전달"];
    item.reference = { checklist: ["시각과 이유 전달"], referenceAnswers: ["参考文"], alternativeNote: "다른 표현도 가능합니다.", isOnlyCorrectAnswer: false };
    const answer = "午前九時に始まります。";
    item.attempts = [{ answerId: 19001, attemptDate: plan.learningDate, answer, submittedAt: "2026-10-04T00:00:00Z", resultPolicy: "REFERENCE_ONLY", evaluation: null,
        feedback: { status: "SUCCEEDED", failureCode: null, canRetry: false, result: {
            policyVersion: policy, resultPolicy: "REFERENCE_ONLY",
            observations: [{ requirementId: "C1", status: "UNMET", evidenceKind: "LEARNER_TEXT", segmentIds: ["S1"], answerQuotes: [answer],
                originText: "시각은 있지만 이유 전달 요소가 없습니다.", learningText: "時刻はありますが、理由の説明がありません。",
                relationChecks: { causality: "NOT_APPLICABLE", chronology: "PRESERVED", specificity: "PRESERVED", stance: "NOT_APPLICABLE" },
                requirementParts: [{ requirementQuote: "시각과 ", status: "PRESENT", evidence: [{ segmentId: "S1", quote: answer }], taskFactIds: ["T1"] },
                    { requirementQuote: "이유 전달", status: "ABSENT", evidence: [], taskFactIds: [] }] }],
            necessaryCorrections: [{ requirementId: "C1", segmentId: "S1", original: answer, replacement: "午前九時に始まりました。",
                patch: { original: "始まります", replacement: "始まりました" }, issueType: "LANGUAGE_FORM", sourceFactId: "", formReason: "INFLECTION",
                originText: "활용형을 확인하세요.", learningText: "活用を確認してください。" }], optionalAlternatives: [], uncertainties: [],
        } } }];
    state.stored = plan;
    await page.setViewportSize({ width: 390, height: 844 });

    // 실행: 실제 페이지에서 저장 결과를 열고 다시 읽는다.
    await page.goto(`/ko/language-learning/writing/paragraph?planId=${plan.dailySetId}`);
    const panel = page.getByTestId("paragraph-feedback-19001");
    const present = panel.getByTestId("paragraph-part-C1-1");
    const absent = panel.getByTestId("paragraph-part-C1-2");

    // 검증: 없는 요소에는 인용이 없고 실제 요소에만 근거가 붙는다. 교정은 실제 구간에 남는다.
    await expect(present.getByTestId("paragraph-part-status")).toHaveText("답안에 있음");
    await expect(present.locator("blockquote")).toHaveText(answer);
    await expect(absent.getByTestId("paragraph-part-status")).toHaveText("답안에 없음");
    await expect(absent.getByTestId("paragraph-part-requirement")).toHaveText("이유 전달");
    await expect(absent.getByTestId("paragraph-part-missing")).toHaveText("이 요구 요소에 해당하는 내용이 답안에 없습니다.");
    await expect(absent.locator("blockquote")).toHaveCount(0);
    await expect(panel.getByText(`${answer} → 午前九時に始まりました。`, { exact: true })).toBeVisible();
    await page.reload();
    await expect(absent.locator("blockquote")).toHaveCount(0);
    await expect(present.locator("blockquote")).toHaveText(answer);
    expect(state.writes).toEqual([]);
    expect(state.answers).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await panel.scrollIntoViewIfNeeded();
    await panel.screenshot({ path: testInfo.outputPath("structured-feedback-panel.png") });
    await page.screenshot({ path: testInfo.outputPath("structured-partial-absence.png"), fullPage: true });
});
}

