import { expect, test } from "../fixtures/mock-test";
import { fulfillApiJson } from "../support/api-mocks";
import { LANGUAGE_LEARNING_DAILY_SET, LANGUAGE_LEARNING_SPEAKING_EVALUATION, LANGUAGE_LEARNING_SPEAKING_SESSION, LANGUAGE_LEARNING_SPEAKING_TURNS, mockLanguageLearningBase } from "../support/language-learning-mocks";
import { responseDto } from "../support/mock-data";
import type { LearningEvidenceItem } from "../../src/types/language-learning/historyEvidence";
import type { SpeakingCoachingResult } from "../../src/types/language-learning/speaking";

const scored: LearningEvidenceItem = {
    activityId: "WRITING:-9101", source: "WRITING", learningDate: "2026-08-12", learningLanguage: "ja", originLanguage: "ko",
    title: "저장된 번역 학습", resultKind: "SCORED_EVALUATION", policyVersion: "writing-v1", status: "COMPLETED",
    resultStatus: "EVALUATED", availability: "AVAILABLE", limitations: [], detailAvailable: true,
};
const coaching: LearningEvidenceItem = {
    ...scored, activityId: "SPEAKING:-9201", source: "SPEAKING", title: "저장된 자유 대화", resultKind: "SESSION_COACHING",
    policyVersion: "free-coaching-v1", resultStatus: "COMPLETED", availability: "LIMITED", limitations: ["ASSISTANCE_USED"],
};

test.beforeEach(async ({ page }) => {
    await mockLanguageLearningBase(page);
    await page.route("**/api/v1/language-learning/history?**", (route) => fulfillApiJson(route, responseDto([])));
});

test("LL-EVIDENCE-01 saved result kinds and unknown provenance stay separate; unavailable evidence cannot open", async ({ page }) => {
    // 준비: 신형 코칭, 공식 결과, 출처가 불명확한 구형 기록을 함께 조회한다.
    await page.route("**/api/v1/language-learning/history/evidence?**", (route) => fulfillApiJson(route, responseDto({ items: [scored, coaching, {
        ...scored, activityId: "READING:-9301", source: "READING", title: "이전 읽기", resultKind: "UNKNOWN",
        learningLanguage: null, originLanguage: null, policyVersion: null, availability: "LIMITED", detailAvailable: false, limitations: ["UNKNOWN_METADATA", "SOURCE_UNAVAILABLE"],
    }], nextCursor: null })));

    // 실행
    await page.goto("/ko/language-learning/history");
    const panel = page.getByTestId("learning-evidence-panel");

    // 검증: 패널은 저장 결과 종류를 보여줄 뿐 점수를 만들거나 평균내지 않는다.
    await expect(panel.getByTestId(`evidence-${scored.activityId}`)).toContainText("저장된 점수형 평가");
    await expect(panel.getByTestId(`evidence-${coaching.activityId}`)).toContainText("세션 코칭 · 점수 없음");
    await expect(panel.getByTestId(`evidence-${coaching.activityId}`)).toContainText("도움말을 사용한 기록");
    await expect(panel.getByTestId("evidence-READING:-9301")).toContainText("구형·결과 종류 미확인");
    await expect(panel.getByTestId("evidence-READING:-9301").getByRole("button")).toBeDisabled();
    await expect(panel).not.toContainText("평균");
    await panel.screenshot({ path: test.info().outputPath("evidence-desktop.png") });
});

test("LL-EVIDENCE-02 filters, paging, refresh and re-entry only read saved results", async ({ page }) => {
    // 준비
    const queries: URLSearchParams[] = [];
    const writes: string[] = [];
    page.on("request", (request) => {
        if (request.url().includes("/language-learning/") && !["GET", "OPTIONS"].includes(request.method())) writes.push(request.url());
    });
    await page.route("**/api/v1/language-learning/history/evidence?**", (route) => {
        const query = new URL(route.request().url()).searchParams;
        queries.push(query);
        return fulfillApiJson(route, responseDto({ items: [query.has("cursor") ? coaching : scored], nextCursor: query.has("cursor") ? null : "opaque:next+cursor" }));
    });

    // 실행: draft 입력은 제출 전까지 조회를 만들지 않는다.
    await page.goto("/ko/language-learning/history");
    const panel = page.getByTestId("learning-evidence-panel");
    await expect(panel.getByTestId(`evidence-${scored.activityId}`)).toBeVisible();
    const initialRequests = queries.length;
    await panel.getByLabel("조회 시작일", { exact: true }).fill("2026-08-01");
    await panel.getByLabel("조회 종료일", { exact: true }).fill("2026-09-30");
    await panel.getByLabel("학습 언어 코드", { exact: true }).fill("ja");
    await panel.getByLabel("학습 종류", { exact: true }).selectOption("SPEAKING");
    await panel.getByLabel("결과 종류", { exact: true }).selectOption("SESSION_COACHING");
    await panel.getByLabel("저장된 정책 버전", { exact: true }).fill("free-coaching-v1");
    expect(queries).toHaveLength(initialRequests);
    await panel.getByRole("button", { name: "조건 적용" }).click();
    await expect.poll(() => queries.at(-1)?.get("policyVersion")).toBe("free-coaching-v1");
    expect(Object.fromEntries(queries.at(-1)!)).toMatchObject({ source: "SPEAKING", learningLanguage: "ja", from: "2026-08-01", to: "2026-09-30", resultKind: "SESSION_COACHING", limit: "25" });
    await panel.getByRole("button", { name: "다음 페이지" }).click();
    await expect(panel.getByTestId(`evidence-${coaching.activityId}`)).toBeVisible();
    expect(queries.at(-1)?.get("cursor")).toBe("opaque:next+cursor");
    await panel.getByRole("button", { name: "이전 페이지" }).click();
    await expect(panel.getByTestId(`evidence-${scored.activityId}`)).toBeVisible();
    const refreshed = page.waitForResponse((response) => response.url().includes("/language-learning/history/evidence?") && response.request().method() === "GET");
    await panel.getByRole("button", { name: "근거 새로고침" }).click();
    expect((await refreshed).status()).toBe(200);
    await expect.poll(() => queries.at(-1)?.get("cursor")).toBeNull();
    await page.reload();
    await expect(panel.getByTestId(`evidence-${scored.activityId}`)).toBeVisible();

    // 검증
    expect(writes).toEqual([]);
});

test("LL-EVIDENCE-03 old evidence opens its existing detail and feedback with keyboard even outside current history", async ({ page }) => {
    // 준비: 기본 이력은 비었지만 더 넓은 누적 기간의 원본은 존재한다.
    const detailReads: string[] = [];
    await page.route("**/api/v1/language-learning/history/evidence?**", (route) => fulfillApiJson(route, responseDto({ items: [scored], nextCursor: null })));
    await page.route("**/api/v1/language-learning/history/WRITING%3A-9101", (route) => {
        detailReads.push(route.request().method());
        return fulfillApiJson(route, responseDto({ activityId: scored.activityId, source: "WRITING", detail: LANGUAGE_LEARNING_DAILY_SET }));
    });

    // 실행
    await page.goto("/ko/language-learning/history");
    const open = page.getByTestId(`evidence-${scored.activityId}`).getByRole("button");
    await open.focus();
    await page.keyboard.press("Enter");

    // 검증: 원래 문제와 피드백을 재사용하고 선택이 빈 기본 목록으로 덮어써지지 않는다.
    await expect(page.getByTestId("writing-history-detail")).toBeVisible();
    await expect(page.getByTestId("writing-history-detail")).toContainText(LANGUAGE_LEARNING_DAILY_SET.items[0].originText);
    expect(detailReads).toEqual(["GET"]);
});

test("LL-EVIDENCE-04 failed read is not empty and explicit retry recovers without generation", async ({ page }) => {
    // 준비
    let fail = true;
    await page.route("**/api/v1/language-learning/history/evidence?**", (route) => fail
        ? fulfillApiJson(route, { resultCode: -1, message: "Unavailable", body: { errorCode: "LL_UNAVAILABLE" } }, 503)
        : fulfillApiJson(route, responseDto({ items: [], nextCursor: null })));

    // 실행과 검증: 장애를 빈 결과로 표시하지 않는다.
    await page.goto("/ko/language-learning/history");
    const panel = page.getByTestId("learning-evidence-panel");
    await expect(panel.getByRole("alert")).toContainText("기록이 없다는 뜻은 아닙니다");
    await expect(panel.getByTestId("evidence-empty")).toHaveCount(0);
    fail = false;
    await panel.getByRole("button", { name: "다시 시도" }).click();
    await expect(panel.getByTestId("evidence-empty")).toBeVisible();
    await expect(panel.getByRole("alert")).toHaveCount(0);
});

test("LL-EVIDENCE-05 narrow screen and unknown limitations remain readable", async ({ page }) => {
    // 준비
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/v1/language-learning/history/evidence?**", (route) => fulfillApiJson(route, responseDto({ items: [{ ...coaching, limitations: ["FUTURE_LIMITATION"] }], nextCursor: null })));

    // 실행
    await page.goto("/ko/language-learning/history");
    const panel = page.getByTestId("learning-evidence-panel");

    // 검증
    await expect(panel).toContainText("저장 근거의 제한: FUTURE_LIMITATION");
    expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await panel.screenshot({ path: test.info().outputPath("evidence-mobile.png") });
});

test("LL-EVIDENCE-06 unavailable current source is distinct from the original grounded coaching state", async ({ page }) => {
    // 준비: 저장 당시 정상 코칭이었으나 조회 시 원본 근거가 없어 서버가 내용을 숨겼다.
    await page.route("**/api/v1/language-learning/history/evidence?**", (route) => fulfillApiJson(route, responseDto({ items: [{ ...coaching, availability: "AVAILABLE", limitations: [] }], nextCursor: null })));
    await page.route("**/api/v1/language-learning/history/SPEAKING%3A-9201", (route) => fulfillApiJson(route, responseDto({
        activityId: coaching.activityId, source: "SPEAKING", detail: {
            session: { ...LANGUAGE_LEARNING_SPEAKING_SESSION, resultKind: "SESSION_COACHING" },
            turns: [], evaluation: null,
            coachingResult: {
                id: 1, resultKind: "SESSION_COACHING", resultPolicyVersion: "free-coaching-v1", schemaVersion: "1",
                sourceSnapshotHash: "synthetic", contentStatus: "GROUNDED", limitationReasons: [], items: [],
                promptVersion: "synthetic", createdAt: "2026-08-15T10:00:00", evidenceAvailability: "UNAVAILABLE",
                evidenceLimitations: ["SOURCE_UNAVAILABLE"],
            },
        },
    })));

    // 실행
    await page.goto("/ko/language-learning/history");
    await page.getByTestId(`evidence-${coaching.activityId}`).getByRole("button").click();

    // 검증: 새 점수/재코칭 없이 조회 제한을 명시한다.
    await expect(page.getByTestId("evidence-metadata-scope")).toContainText("사용 가능 여부는 상세 화면에서 다시 확인");
    await expect(page.getByTestId(`evidence-${coaching.activityId}`)).not.toContainText("저장 정보 일부 미확인");
    await expect(page.getByTestId("speaking-coaching-evidence-availability")).toContainText("피드백이 없었다는 뜻은 아닙니다");
    await expect(page.getByTestId("speaking-coaching-result")).not.toContainText("/100");
    await expect(page.getByTestId("speaking-coaching-result").getByRole("button")).toHaveCount(0);
});

test("LL-EVIDENCE-07 deletion between list and detail is an error without stale original content", async ({ page }) => {
    // 준비: 목록 조회 후 원본이 삭제되어 상세 서비스의 소유권/존재 검사가 거절한다.
    await page.route("**/api/v1/language-learning/history/evidence?**", (route) => fulfillApiJson(route, responseDto({ items: [scored], nextCursor: null })));
    await page.route("**/api/v1/language-learning/history/WRITING%3A-9101", (route) => fulfillApiJson(route, { resultCode: -1, body: { errorCode: "HISTORY_NOT_FOUND" } }, 404));

    // 실행
    await page.goto("/ko/language-learning/history");
    await page.getByTestId(`evidence-${scored.activityId}`).getByRole("button").click();

    // 검증
    await expect(page.locator("#learning-history-detail").getByRole("alert")).toBeVisible();
    await expect(page.getByTestId("writing-history-detail")).toHaveCount(0);
});

test("LL-EVIDENCE-10 available list metadata does not make expired audio playable", async ({ page }) => {
    // 준비: 저장 문구는 남아 있지만 서버가 만료 음성 URL을 제공하지 않는다.
    const audioRequests: string[] = [];
    page.on("request", (request) => {
        if (request.url().includes("/audio")) audioRequests.push(new URL(request.url()).pathname);
    });
    await page.route("**/api/v1/language-learning/history/evidence?**", (route) => fulfillApiJson(route, responseDto({ items: [{ ...coaching, availability: "AVAILABLE", limitations: [] }], nextCursor: null })));
    await page.route("**/api/v1/language-learning/history/SPEAKING%3A-9201", (route) => fulfillApiJson(route, responseDto({
        activityId: coaching.activityId, source: "SPEAKING", detail: {
            session: { ...LANGUAGE_LEARNING_SPEAKING_SESSION, resultKind: "SESSION_COACHING" },
            turns: [{ ...LANGUAGE_LEARNING_SPEAKING_TURNS[0], userAudioUrl: null, assistantAudioUrl: null }],
            evaluation: null, coachingResult: null,
        },
    })));

    // 실행
    await page.goto("/ko/language-learning/history");
    await page.getByTestId(`evidence-${coaching.activityId}`).getByRole("button").click();

    // 검증: 목록의 AVAILABLE을 음성 사용 가능으로 해석하지 않는다.
    const detail = page.getByTestId("speaking-history-detail");
    await expect(detail).toContainText(LANGUAGE_LEARNING_SPEAKING_TURNS[0].transcript!);
    await expect(detail).toContainText("사용자 원본 음성의 보관 기간이 만료되어 재생할 수 없습니다.");
    await expect(detail.locator("audio")).toHaveCount(0);
    await expect(detail.getByRole("button").filter({ hasText: "재생" })).toHaveCount(0);
    expect(audioRequests).toEqual([]);
});

test("LL-EVIDENCE-11 partial current evidence shows only the surviving coaching observation without score or regeneration", async ({ page }) => {
    // 준비: 제외·삭제·재녹음으로 연결이 끊긴 항목은 서버가 제거하고 유효한 항목 하나만 전달한다.
    const writes: string[] = [];
    const result: SpeakingCoachingResult = {
        id: 1, resultKind: "SESSION_COACHING", resultPolicyVersion: "free-session-coaching-v1", schemaVersion: "1",
        sourceSnapshotHash: "synthetic", contentStatus: "GROUNDED", limitationReasons: [],
        promptVersion: "synthetic", createdAt: "2026-08-15T10:00:00", evidenceAvailability: "LIMITED",
        evidenceLimitations: ["SOURCE_EVIDENCE_CHANGED_OR_UNAVAILABLE"],
        items: [{
            observationId: "surviving-observation", kind: "OBSERVATION", message: "현재 원문에서 확인되는 관찰입니다.",
            evidence: {
                turnId: "401", turnIndex: 1, recordingRevision: 2, transcriptExcerpt: "友達と映画を見に行く予定です。",
                transcriptHash: "synthetic", referenceAssistantTurnId: null, assistanceUsage: [],
                sourceProvenance: "AUTOMATIC_SPEECH_RECOGNITION", verbatimAccuracyVerified: false,
            },
            suggestedExpression: null, suggestionIsLearnerEvidence: false,
        }],
    };
    page.on("request", (request) => {
        if (request.url().includes("/language-learning/") && !["GET", "OPTIONS"].includes(request.method())) writes.push(request.method());
    });
    await page.route("**/api/v1/language-learning/history/evidence?**", (route) => fulfillApiJson(route, responseDto({ items: [{ ...coaching, availability: "AVAILABLE", limitations: [] }], nextCursor: null })));
    await page.route("**/api/v1/language-learning/history/SPEAKING%3A-9201", (route) => fulfillApiJson(route, responseDto({
        activityId: coaching.activityId, source: "SPEAKING", detail: {
            session: { ...LANGUAGE_LEARNING_SPEAKING_SESSION, resultKind: "SESSION_COACHING" },
            turns: [{ ...LANGUAGE_LEARNING_SPEAKING_TURNS[0], recordingRevision: 2 }],
            evaluation: null, coachingResult: result,
        },
    })));

    // 실행
    await page.goto("/ko/language-learning/history");
    await page.getByTestId(`evidence-${coaching.activityId}`).getByRole("button").click();

    // 검증: 저장 당시 GROUNDED와 현재 LIMITED를 함께 설명하고 유효 원문만 연결한다.
    const rendered = page.getByTestId("speaking-coaching-result");
    await expect(rendered.locator("article")).toHaveCount(1);
    await expect(rendered).toContainText("현재 원문에서 확인되는 관찰입니다.");
    await expect(page.getByTestId("speaking-coaching-evidence-availability")).toBeVisible();
    await expect(rendered).not.toContainText("/100");
    await expect(rendered.getByRole("button")).toHaveCount(1);
    await rendered.getByRole("button").click();
    await expect(page.locator("#history-speaking-turn-401")).toBeInViewport();
    expect(writes).toEqual([]);
});

for (const practiceMode of ["FREE", "GUIDED", "READ_ALOUD"] as const) {
    test(`LL-EVIDENCE-12 saved ${practiceMode} scored history keeps evaluation distinct from coaching`, async ({ page }) => {
        // 준비: legacy 점수형 세션은 코칭 전용 availability가 없어도 원래 평가를 유지한다.
        await page.route("**/api/v1/language-learning/history/evidence?**", (route) => fulfillApiJson(route, responseDto({ items: [{ ...coaching, resultKind: "SCORED_EVALUATION", availability: "AVAILABLE", limitations: [] }], nextCursor: null })));
        await page.route("**/api/v1/language-learning/history/SPEAKING%3A-9201", (route) => fulfillApiJson(route, responseDto({
            activityId: coaching.activityId, source: "SPEAKING", detail: {
                session: { ...LANGUAGE_LEARNING_SPEAKING_SESSION, status: "COMPLETED", practiceMode, resultKind: "SCORED_EVALUATION", sessionSummary: "保存された会話の要約" },
                turns: [], evaluation: LANGUAGE_LEARNING_SPEAKING_EVALUATION, coachingResult: null,
            },
        })));

        // 실행
        await page.goto("/ko/language-learning/history");
        await page.getByTestId(`evidence-${coaching.activityId}`).getByRole("button").click();

        // 검증: 기존 점수·metric만 표시하며 코칭으로 재해석하지 않는다.
        const detail = page.getByTestId("speaking-history-detail");
        await expect(detail).toContainText("/100");
        await expect(detail).toContainText(String(LANGUAGE_LEARNING_SPEAKING_EVALUATION.overallScore));
        await expect(page.getByTestId("speaking-coaching-result")).toHaveCount(0);
    });
}

test("LL-EVIDENCE-08 incompatible response is a visible failure rather than empty success", async ({ page }) => {
    // 준비: 구형 reader 또는 계약이 맞지 않는 응답을 재현한다.
    await page.route("**/api/v1/language-learning/history/evidence?**", (route) => fulfillApiJson(route, responseDto([])));

    // 실행
    await page.goto("/ko/language-learning/history");

    // 검증
    const panel = page.getByTestId("learning-evidence-panel");
    await expect(panel.getByRole("alert")).toBeVisible();
    await expect(panel.getByTestId("evidence-empty")).toHaveCount(0);
});

test("LL-EVIDENCE-09 reopening the same evidence rechecks detail permission and hides the previous source", async ({ page }) => {
    // 준비: 한 번 읽은 상세가 이후 소유권/존재 재검사에서 거절되는 경계를 재현한다.
    let detailReads = 0;
    let denied = false;
    await page.route("**/api/v1/language-learning/history/evidence?**", (route) => fulfillApiJson(route, responseDto({ items: [scored], nextCursor: null })));
    await page.route("**/api/v1/language-learning/history/WRITING%3A-9101", (route) => {
        detailReads += 1;
        return denied
            ? fulfillApiJson(route, { resultCode: -1, body: { errorCode: "HISTORY_NOT_FOUND" } }, 403)
            : fulfillApiJson(route, responseDto({ activityId: scored.activityId, source: "WRITING", detail: LANGUAGE_LEARNING_DAILY_SET }));
    });

    // 실행: 동일 카드를 다시 눌러도 캐시만 재사용해서는 안 된다.
    await page.goto("/ko/language-learning/history");
    const open = page.getByTestId(`evidence-${scored.activityId}`).getByRole("button");
    await open.click();
    await expect(page.getByTestId("writing-history-detail")).toBeVisible();
    expect(detailReads).toBe(1);
    denied = true;
    await open.click();

    // 검증: 서버가 다시 결정하며 이전 원문은 거절 뒤 남지 않는다.
    await expect.poll(() => detailReads).toBeGreaterThan(1);
    await expect(page.locator("#learning-history-detail").getByRole("alert")).toBeVisible();
    await expect(page.getByTestId("writing-history-detail")).toHaveCount(0);
});

test("LL-EVIDENCE-13 returning through navigation hides cached source until the new permission check completes", async ({ page }) => {
    // 준비: 페이지 재진입 뒤 응답을 보류해 이전 상세가 먼저 나타나는지 확인한다.
    let denied = false;
    let deniedReads = 0;
    let releaseDenied: () => void = () => {};
    const permissionCheck = new Promise<void>((resolve) => { releaseDenied = resolve; });
    await page.route("**/api/v1/language-learning/history/evidence?**", (route) => fulfillApiJson(route, responseDto({ items: [scored], nextCursor: null })));
    await page.route("**/api/v1/language-learning/history/WRITING%3A-9101", async (route) => {
        if (denied) {
            deniedReads += 1;
            await permissionCheck;
            return fulfillApiJson(route, { resultCode: -1, body: { errorCode: "HISTORY_NOT_FOUND" } }, 403);
        }
        return fulfillApiJson(route, responseDto({ activityId: scored.activityId, source: "WRITING", detail: LANGUAGE_LEARNING_DAILY_SET }));
    });

    // 실행: 전체 페이지 reload 없이 실제 앱 메뉴로 나갔다 돌아온다.
    await page.goto("/ko/language-learning/history");
    const open = page.getByTestId(`evidence-${scored.activityId}`).getByRole("button");
    await open.click();
    await expect(page.getByTestId("writing-history-detail")).toBeVisible();
    await page.getByTestId("language-learning-tab-dashboard").click();
    await expect(page).toHaveURL(/\/language-learning\/?$/);
    await page.getByTestId("language-learning-tab-history").click();
    await expect(page).toHaveURL(/\/language-learning\/history$/);
    denied = true;
    await open.click();

    // 검증: 권한 응답을 기다리는 동안에도 예전 원문을 캐시에서 노출하지 않는다.
    try {
        await expect.poll(() => deniedReads).toBeGreaterThan(0);
        await expect(page.getByTestId("writing-history-detail")).toHaveCount(0);
    } finally {
        releaseDenied();
    }
    await expect(page.locator("#learning-history-detail").getByRole("alert")).toBeVisible();
    await expect(page.getByTestId("writing-history-detail")).toHaveCount(0);
});
