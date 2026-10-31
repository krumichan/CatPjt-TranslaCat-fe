import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/mock-test";
import { fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import type { SpendingAnalysisRequest } from "../../src/types/accountBookAnalysis";

function evidenceTransaction(request: SpendingAnalysisRequest, accountBookId = 1) {
    return { id: 11, accountBookId, type: "EXPENSE", title: "Amazon USB 케이블", storeName: "Amazon.co.jp", category: "쇼핑", amount: "1200",
        transactionDate: `${request.year}-${String(request.month ?? 10).padStart(2, "0")}-24`, memo: "공개 테스트 거래", sourceType: null, sourceId: null, sourceYear: null, sourceMonth: null };
}

function analysisResponse(request: SpendingAnalysisRequest, fingerprint: string, accountBookId = 1) {
    const annual = request.periodType === "YEARLY";
    const month = request.month ?? 1;
    const start = `${request.year}-${String(month).padStart(2, "0")}-01`;
    const end = annual ? `${request.year + 1}-01-01` : `${month === 12 ? request.year + 1 : request.year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01`;
    return { periodType: request.periodType, year: request.year, month: annual ? null : month, periodStart: start, periodEndExclusive: end,
        currencyCode: "JPY", decimalPlaces: 0, totalExpense: "54000", transactionCount: annual ? 1200 : 5,
        coverage: { analyzedTransactionCount: annual ? 600 : 5, totalTransactionCount: annual ? 1200 : 5, isPartial: annual, reason: annual ? "TRANSACTION_LIMIT" : null },
        summary: request.comment ? "추가 설명을 반영한 결과입니다. 필요한 치료비를 유지하고 반복 구매를 검토하세요." : "실제 구매 내역을 확인한 결과입니다. 비슷한 소액 구매를 모아 검토해 보세요.",
        findings: [{ id: "finding-1", title: "소액 쇼핑을 구매 전에 확인해 보세요", reason: `${request.year}년 ${request.month ?? 10}월 24일 Amazon.co.jp에서 USB 케이블 구매에 ¥1,200을 사용했습니다.`, action: "다음 소품 구매 전에 이미 보유한 물품을 먼저 확인해 보세요.",
            contextQuestion: "업무에 꼭 필요한 구매였나요?", uncertainty: "이 거래만으로 불필요한 구매라고 단정할 수 없습니다.", evidenceAmount: "1200", evidenceTransactions: [evidenceTransaction(request, accountBookId)] }],
        contextComment: request.comment ?? null, generatedAt: "2026-10-31T12:00:00Z", snapshotFingerprint: fingerprint };
}

async function mockAnalysisBook(page: Page) {
    const state = { fingerprint: "snapshot-1", calls: [] as SpendingAnalysisRequest[], snapshots: [] as string[], failNextPost: 0, failSnapshot: false,
        pauseNext: false, release: null as (() => void) | null, unexpected: [] as string[] };
    const book = { id: 1, name: "AI 분석 검증 가계부", description: "Public mock fixture", category: "개인", currencyCode: "JPY", currencySymbol: "¥", currencyDecimalPlaces: 0,
        incomeAmount: "100000", expenseAmount: "54000", balance: "46000", transactionCount: 5, myRole: "OWNER" };
    await mockCommonPageDependencies(page);
    await mockIdleWebSocket(page);
    await page.route("**/currencies", route => fulfillJson(route, responseDto([{ id: 1, code: "JPY", name: "일본 엔", symbol: "¥", decimalPlaces: 0, baseCurrency: true }])));
    await page.route("**/api/v1/account-books**", async route => {
        const url = new URL(route.request().url());
        const suffix = url.pathname.split("/account-books")[1];
        if (suffix === "/1/spending-analysis/snapshot") {
            state.snapshots.push(url.search);
            if (state.failSnapshot) return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
            return fulfillJson(route, responseDto({ snapshotFingerprint: state.fingerprint, transactionCount: url.searchParams.get("periodType") === "YEARLY" ? 1200 : 5, totalExpense: "54000" }));
        }
        if (suffix === "/1/spending-analysis") {
            const request = route.request().postDataJSON() as SpendingAnalysisRequest;
            state.calls.push(request);
            const response = analysisResponse(request, state.fingerprint);
            if (state.failNextPost) {
                const status = state.failNextPost;
                state.failNextPost = 0;
                return route.fulfill({ status, contentType: "application/json", body: "{}" });
            }
            if (state.pauseNext) {
                state.pauseNext = false;
                await new Promise<void>(resolve => { state.release = resolve; });
                try { await fulfillJson(route, responseDto(response)); } catch { /* 취소된 브라우저 요청의 과거 응답은 적용되지 않는다. */ }
                return;
            }
            return fulfillJson(route, responseDto(response));
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
    const card = page.getByTestId("spending-analysis");
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
    await page.locator('select').filter({ has: page.locator('option[value="2026-09"]') }).selectOption("2026-09");
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

test("ACCOUNT-ANALYSIS duplicate click is suppressed and late canceled monthly response cannot replace yearly results", async ({ page }) => {
    // 준비: 응답 순서를 뒤집어 이전 요청이 늦게 도착하도록 만든다.
    const state = await mockAnalysisBook(page);
    const card = await openAnalysis(page);
    state.pauseNext = true;
    await card.getByTestId("spending-analysis-run").evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
    await expect.poll(() => state.calls.length).toBe(1);
    await expect(card.getByTestId("spending-analysis-run")).toBeDisabled();

    // 실행: 월별 취소 후 연별 결과를 먼저 받는다.
    await card.getByRole("button", { name: "연별", exact: true }).click();
    await card.getByTestId("spending-analysis-period-input").fill("2025");
    await card.getByTestId("spending-analysis-run").click();
    await expect(card.getByTestId("spending-analysis-result")).toContainText("2025-01-01 ~ 2025-12-31");
    state.release?.();

    // 검증: 과거 월별 응답이 현재 연별 결과·기간을 바꾸지 않는다.
    await expect(card.getByTestId("spending-analysis-period-input")).toHaveValue("2025");
    await expect(card.getByTestId("spending-analysis-result")).toContainText("2025-01-01 ~ 2025-12-31");
    expect(state.calls).toHaveLength(2);
    expect(state.unexpected).toEqual([]);
});

test("ACCOUNT-ANALYSIS refuses a newly completed result if transactions changed during the analysis", async ({ page }) => {
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

    // 검증: 새 결과를 덮어쓰지 않고 기존 결과의 오래됨과 미반영 설명을 표시한다.
    await expect(card.getByRole("alert")).toContainText("분석 중 거래가 변경되어 새 결과를 반영하지 않았어요.");
    await expect(card.getByTestId("spending-analysis-result")).toContainText("실제 구매 내역을 확인한 결과입니다.");
    await expect(card.getByTestId("spending-analysis-stale")).toBeVisible();
    await expect(card.getByTestId("spending-analysis-unapplied")).toBeVisible();
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
