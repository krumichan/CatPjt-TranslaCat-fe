import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/mock-test";
import { fulfillApiJson } from "../support/api-mocks";
import { LANGUAGE_LEARNING_DAILY_SET, LANGUAGE_LEARNING_EVALUATION, mockLanguageLearningBase } from "../support/language-learning-mocks";
import { responseDto } from "../support/mock-data";

type Submission = { itemId: number; answer: string; contentRevision?: string; status: number };

async function prepareRevisionServer(page: Page, legacy = false) {
    await mockLanguageLearningBase(page);
    let revision = "original";
    const submissions: Submission[] = [];
    const accepted = new Map<number, string>();
    const revisionFor = (itemId: number) => `${revision}-${itemId}`;
    const dailySet = () => ({
        ...LANGUAGE_LEARNING_DAILY_SET,
        status: accepted.size === 5 ? "COMPLETED" : "READY",
        reviewAvailable: true,
        items: LANGUAGE_LEARNING_DAILY_SET.items.map((item) => ({
            ...item,
            originText: `${revision} 문항 ${item.order}`,
            ...(legacy ? {} : { contentRevision: revisionFor(item.itemId) }),
            answered: accepted.has(item.itemId),
            answeredToday: accepted.has(item.itemId),
            canSubmit: !accepted.has(item.itemId),
            attempts: accepted.has(item.itemId) ? [{
                answerId: 9000 + item.itemId,
                attemptDate: LANGUAGE_LEARNING_DAILY_SET.learningDate,
                answer: accepted.get(item.itemId),
                submittedAt: `${LANGUAGE_LEARNING_DAILY_SET.learningDate}T12:00:00`,
                evaluationStatus: "SUCCESS",
                evaluationFailureMessage: null,
                evaluation: LANGUAGE_LEARNING_EVALUATION,
            }] : [],
        })),
    });
    await page.route("**/api/v1/language-learning/writing/daily?**", (route) => fulfillApiJson(route, responseDto(dailySet())));
    await page.route("**/api/v1/language-learning/history?**", (route) => fulfillApiJson(route, responseDto([{
        activityId: "WRITING:101", source: "WRITING", learningDate: LANGUAGE_LEARNING_DAILY_SET.learningDate,
        title: "Daily Writing · TRANSLATION", topic: "TRANSLATION", durationSeconds: 0,
        overallScore: null, completionStatus: "READY", evaluationStatus: null,
    }])));
    await page.route("**/api/v1/language-learning/history/evidence?**", (route) => fulfillApiJson(route, responseDto({ items: [], nextCursor: null })));
    await page.route("**/api/v1/language-learning/history/WRITING%3A101", (route) => fulfillApiJson(route, responseDto({
        activityId: "WRITING:101", source: "WRITING", detail: dailySet(),
    })));
    await page.route("**/api/v1/language-learning/writing/daily/items/*/answers", (route) => {
        const itemId = Number(route.request().url().match(/items\/(-?\d+)\/answers/)?.[1]);
        const body = route.request().postDataJSON() as { answer: string; contentRevision?: string };
        // 기존 서버 계약: revision이 전달된 경우만 비교하므로 FE 누락을 성공으로 숨기지 않는 대조가 필요하다.
        const stale = Boolean(body.contentRevision && body.contentRevision !== revisionFor(itemId));
        const status = stale ? 400 : 200;
        submissions.push({ itemId, ...body, status });
        if (stale) return fulfillApiJson(route, {
            resultCode: 400, message: "문제가 재생성되었습니다. 최신 문제를 확인한 뒤 다시 제출해주세요.",
            body: { errorCode: "LANGUAGE_LEARNING_WRITING_ITEM_STALE" },
        }, status);
        accepted.set(itemId, body.answer);
        return fulfillApiJson(route, responseDto({
            answerId: 9000 + itemId, itemId, attemptDate: LANGUAGE_LEARNING_DAILY_SET.learningDate,
            evaluationStatus: "SUCCESS", evaluationFailureMessage: null, evaluation: LANGUAGE_LEARNING_EVALUATION,
        }));
    });
    return { submissions, accepted, regenerateElsewhere: () => { revision = "regenerated"; } };
}

for (const mode of ["single", "bulk", "history"] as const) {
    test(`LL-WRITING-REVISION-${mode} stale displayed content is rejected before evaluation`, async ({ page }) => {
        // 준비: 화면은 원본 revision을 보지만 다른 클라이언트가 같은 ID의 내용을 재생성한다.
        const server = await prepareRevisionServer(page);
        const isHistory = mode === "history";
        await page.goto(isHistory ? "/ko/language-learning/history" : "/ko/language-learning/writing");
        if (!isHistory) await page.getByTestId("daily-writing-type-translation").getByRole("button").click();
        const screen = page.getByTestId(isHistory ? "writing-history-detail" : "daily-writing-page");
        await expect(screen.locator("textarea")).toHaveCount(5);
        await expect(screen).toContainText("original 문항 1");
        const filledCount = mode === "bulk" ? 5 : 1;
        for (let index = 0; index < filledCount; index += 1) await screen.locator("textarea").nth(index).fill(`Original answer ${index + 1}`);
        server.regenerateElsewhere();

        // 실행: 화면에 실제로 표시된 revision으로 제출한다. 최신 revision을 임의 재조회하여 붙이지 않는다.
        const received = page.waitForResponse((response) => response.url().includes("/answers") && response.request().method() === "POST");
        if (mode === "bulk") await page.getByTestId("daily-writing-bulk-evaluation").getByRole("button").click();
        else await screen.locator("article").first().getByRole("button").click();
        const response = await received;

        // 검증: 거부된 첫 답안을 자동 재전송하거나 일괄 나머지 답안을 접수하지 않는다.
        const firstItemId = LANGUAGE_LEARNING_DAILY_SET.items[0].itemId;
        expect(server.submissions[0].contentRevision).toBe(`original-${firstItemId}`);
        expect(response.status()).toBe(400);
        await expect(screen.getByRole("alert").first()).toBeVisible();
        expect(server.submissions).toHaveLength(1);
        expect(server.accepted.size).toBe(0);
        await expect(screen.getByRole("list", { name: "추천 답안" })).toHaveCount(0);
    });
}

test("LL-WRITING-REVISION-current bulk sends each displayed revision and keeps successful evaluation", async ({ page }) => {
    // 준비: 최신 조회의 문항별 revision은 서로 다르다.
    const server = await prepareRevisionServer(page);
    server.regenerateElsewhere();
    await page.goto("/ko/language-learning/writing");
    await page.getByTestId("daily-writing-type-translation").getByRole("button").click();
    const screen = page.getByTestId("daily-writing-page");
    await expect(screen.locator("textarea")).toHaveCount(5);

    // 실행
    for (let index = 0; index < 5; index += 1) await screen.locator("textarea").nth(index).fill(`Current answer ${index + 1}`);
    await page.getByTestId("daily-writing-bulk-evaluation").getByRole("button").click();

    // 검증: 동일한 세트 값 하나가 아니라 각 item의 revision을 전달한다.
    await expect(screen.getByRole("list", { name: "추천 답안" })).toHaveCount(5);
    expect(server.submissions).toHaveLength(5);
    expect(server.submissions.map((entry) => entry.contentRevision)).toEqual(
        LANGUAGE_LEARNING_DAILY_SET.items.map((item) => `regenerated-${item.itemId}`),
    );
    expect(server.submissions.every((entry) => entry.status === 200)).toBe(true);
});

test("LL-WRITING-REVISION-legacy response without revision keeps the existing optional contract", async ({ page }) => {
    // 준비: 이전 API 응답에는 revision이 없다. 빈 값이나 임의 revision을 새로 만들지 않는다.
    const server = await prepareRevisionServer(page, true);
    await page.goto("/ko/language-learning/writing");
    await page.getByTestId("daily-writing-type-translation").getByRole("button").click();
    const screen = page.getByTestId("daily-writing-page");
    await expect(screen.locator("textarea")).toHaveCount(5);

    // 실행
    await screen.locator("textarea").first().fill("A legacy answer.");
    await screen.locator("article").first().getByRole("button").click();

    // 검증
    await expect(screen.getByRole("list", { name: "추천 답안" })).toHaveCount(1);
    expect(server.submissions).toHaveLength(1);
    expect(server.submissions[0].contentRevision).toBeUndefined();
    expect(server.accepted.size).toBe(1);
});
