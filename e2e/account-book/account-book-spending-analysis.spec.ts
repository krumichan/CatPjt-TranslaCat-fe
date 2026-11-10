import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/mock-test";
import { fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import type { SpendingAnalysisJob, SpendingAnalysisRequest } from "../../src/types/accountBookAnalysis";

function evidenceTransaction(request: SpendingAnalysisRequest, accountBookId = 1) {
    return { id: 11, accountBookId, type: "EXPENSE", title: "Amazon USB 케이블", storeName: "Amazon.co.jp", category: "쇼핑", amount: "1200",
        transactionDate: `${request.year}-${String(request.month ?? 10).padStart(2, "0")}-24`, memo: "공개 테스트 거래", sourceType: null, sourceId: null, sourceYear: null, sourceMonth: null };
}

function analysisResponse(request: SpendingAnalysisRequest, fingerprint: string, accountBookId = 1) {
    const annual = request.periodType === "YEARLY";
    const month = request.month ?? (request.quarter ? (request.quarter - 1) * 3 + 1 : request.half ? (request.half - 1) * 6 + 1 : 1);
    const start = request.startDate ?? `${request.year}-${String(month).padStart(2, "0")}-01`;
    const endDate = request.endDate ? new Date(`${request.endDate}T00:00:00Z`) : new Date(Date.UTC(request.year, month - 1, 1));
    if (request.endDate) endDate.setUTCDate(endDate.getUTCDate() + 1);
    else endDate.setUTCMonth(endDate.getUTCMonth() + (annual ? 12 : request.quarter ? 3 : request.half ? 6 : 1));
    const end = endDate.toISOString().slice(0, 10);
    const savings = { basisAmount: "1200", lower: "1200", estimate: "1200", upper: "1200", grossReduction: "1200", replacementCost: "0", reductionLowBps: 10000, reductionHighBps: 10000, replacementLowBps: 0, replacementHighBps: 0, kind: "SKIP_EXTRA_ITEM", assumption: "기본 사용품은 유지하고 해당 추가 구매 한 건을 생략하는 가정입니다." };
    return { periodType: request.periodType, year: request.year, month: request.periodType === "MONTHLY" ? month : null,
        quarter: request.quarter ?? null, half: request.half ?? null, periodStart: start, periodEndExclusive: end,
        analysisId: "", policyVersion: "purchase-context-v4", savings: annual ? null : { ...savings, kind: "COMBINED" },
        currencyCode: "JPY", decimalPlaces: 0, totalExpense: "54000", transactionCount: annual ? 1200 : 5,
        coverage: { analyzedTransactionCount: annual ? 600 : 5, totalTransactionCount: annual ? 1200 : 5, isPartial: annual, reason: annual ? "TRANSACTION_LIMIT" : null },
        summary: request.comment ? "추가 설명을 반영한 결과입니다. 필요한 치료비를 유지하고 반복 구매를 검토하세요." : "실제 구매 내역을 확인한 결과입니다. 비슷한 소액 구매를 모아 검토해 보세요.",
        findings: [{ id: "finding-1", title: "소액 쇼핑을 구매 전에 확인해 보세요", reason: `${request.year}년 ${request.month ?? 10}월 24일 Amazon.co.jp에서 USB 케이블 구매에 ¥1,200을 사용했습니다.`, action: "다음 소품 구매 전에 이미 보유한 물품을 먼저 확인해 보세요.",
            opinion: "기본 사용품을 유지하면서 같은 역할의 추가 선택은 조정할 여지가 있습니다.",
            contextQuestion: null, uncertainty: "이 거래만으로 불필요한 구매라고 단정할 수 없습니다.", evidenceAmount: "1200", evidenceTransactions: [evidenceTransaction(request, accountBookId)], savings: annual ? null : savings }],
        contextComment: request.comment ?? null, generatedAt: "2026-10-31T12:00:00Z", snapshotFingerprint: fingerprint };
}

async function mockAnalysisBook(page: Page) {
    const state = { fingerprint: "snapshot-1", calls: [] as SpendingAnalysisRequest[], snapshots: [] as string[], failNextPost: 0, failSnapshot: false,
        pauseNext: false, release: null as (() => void) | null, unexpected: [] as string[], history: [] as ReturnType<typeof analysisResponse>[],
        findingCount: 1, owner: true, currentJob: null as SpendingAnalysisJob | null,
        jobs: new Map<number, SpendingAnalysisJob>(), cancelCalls: [] as number[], readNotifications: [] as string[] };
    const book = { id: 1, name: "AI 분석 검증 가계부", description: "Public mock fixture", category: "개인", currencyCode: "JPY", currencySymbol: "¥", currencyDecimalPlaces: 0,
        incomeAmount: "100000", expenseAmount: "54000", balance: "46000", transactionCount: 5, myRole: "OWNER" };
    await mockCommonPageDependencies(page);
    await mockIdleWebSocket(page);
    await page.route("**/api/v1/support/notifications/*/read", route => {
        state.readNotifications.push(new URL(route.request().url()).pathname);
        return fulfillJson(route, responseDto(true));
    });
    await page.route("**/currencies", route => fulfillJson(route, responseDto([{ id: 1, code: "JPY", name: "일본 엔", symbol: "¥", decimalPlaces: 0, baseCurrency: true }])));
    await page.route("**/api/v1/account-books**", async route => {
        const url = new URL(route.request().url());
        const suffix = url.pathname.split("/account-books")[1];
        if (suffix === "/1/spending-analysis/history") {
            const page = Number(url.searchParams.get("page") ?? 0);
            return fulfillJson(route, responseDto({ items: state.history.slice(page * 10, page * 10 + 10), total: state.history.length, page, size: 10 }));
        }
        if (suffix.startsWith("/1/spending-analysis/history/")) {
            return fulfillJson(route, responseDto(state.history.find(item => item.analysisId === suffix.split("/").at(-1))));
        }
        if (suffix === "/1/spending-analysis/snapshot") {
            state.snapshots.push(url.search);
            if (state.failSnapshot) return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
            return fulfillJson(route, responseDto({ snapshotFingerprint: state.fingerprint, transactionCount: url.searchParams.get("periodType") === "YEARLY" ? 1200 : 5, totalExpense: "54000" }));
        }
        if (suffix === "/1/spending-analysis/jobs/current") {
            return fulfillJson(route, responseDto(state.currentJob));
        }
        const jobPath = /^\/1\/spending-analysis\/jobs\/(\d+)(\/cancel)?$/.exec(suffix);
        if (jobPath) {
            const id = Number(jobPath[1]);
            const job = state.jobs.get(id);
            if (!job) return route.fulfill({ status: 404 });
            if (jobPath[2]) {
                state.cancelCalls.push(id);
                if (!state.owner) return route.fulfill({ status: 403 });
                const canceled: SpendingAnalysisJob = { ...job, status: "CANCELED", canCancel: false };
                state.jobs.set(id, canceled);
                state.currentJob = canceled;
                return fulfillJson(route, responseDto(canceled));
            }
            return fulfillJson(route, responseDto(job));
        }
        if (suffix === "/1/spending-analysis/jobs") {
            const request = route.request().postDataJSON() as SpendingAnalysisRequest;
            state.calls.push(request);
            const response = analysisResponse(request, state.fingerprint);
            if (state.findingCount > 1) {
                response.findings = Array.from({ length: state.findingCount }, (_, index) => ({
                    ...response.findings[0], id: `finding-${index + 1}`, title: `반복 지출 개선안 ${index + 1}`,
                }));
            }
            response.analysisId = `saved-analysis-${state.calls.length}`;
            if (state.failNextPost) {
                const status = state.failNextPost;
                state.failNextPost = 0;
                return route.fulfill({ status, contentType: "application/json", body: "{}" });
            }
            const id = state.calls.length;
            const running: SpendingAnalysisJob = { id, periodStart: response.periodStart, periodEndExclusive: response.periodEndExclusive,
                status: "RUNNING", canCancel: state.owner, requestedByMe: true, analysisId: null, errorCode: null };
            state.jobs.set(id, running);
            state.currentJob = running;
            const complete = () => {
                if (state.jobs.get(id)?.status !== "RUNNING") return;
                const succeeded: SpendingAnalysisJob = { ...running, status: "SUCCEEDED", canCancel: false, analysisId: response.analysisId };
                state.jobs.set(id, succeeded);
                state.currentJob = succeeded;
                state.history.unshift(response);
            };
            if (state.pauseNext) {
                state.pauseNext = false;
                state.release = complete;
            } else {
                complete();
            }
            return fulfillJson(route, responseDto(running));
        }
        let body: unknown;
        const transaction = evidenceTransaction({ periodType: "MONTHLY", year: 2026, month: 10, locale: "ko" });
        switch (suffix) {
            case "": body = [book]; break;
            case "/1": body = book; break;
            case "/1/summary": body = { ...book, accountBookId: 1 }; break;
            case "/1/categories": body = [{ id: 1, accountBookId: 1, name: "쇼핑", active: true, displayOrder: 0 }]; break;
            case "/1/transactions": body = { page: { content: [transaction], page: { size: 20, number: 0, totalElements: 1, totalPages: 1 } }, currencyName: "JPY" }; break;
            case "/1/transactions/months": body = [{ value: "2026-10", label: "2026년 10월", year: 2026, month: 10, currentMonth: true }, { value: "2026-09", label: "2026년 9월", year: 2026, month: 9, currentMonth: false }]; break;
            case "/1/transactions/stores/suggestions": body = [{ storeName: "Amazon.co.jp" }]; break;
            case "/1/monthly-goals": body = { id: 1, accountBookId: 1, year: 2026, month: 10, goalAmount: "60000", expenseAmount: "54000", remainingAmount: "6000", usageRate: 90, exceeded: false }; break;
            case "/1/monthly-goals/list": body = []; break;
            case "/1/charts/monthly": body = { year: 2026, months: [] }; break;
            case "/1/charts/categories":
            case "/1/charts/stores": body = { year: 2026, month: 10, totalAmount: "54000", items: [{ name: suffix.endsWith("stores") ? "Amazon.co.jp" : "쇼핑", groupKey: "쇼핑", amount: "54000", percentage: 100, transactionCount: 5 }] }; break;
            case "/1/fixed-costs": body = []; break;
            case "/1/fixed-costs/generation-targets": body = { year: 2026, month: 10, count: 0, targets: [] }; break;
            case "/1/members": body = [{ id: 1, userId: 1, publicId: "mock-owner", username: "Mock owner", role: "OWNER" }]; break;
            case "/1/invitations": body = []; break;
            default:
                state.unexpected.push(`${route.request().method()} ${suffix}`);
                return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
        }
        await fulfillJson(route, responseDto(body));
    });
    return state;
}

async function openAnalysis(page: Page, locale = "ko") {
    await page.goto(`/${locale}/account-books/1`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("spending-analysis-open").click();
    const card = page.getByTestId("spending-analysis-dialog");
    await expect(card).toBeVisible();
    await card.getByTestId("spending-analysis-period-input").fill("2026-10");
    return card;
}

async function nextFocusCheck(page: Page, state: Awaited<ReturnType<typeof mockAnalysisBook>>) {
    const before = state.snapshots.length;
    await expect.poll(async () => {
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        return state.snapshots.length;
    }, { timeout: 15_000 }).toBeGreaterThan(before);
}

test("ACCOUNT-ANALYSIS v3 accepts quarter, half and one-calendar-month custom ranges", async ({ page }) => {
    // 준비
    const state = await mockAnalysisBook(page);
    const card = await openAnalysis(page);

    // 실행 / 검증: 다른 기간의 필드를 전송하지 않는다.
    await card.getByRole("button", { name: "분기별", exact: true }).click();
    await card.getByTestId("spending-analysis-period-input").fill("2026");
    await card.getByLabel("분석할 분기").selectOption("2");
    await card.getByTestId("spending-analysis-run").click();
    await expect(card.getByTestId("spending-analysis-result")).toContainText("2026-04-01 ~ 2026-06-30");
    expect(state.calls.at(-1)).toEqual({ periodType: "QUARTERLY", year: 2026, quarter: 2, locale: "ko" });
    await card.getByRole("button", { name: "반기별", exact: true }).click();
    await card.getByLabel("분석할 반기").selectOption("2");
    await card.getByTestId("spending-analysis-run").click();
    await expect(card.getByTestId("spending-analysis-result")).toContainText("2026-07-01 ~ 2026-12-31");
    await card.getByRole("button", { name: "기간 지정", exact: true }).click();
    await card.getByLabel("시작일", { exact: true }).fill("2026-01-31");
    await card.getByLabel("종료일 · 포함", { exact: true }).fill("2026-02-26");
    await expect(card.getByTestId("spending-analysis-run")).toBeDisabled();
    await card.getByLabel("종료일 · 포함", { exact: true }).fill("2026-02-27");
    await card.getByTestId("spending-analysis-run").click();
    await expect(card.getByTestId("spending-analysis-result")).toContainText("2026-01-31 ~ 2026-02-27");
    expect(state.calls.at(-1)).toEqual({ periodType: "CUSTOM", year: 2026, startDate: "2026-01-31", endDate: "2026-02-27", locale: "ko" });
});

test("ACCOUNT-ANALYSIS v3 saves repeated periods and opens the original context without a paid request", async ({ page }) => {
    // 준비 / 실행: 같은 기간에 두 번 분석한다.
    const state = await mockAnalysisBook(page);
    const card = await openAnalysis(page);
    await card.getByTestId("spending-analysis-run").click();
    await expect(card.getByTestId("spending-savings-total")).toContainText("1,200");
    await expect(card.getByTestId("spending-savings-total")).toContainText("가상 예상");
    await card.getByRole("textbox", { name: /^추가로 알려주실 내용/ }).fill("두 번째는 선물이었어요.");
    await card.getByTestId("spending-analysis-run").click();
    await expect(card.getByTestId("spending-analysis-result")).toContainText("추가 설명을 반영한 결과입니다.");
    await expect(card.getByTestId("spending-analysis-history")).toContainText("분석 이력 · 2개");

    // 검증: 이전 결과를 열어도 재분석하지 않고 원래 코멘트·결과가 복원된다.
    await card.getByTestId("spending-analysis-history").getByRole("button").filter({ hasText: "실제 구매 내역을 확인한 결과입니다." }).click();
    await expect(card.getByTestId("spending-analysis-result")).toContainText("실제 구매 내역을 확인한 결과입니다.");
    await expect(card.getByRole("textbox", { name: /^추가로 알려주실 내용/ })).toHaveValue("");
    expect(state.calls).toHaveLength(2);
    expect(state.history).toHaveLength(2);
    expect(state.unexpected).toEqual([]);
    await card.screenshot({ path: test.info().outputPath("history-and-savings-desktop.png") });
});

test("ACCOUNT-ANALYSIS v4 refreshes the first history page after analysis from an older page", async ({ page }) => {
    // 준비: 첫 페이지가 캐시된 상태에서 다음 페이지를 보고 있다.
    const state = await mockAnalysisBook(page);
    for (let index = 0; index < 11; index++) {
        state.history.push({ ...analysisResponse({ periodType: "MONTHLY", year: 2026, month: 9, locale: "ko" }, state.fingerprint), analysisId: `old-${index}`, summary: "이전 달의 저장 결과" });
    }
    const card = await openAnalysis(page);
    const history = card.getByTestId("spending-analysis-history");
    await expect(history).toContainText("분석 이력 · 11개");
    await history.getByRole("button", { name: "다음", exact: true }).click();
    await expect(history).toContainText("2 / 2");

    // 실행 / 검증: 새 결과가 첫 페이지 목록에도 즉시 나타난다.
    await card.getByTestId("spending-analysis-run").click();
    await expect(history).toContainText("분석 이력 · 12개");
    await expect(history).toContainText("실제 구매 내역을 확인한 결과입니다.");
    await expect(history).toContainText("1 / 2");
});

test("ACCOUNT-ANALYSIS displays 24 monthly suggestions as collapsed rows and expands only the selected one", async ({ page }, testInfo) => {
    // 준비: 월별에서도 서로 다른 개선안이 많이 반환되는 보고서를 연다.
    const state = await mockAnalysisBook(page);
    state.findingCount = 24;
    const dialog = await openAnalysis(page);

    // 실행
    await dialog.getByTestId("spending-analysis-run").click();
    await expect(dialog.getByText("개선안 24개", { exact: true })).toBeVisible();
    const rows = dialog.getByTestId("spending-analysis-finding");
    await expect(rows).toHaveCount(24);
    await expect(dialog.locator('details[data-testid="spending-analysis-finding"][open]')).toHaveCount(0);
    await dialog.screenshot({ path: testInfo.outputPath("monthly-24-collapsed.png") });
    await rows.nth(2).locator(":scope > summary").click();

    // 검증: 선택한 설명만 펼치고 보고서 요약과 다른 결과는 그대로 둔다.
    await expect(rows.nth(2).getByTestId("spending-analysis-finding-details")).toBeVisible();
    await expect(rows.nth(3).getByTestId("spending-analysis-finding-details")).toBeHidden();
    await expect(dialog.getByText("핵심 요약", { exact: true })).toBeVisible();
    expect(state.calls).toHaveLength(1);
});

test("ACCOUNT-ANALYSIS manually analyzes below graphs and opens exact read-only supporting transactions", async ({ page }, testInfo) => {
    test.setTimeout(300_000);

    // 준비: 메타데이터 조회와 실제 AI 분석 요청을 구분한다.
    const state = await mockAnalysisBook(page);
    const card = await openAnalysis(page);
    await expect(card).toContainText("선택 기간 지출");
    await expect(page.getByTestId("ranking-store-item")).toBeVisible();
    expect(state.calls).toHaveLength(0);
    const positions = await page.evaluate(() => ({ ai: document.querySelector('[data-testid="spending-analysis"]')!.getBoundingClientRect().top,
        store: document.querySelector('[data-testid="ranking-store-item"]')!.getBoundingClientRect().bottom }));
    expect(positions.ai).toBeGreaterThan(positions.store);

    // 실행: 코멘트 없이 명시적으로 분석하고 원본 거래 카드와 표를 확인한다.
    await card.getByTestId("spending-analysis-run").click();
    await expect(card.getByTestId("spending-analysis-result")).toContainText("실제 구매 내역을 확인한 결과입니다.");
    expect(state.calls).toEqual([{ periodType: "MONTHLY", year: 2026, month: 10, locale: "ko" }]);
    const finding = card.getByTestId("spending-analysis-finding");
    const summary = finding.locator(":scope > summary");
    await expect(summary).toContainText("관련 지출 합계");
    await expect(summary).toContainText("예상 절약액");
    await expect(finding.getByTestId("spending-analysis-finding-details")).toBeHidden();
    await summary.click();
    await expect(finding.getByTestId("spending-analysis-finding-details")).toContainText("줄일 수 있는 부분");
    await card.getByRole("button", { name: /근거 거래 1건/ }).click();
    const modal = page.getByRole("dialog", { name: /근거 거래/ });
    await expect(modal).toContainText("Amazon USB 케이블");
    await expect(modal.getByRole("button", { name: "거래 수정", exact: true })).toHaveCount(0);
    await expect(modal.getByRole("button", { name: "거래 삭제", exact: true })).toHaveCount(0);
    await modal.getByRole("button", { name: "표", exact: true }).click();
    await expect(modal.getByRole("button", { name: "수정", exact: true })).toHaveCount(0);
    await modal.getByRole("button", { name: "상세", exact: true }).click();
    const detail = page.getByRole("dialog", { name: "Amazon USB 케이블", exact: true });
    await expect(detail).toBeVisible();
    await expect(detail.getByRole("button", { name: "수정 화면으로 이동", exact: true })).toHaveCount(0);

    // 검증: 상세 복귀 시 표 모드 유지, 상단 거래 필터와 AI 분석 기간 독립.
    await page.keyboard.press("Escape");
    await expect(modal.getByRole("table")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: /근거 거래 1건/ })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(card).toBeHidden();
    await expect(page.getByTestId("spending-analysis-open")).toBeFocused();
    await page.locator('select').filter({ has: page.locator('option[value="2026-09"]') }).selectOption("2026-09");
    await page.getByTestId("spending-analysis-open").click();
    await expect(card.getByTestId("spending-analysis-period-input")).toHaveValue("2026-10");
    await card.screenshot({ path: testInfo.outputPath("analysis-monthly.png") });
    expect(state.calls).toHaveLength(1);
    expect(state.unexpected).toEqual([]);
});

test("ACCOUNT-ANALYSIS comment edits remain unapplied until rerun and failure preserves the previous result", async ({ page }) => {
    // 준비
    const state = await mockAnalysisBook(page);
    const card = await openAnalysis(page);
    await card.getByTestId("spending-analysis-run").click();
    await expect(card.getByTestId("spending-analysis-result")).toBeVisible();

    // 실행: 코멘트 수정만으로 유료 요청을 보내지 않고 실패한 재분석 결과를 덮어쓰지 않는다.
    await card.getByRole("textbox", { name: /^추가로 알려주실 내용/ }).fill("이번 달 의료비는 필요한 치료비였어요.");
    await expect(card.getByTestId("spending-analysis-unapplied")).toBeVisible();
    expect(state.calls).toHaveLength(1);
    state.failNextPost = 503;
    await card.getByTestId("spending-analysis-run").click();
    await expect(card.getByRole("alert")).toContainText("현재 AI 분석을 사용할 수 없어요.");
    await expect(card.getByTestId("spending-analysis-result")).toContainText("실제 구매 내역을 확인한 결과입니다.");
    await expect(card.getByTestId("spending-analysis-unapplied")).toBeVisible();
    await card.getByTestId("spending-analysis-run").click();

    // 검증
    await expect(card.getByTestId("spending-analysis-result")).toContainText("추가 설명을 반영한 결과입니다.");
    await expect(card.getByTestId("spending-analysis-unapplied")).toHaveCount(0);
    expect(state.calls.at(-1)?.comment).toBe("이번 달 의료비는 필요한 치료비였어요.");
    expect(state.unexpected).toEqual([]);
});

test("ACCOUNT-ANALYSIS yearly coverage is explicit and stale snapshots never trigger automatic analysis", async ({ page }, testInfo) => {
    // 준비 / 실행
    const state = await mockAnalysisBook(page);
    const card = await openAnalysis(page);
    await card.getByRole("button", { name: "연별", exact: true }).click();
    await card.getByTestId("spending-analysis-period-input").fill("2025");
    await card.getByTestId("spending-analysis-run").click();

    // 검증: 1년 일부 표본을 전체 분석으로 표시하지 않는다.
    await expect(card.getByTestId("spending-analysis-partial")).toContainText("1,200건 중 600건");
    await expect(card.getByTestId("spending-analysis-result")).toContainText("2025-01-01 ~ 2025-12-31");
    expect(state.calls).toEqual([{ periodType: "YEARLY", year: 2025, locale: "ko" }]);
    state.fingerprint = "snapshot-2";
    await nextFocusCheck(page, state);
    await expect(card.getByTestId("spending-analysis-stale")).toBeVisible();
    expect(state.calls).toHaveLength(1);
    await card.screenshot({ path: testInfo.outputPath("analysis-yearly-partial-stale.png") });
    await card.getByTestId("spending-analysis-period-input").fill("9999");
    await expect(card.getByTestId("spending-analysis-run")).toBeDisabled();
    expect(state.unexpected).toEqual([]);
});

test("ACCOUNT-ANALYSIS changing periods or leaving the page keeps a member's job active", async ({ page }) => {
    // 준비: 요청자는 가계부 소유자가 아닌 멤버다.
    const state = await mockAnalysisBook(page);
    const card = await openAnalysis(page);
    state.owner = false;
    state.pauseNext = true;
    await card.getByTestId("spending-analysis-run").evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
    await expect.poll(() => state.calls.length).toBe(1);
    await expect(card.getByTestId("spending-analysis-run")).toBeDisabled();

    // 실행: 기간을 바꾸고 모달을 닫은 뒤에도 작업이 이어진다.
    await card.getByRole("button", { name: "연별", exact: true }).click();
    await expect(card.getByTestId("spending-analysis-run")).toBeDisabled();
    await expect(card.getByTestId("spending-analysis-cancel")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(card).toBeHidden();
    const reopened = await openAnalysis(page);
    await expect(reopened.getByTestId("spending-analysis-job-status")).toContainText("분석 중");
    state.release?.();

    // 검증: 완료 후 알림 링크가 같은 보고서를 열고 읽음 처리한다.
    await page.goto("/ko/account-books/1?spendingAnalysisJob=1&notificationId=9");
    await expect(card.getByTestId("spending-analysis-result")).toContainText("실제 구매 내역을 확인한 결과입니다.");
    await expect.poll(() => state.readNotifications).toEqual(["/api/v1/support/notifications/9/read"]);
    expect(state.calls).toHaveLength(1);
    expect(state.cancelCalls).toEqual([]);
    expect(state.unexpected).toEqual([]);
});

test("ACCOUNT-ANALYSIS the owner can cancel and no late result is displayed", async ({ page }) => {
    // 준비 / 실행
    const state = await mockAnalysisBook(page);
    const card = await openAnalysis(page);
    state.pauseNext = true;
    await card.getByTestId("spending-analysis-run").click();
    await card.getByTestId("spending-analysis-cancel").click();
    state.release?.();

    // 검증
    await expect(card.getByTestId("spending-analysis-job-status")).toContainText("분석이 취소됐어요");
    await expect(card.getByTestId("spending-analysis-run")).toBeEnabled();
    await expect(card.getByTestId("spending-analysis-result")).toHaveCount(0);
    expect(state.cancelCalls).toEqual([1]);
    expect(state.history).toEqual([]);
});

test("ACCOUNT-ANALYSIS preserves a newly completed result and marks it stale when transactions changed", async ({ page }) => {
    // 준비: 같은 기간의 기존 결과가 있는 상태에서 새 분석의 응답을 지연한다.
    const state = await mockAnalysisBook(page);
    const card = await openAnalysis(page);
    await card.getByTestId("spending-analysis-run").click();
    await expect(card.getByTestId("spending-analysis-result")).toBeVisible();
    await card.getByRole("textbox", { name: /^추가로 알려주실 내용/ }).fill("필요한 치료비를 알려드려요.");
    state.pauseNext = true;
    await card.getByTestId("spending-analysis-run").click();
    await expect.poll(() => state.calls.length).toBe(2);

    // 실행: AI 요청 뒤 거래가 변경되고, 이전 지문의 응답이 도착한다.
    state.fingerprint = "snapshot-2";
    state.release?.();

    // 검증: 새 결과는 요청한 시점의 지출을 보존하고 현재 원장과 달라졌음을 표시한다.
    await expect(card.getByTestId("spending-analysis-result")).toContainText("추가 설명을 반영한 결과입니다.");
    await expect(card.getByTestId("spending-analysis-stale")).toBeVisible();
    await expect(card.getByTestId("spending-analysis-unapplied")).toHaveCount(0);
    expect(state.calls).toHaveLength(2);
    expect(state.unexpected).toEqual([]);
});

test("ACCOUNT-ANALYSIS fits 320px and shows a completed paid result even if its follow-up snapshot check fails", async ({ page }, testInfo) => {
    // 준비: AI 응답 이후 메타데이터 확인 실패만 별도로 재현한다.
    await page.setViewportSize({ width: 320, height: 760 });
    const state = await mockAnalysisBook(page);
    const card = await openAnalysis(page);
    await expect(card).toContainText("선택 기간 지출");
    state.failSnapshot = true;
    await card.getByTestId("spending-analysis-run").click();

    // 실행 / 검증: 생성된 결과는 보존하며 별도 상태 조회만 재시도한다.
    await expect(card.getByTestId("spending-analysis-result")).toContainText("실제 구매 내역을 확인한 결과입니다.");
    await expect(card).toContainText("분석 후 거래 변경 여부를 아직 확인하지 못했어요.");
    state.failSnapshot = false;
    await nextFocusCheck(page, state);
    await expect(card.getByText("분석 후 거래 변경 여부를 아직 확인하지 못했어요.", { exact: true })).toHaveCount(0);
    expect(state.calls).toHaveLength(1);
    const widths = await card.evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.width + 1);
    const outside = await card.locator("button, input, textarea").evaluateAll(elements => elements.filter(element => {
        const rect = element.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1;
    }).map(element => element.tagName));
    expect(outside).toEqual([]);
    await card.screenshot({ path: testInfo.outputPath("analysis-320.png") });
    expect(state.unexpected).toEqual([]);
});

for (const locale of ["ja", "en", "learning"] as const) {
    test(`ACCOUNT-ANALYSIS ${locale} uses localized UI and a supported AI response language`, async ({ page }) => {
        // 준비 / 실행
        const state = await mockAnalysisBook(page);
        const card = await openAnalysis(page, locale);
        await card.getByTestId("spending-analysis-run").click();

        // 검증
        await expect(card.getByTestId("spending-analysis-result")).toBeVisible();
        expect(state.calls[0].locale).toBe(locale === "en" ? "en" : "ja");
        await expect(card).toContainText(locale === "en" ? "AI spending analysis" : "AI支出分析");
        expect(state.unexpected).toEqual([]);
    });
}
