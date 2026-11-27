import { expect, test } from "../fixtures/mock-test";
import { fulfillApiJson } from "../support/api-mocks";
import { mockLanguageLearningBase } from "../support/language-learning-mocks";
import { mockLanguageLearningLevelTest } from "../support/language-learning-level-test-mocks";
import { errorDto, responseDto } from "../support/mock-data";

for (const [band, score, proficiency] of [
    ["B1", 20, "FOUNDATION"],
    ["B2", 47, "BASIC"],
    ["B3", 62, "INTERMEDIATE"],
] as const) {
    test(`LL-SELF-${band} 선택 후 결과·새로고침·이력이 같은 초기 점수를 표시한다`, async ({ page }) => {
        // 준비: 인증·앱은 실제 브라우저에서 실행하고 API 응답만 격리한다.
        await mockLanguageLearningBase(page);
        await mockLanguageLearningLevelTest(page);
        let selected = false;
        let selections = 0;
        let testsStarted = 0;
        const openedSessionId = band === "B3" ? 3198 : null;
        let abandonedQuestionRequests = 0;
        const summary = {
            sessionId: 3199, sessionType: "SELF_SELECTED", overallScore: score, proficiencyBand: proficiency,
            domainScores: { vocabulary: score, grammar: score, reading: score, listening: score, writing: score, speaking: score },
            completedAt: "2026-11-25T10:00:00", originLanguage: "ko", learningLanguage: "ja",
        };
        await page.route("**/api/v1/language-learning/level-test/status", (route) => fulfillApiJson(route, responseDto({
            profileState: selected ? "CALIBRATING" : "LEVEL_TEST_REQUIRED", initialLevelTestCompleted: selected,
            recheckRecommended: false, activeSessionId: selected ? null : openedSessionId,
            currentQuestionNumber: !selected && openedSessionId != null ? 1 : null,
            baseLevelScore: selected ? score : null, proficiencyBand: selected ? proficiency : null,
            selfSelectionAvailable: !selected,
        })));
        await page.route("**/api/v1/language-learning/level-test/history", (route) =>
            fulfillApiJson(route, responseDto(selected ? [summary] : [])));
        await page.route("**/api/v1/language-learning/level-test/self-selection", (route) => {
            const body = route.request().postDataJSON();
            expect(Object.keys(body).sort()).toEqual(["band", "idempotencyKey"]);
            expect(body.band).toBe(band);
            expect(body.idempotencyKey).toBeTruthy();
            selected = true;
            selections += 1;
            return fulfillApiJson(route, responseDto({
                sessionId: 3199, sessionType: "SELF_SELECTED", status: "COMPLETED", totalQuestions: 0,
                currentQuestionNumber: 0, currentComplexityBand: Number(band.slice(1)), baseLevelScore: score,
                proficiencyBand: proficiency, startedAt: summary.completedAt, completedAt: summary.completedAt,
            }));
        });
        await page.route("**/api/v1/language-learning/level-test/sessions", (route) => {
            testsStarted += 1;
            return fulfillApiJson(route, errorDto("UNEXPECTED_TEST", "No test should be started"), 400);
        });
        await page.route("**/api/v1/language-learning/level-test/sessions/3199/result", (route) =>
            fulfillApiJson(route, responseDto({ ...summary, recommendedDifficulty: "MY_LEVEL" })));
        await page.route("**/api/v1/language-learning/level-test/history/3199", (route) =>
            fulfillApiJson(route, responseDto({ summary, items: [] })));
        if (openedSessionId != null) {
            await page.route(`**/api/v1/language-learning/level-test/sessions/${openedSessionId}`, (route) =>
                fulfillApiJson(route, responseDto({
                    sessionId: openedSessionId, sessionType: "INITIAL", status: selected ? "ABANDONED" : "IN_PROGRESS",
                    totalQuestions: 20, currentQuestionNumber: 1, currentComplexityBand: 2,
                    baseLevelScore: null, proficiencyBand: null, startedAt: summary.completedAt, completedAt: null,
                })));
            await page.route(`**/api/v1/language-learning/level-test/sessions/${openedSessionId}/current-item`, (route) => {
                abandonedQuestionRequests += 1;
                return fulfillApiJson(route, errorDto("UNEXPECTED_QUESTION", "The abandoned test must stay closed"), 409);
            });
        }

        // 실행: 선택 전에는 저장할 수 없고 B1~B3 중 하나를 명시적으로 고른다.
        await page.goto("/language-learning/level-test");
        const submit = page.getByRole("button", { name: "선택한 레벨로 시작", exact: true });
        await expect(submit).toBeDisabled();
        await expect(page.getByRole("radio")).toHaveCount(3);
        if (openedSessionId != null) {
            await expect(page.getByRole("button", { name: "진행 중 테스트 이어하기" })).toBeVisible();
        }
        await page.getByRole("radio", { name: new RegExp(`^${band}`) }).check();
        await submit.click();

        // 검증: 조회·새로고침·이력 이동은 초기화나 시험 시작을 재실행하지 않는다.
        await expect(page).toHaveURL(/level-test\/result\/3199/);
        await expect(page.getByText("직접 선택한 초기 레벨", { exact: true })).toBeVisible();
        await expect(page.getByText("실제 시험으로 측정한 점수가 아닌 초기값입니다.", { exact: false })).toBeVisible();
        await expect(page.getByText(String(score), { exact: true })).toHaveCount(7);
        await page.reload();
        await expect(page.getByText("직접 선택한 초기 레벨", { exact: true })).toBeVisible();
        await page.goto("/language-learning/level-test/history/3199");
        await expect(page.getByText("직접 선택한 초기 레벨", { exact: true }).first()).toBeVisible();
        await page.goto(openedSessionId == null
            ? "/language-learning/level-test"
            : `/language-learning/level-test/session/${openedSessionId}`);
        await expect(page).toHaveURL(/\/level-test$/);
        await expect(page.getByRole("button", { name: "선택한 레벨로 시작", exact: true })).toHaveCount(0);
        expect(selections).toBe(1);
        expect(testsStarted).toBe(0);
        expect(abandonedQuestionRequests).toBe(0);
    });
}

test("LL-SELF-ANSWERED 첫 답안이 이미 저장된 시험에서는 재개만 제공한다", async ({ page }) => {
    // 준비: 평가 실패로 첫 문항에 머물러도 서버가 직접 선택을 금지한다.
    await mockLanguageLearningBase(page);
    await mockLanguageLearningLevelTest(page);
    await page.route("**/api/v1/language-learning/level-test/status", (route) => fulfillApiJson(route, responseDto({
        profileState: "LEVEL_TEST_REQUIRED", initialLevelTestCompleted: false, recheckRecommended: false,
        activeSessionId: 3198, currentQuestionNumber: 1, baseLevelScore: null, proficiencyBand: null,
        selfSelectionAvailable: false,
    })));

    // 실행 및 검증: 재개는 가능하며 B1~B3 선택은 나타나지 않는다.
    await page.goto("/language-learning/level-test");
    await expect(page.getByRole("button", { name: "진행 중 테스트 이어하기" })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
});

test("LL-SELF-RETRY 저장 실패 후 같은 선택은 같은 키로 재시도한다", async ({ page }) => {
    // 준비: 첫 통신만 실패하고 두 번째는 같은 요청을 받았는지 확인한다.
    await mockLanguageLearningBase(page);
    await mockLanguageLearningLevelTest(page);
    await page.route("**/api/v1/language-learning/level-test/status", (route) => fulfillApiJson(route, responseDto({
        profileState: "LEVEL_TEST_REQUIRED", initialLevelTestCompleted: false, recheckRecommended: false,
        activeSessionId: null, currentQuestionNumber: null, baseLevelScore: null, proficiencyBand: null,
    })));
    const bodies: unknown[] = [];
    await page.route("**/api/v1/language-learning/level-test/self-selection", (route) => {
        bodies.push(route.request().postDataJSON());
        return fulfillApiJson(route, errorDto("LL_LEVEL_SERVICE_UNAVAILABLE", "unavailable"), 503);
    });

    // 실행: 사용자 재시도만 요청을 보내며 실패를 성공으로 처리하지 않는다.
    await page.goto("/language-learning/level-test");
    await page.getByRole("radio", { name: /^B2/ }).check();
    const submit = page.getByRole("button", { name: "선택한 레벨로 시작", exact: true });
    await submit.click();
    await expect(submit).toBeEnabled();
    expect(bodies).toHaveLength(1);
    await submit.click();
    await expect(submit).toBeEnabled();

    // 검증: 같은 키를 유지하고 결과 페이지로 잘못 이동하지 않는다.
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toEqual(bodies[0]);
    await expect(page).toHaveURL(/\/level-test$/);
});
