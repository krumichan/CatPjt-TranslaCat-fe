import { WEB_AI_AREA_GROUPS } from "../../src/features/language-learning/web-ai/webAiSchedule";
import { expect, test } from "../fixtures/mock-test";
import { fulfillApiJson } from "../support/api-mocks";
import { mockLanguageLearningBase } from "../support/language-learning-mocks";
import { responseDto } from "../support/mock-data";

const workspaceRoute = "**/api/v1/language-learning/auto-practice";
const limits = Object.fromEntries(WEB_AI_AREA_GROUPS.flatMap(({ areas }) => areas).map((area) => [area, 5]));

test("자동 플랜은 0시와 유형별 수량을 저장하고 새로고침 뒤 활성 플랜을 표시한다", async ({ page }) => {
    // 준비: 실제 FE와 인증 경계는 실행하고 저장 API만 합성한다.
    await mockLanguageLearningBase(page);
    const existing = {
        id: "prior", revision: 1, name: "저녁 플랜", studyTime: "18:00", enabled: true, pauseReason: null,
        originLanguage: "ko", learningLanguage: "ja", areas: { WRITING_TRANSLATION: { standard: 1 } },
    };
    let plans: Record<string, unknown>[] = [existing];
    await page.route(workspaceRoute, (route) => fulfillApiJson(route, responseDto({
        timezone: "Asia/Tokyo", plans, limits, writingLimit: 8, availableAreas: ["WRITING_TRANSLATION"], jobs: [],
    })));
    await page.route(`${workspaceRoute}/plans`, (route) => {
        const body = route.request().postDataJSON();
        expect(body).toMatchObject({
            name: "자정 플랜", studyTime: "00:00", enabled: true,
            areas: { WRITING_TRANSLATION: { easy: 2, standard: 0, hard: 0 } },
        });
        const result = { ...body, id: "new", revision: 1, originLanguage: "ko", learningLanguage: "ja" };
        plans = [{ ...existing, enabled: false }, result];
        return fulfillApiJson(route, responseDto(result));
    });

    // 실행: 자동 생성 설정만 저장하며 브라우저에서 모델이나 생성 API를 호출하지 않는다.
    await page.goto("/language-learning/settings");
    const section = page.locator("#automatic-practice");
    await section.getByRole("button", { name: "새 플랜" }).click();
    await section.getByLabel("플랜 이름").fill("자정 플랜");
    await section.locator('input[type="time"]').fill("00:00");
    await section.getByLabel("번역 작문 쉬움").fill("2");
    await section.getByLabel("이 플랜 활성화").check();
    await section.getByRole("button", { name: "저장", exact: true }).click();

    // 검증: 서버가 돌려준 단일 활성 플랜과 예약 시각을 새로고침 뒤에도 읽는다.
    await expect(section.getByText("자정 플랜", { exact: true })).toBeVisible();
    await page.reload();
    await expect(section.getByText("00:00 · ja · 활성", { exact: true })).toBeVisible();
    await expect(section.getByText("18:00 · ja · 비활성", { exact: true })).toBeVisible();
});

test("대시보드는 비활성화된 플랜의 이월 문제를 기존 학습 링크로 보여준다", async ({ page }) => {
    // 준비: 수요일 조회 시 화요일에 준비된 Reading 분량이 남아 있다.
    await mockLanguageLearningBase(page);
    const requests: string[] = [];
    await page.route(workspaceRoute, (route) => {
        requests.push(route.request().method());
        return fulfillApiJson(route, responseDto({
            timezone: "Asia/Tokyo", plans: [], limits, writingLimit: 8, availableAreas: ["READING_COMPREHENSION"],
            jobs: [{ id: 12, area: "READING_COMPREHENSION", learningDate: "2026-11-24", resourceId: "125",
                state: "READY", reason: null }],
        }));
    });

    // 실행·검증: 읽기 요청으로 기존 세트 위치가 표시된다.
    await page.goto("/language-learning");
    const card = page.getByTestId("prepared-practice");
    await expect(card.getByText("2026-11-24 · 준비 완료")).toBeVisible();
    await expect(card.getByRole("link", { name: "문제 풀기" }))
        .toHaveAttribute("href", /\/language-learning\/reading\/session\/125$/);
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((method) => method === "GET")).toBe(true);
});
