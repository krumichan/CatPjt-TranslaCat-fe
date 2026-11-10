import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../fixtures/mock-test";
import { fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";

type ChartRequest = {
    year?: number;
    month?: number;
    type?: string;
    keyword?: string;
    page?: number;
    size?: number;
    pagination?: { page: number; size: number; pagingYn: boolean };
    chartFilter?: { type: "CATEGORY" | "STORE"; keys: (string | null)[]; exclude: boolean };
};

const categoryNames = ["생활", "주거", "식비", "교통", "쇼핑", "의료", "기타", "문화", "교육", "미분류"];
const storeNames = ["카페 하늘 (통합)", "Suica", "Amazon.co.jp", "약국", "상점 A", "상점 B", "기타", "작은 매장", "교통 매장", "미등록"];
const book = {
    id: 1, name: "그래프 상세 검증 가계부", description: "공개 mock fixture", category: "개인",
    currencyCode: "JPY", currencySymbol: "¥", currencyDecimalPlaces: 0,
    incomeAmount: "100000", expenseAmount: "55000", balance: "45000", transactionCount: 21, myRole: "OWNER",
};

function transaction(id: number, title: string, category = "생활", storeName = "카페 하늘 신주쿠점") {
    return {
        id, accountBookId: 1, type: "EXPENSE", title, category, storeName, amount: "1000",
        transactionDate: "2026-10-20", memo: "공개 테스트 거래", sourceType: null,
        sourceId: null, sourceYear: null, sourceMonth: null,
    };
}

async function mockCharts(page: Page, options: { failFirstChartRequest?: boolean } = {}) {
    const requests: ChartRequest[] = [];
    const unexpected: string[] = [];
    let failed = false;
    await mockCommonPageDependencies(page);
    await mockIdleWebSocket(page);
    await page.route("**/currencies", route => fulfillJson(route, responseDto([
        { id: 1, code: "JPY", name: "일본 엔", symbol: "¥", decimalPlaces: 0, baseCurrency: true },
    ])));
    await page.route("**/api/v1/account-books**", async route => {
        const request = route.request();
        const url = new URL(request.url());
        const suffix = url.pathname.split("/account-books")[1];
        let body: unknown;

        // 준비: 차트 조회 기간과 원래 집계 키를 모달 요청에서 독립적으로 확인한다.
        if (suffix === "/1/spending-analysis/jobs/current" && request.method() === "GET") {
            return fulfillJson(route, responseDto(null));
        }
        if (suffix === "/1/transactions") {
            const input = request.postDataJSON() as ChartRequest;
            if (input.chartFilter) {
                requests.push(input);
                if (options.failFirstChartRequest && !failed) {
                    failed = true;
                    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "mock chart request failure" }) });
                    return;
                }
            }
            const filter = input.chartFilter;
            const pageIndex = input.pagination ? input.pagination.page - 1 : input.page ?? 0;
            let content = [transaction(1, "기본 거래")];
            let totalElements = 1;
            if (filter?.type === "CATEGORY" && filter.keys.length === 1 && filter.keys[0] === "생활") {
                totalElements = 21;
                content = Array.from({ length: pageIndex === 0 ? 20 : 1 }, (_, index) =>
                    transaction(pageIndex * 20 + index + 10, `생활 거래 ${String(pageIndex * 20 + index + 1).padStart(2, "0")}`));
            } else if (filter?.type === "STORE") {
                content = [transaction(41, "신주쿠 지점 거래"), transaction(42, "시부야 지점 거래", "식비", "카페 하늘 시부야점")];
                totalElements = content.length;
            } else if (filter?.exclude) {
                content = categoryNames.slice(7).map((name, index) => transaction(51 + index, `${name} 묶음 거래`, name === "미분류" ? "" : name));
                totalElements = content.length;
            } else if (filter) {
                content = [transaction(61, "실제 기타 카테고리 거래", "기타")];
            }
            body = { page: { content, page: { size: 20, number: pageIndex, totalElements, totalPages: Math.ceil(totalElements / 20) } }, currencyName: "JPY" };
        } else switch (suffix) {
            case "": body = [book]; break;
            case "/1": body = book; break;
            case "/1/summary": body = { ...book, accountBookId: 1 }; break;
            case "/1/spending-analysis/snapshot": body = { snapshotFingerprint: "graph-fixture-stable", transactionCount: 21, totalExpense: "55000" }; break;
            case "/1/categories": body = categoryNames.slice(0, -1).map((name, index) => ({ id: index + 1, accountBookId: 1, name, active: true, displayOrder: index })); break;
            case "/1/transactions/months": body = [
                { value: "2026-10", label: "2026년 10월", year: 2026, month: 10, currentMonth: true },
                { value: "2026-09", label: "2026년 9월", year: 2026, month: 9, currentMonth: false },
            ]; break;
            case "/1/transactions/stores/suggestions": body = [{ storeName: "카페 하늘" }]; break;
            case "/1/monthly-goals": body = { id: 1, accountBookId: 1, year: 2026, month: 10, goalAmount: "60000", expenseAmount: "55000", remainingAmount: "5000", usageRate: 91.67, exceeded: false }; break;
            case "/1/monthly-goals/list": body = []; break;
            case "/1/charts/monthly": body = { year: 2026, months: Array.from({ length: 12 }, (_, index) => ({ year: 2026, month: index + 1, incomeAmount: "100000", expenseAmount: "55000", balance: "45000", expenseGoalAmount: "60000" })) }; break;
            case "/1/charts/categories":
            case "/1/charts/stores": {
                const names = suffix.endsWith("categories") ? categoryNames : storeNames;
                body = {
                    year: url.searchParams.has("year") ? Number(url.searchParams.get("year")) : null,
                    month: url.searchParams.has("month") ? Number(url.searchParams.get("month")) : null,
                    totalAmount: "55000", items: names.map((name, index) => ({
                        name, amount: String((10 - index) * 1000), percentage: Math.round((10 - index) * 10000 / 55) / 100,
                        transactionCount: index === 0 ? 21 : 1,
                        groupKey: index === 9 ? null : suffix.endsWith("stores") && index === 0 ? "카페하늘" : name,
                    })),
                };
                break;
            }
            case "/1/fixed-costs": body = []; break;
            case "/1/fixed-costs/generation-targets": body = { year: 2026, month: 10, count: 0, targets: [] }; break;
            case "/1/members": body = [{ id: 1, userId: 1, publicId: "mock-owner", username: "Mock owner", role: "OWNER" }]; break;
            case "/1/invitations": body = []; break;
            default:
                unexpected.push(`${request.method()} ${suffix}`);
                await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
                return;
        }
        await fulfillJson(route, responseDto(body));
    });
    return { requests, unexpected };
}

async function openBook(page: Page) {
    await page.goto("/ko/account-books/1", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("ranking-category-item")).toHaveCount(8);
    await expect(page.getByTestId("ranking-store-item")).toHaveCount(8);
}

async function expectReadOnly(modal: Locator) {
    await expect(modal.getByRole("button", { name: "거래 수정", exact: true })).toHaveCount(0);
    await expect(modal.getByRole("button", { name: "거래 삭제", exact: true })).toHaveCount(0);
    await expect(modal.getByRole("button", { name: "수정", exact: true })).toHaveCount(0);
    await expect(modal.getByRole("button", { name: "삭제", exact: true })).toHaveCount(0);
}

test("ACCOUNT-CHART category drilldown keeps period, pagination and read-only card/table/detail", async ({ page }, testInfo) => {
    test.setTimeout(300_000);

    // 준비: 기본 거래이력은 관리 버튼을 유지하고 그래프 모달만 읽기 전용으로 연다.
    const fixture = await mockCharts(page);
    await openBook(page);
    const mainList = page.getByTestId("account-book-transactions");
    await expect(mainList.getByRole("button", { name: "거래 수정", exact: true })).toBeVisible();
    await expect(mainList.getByRole("button", { name: "거래 삭제", exact: true })).toBeVisible();
    const month = page.locator('select').filter({ has: page.locator('option[value="2026-09"]') });
    await month.selectOption("2026-09");
    const trigger = page.getByTestId("ranking-category-item").first();

    // 실행: 선택 월의 생활 지출을 카드에서 확인하고 두 번째 페이지까지 이동한다.
    await trigger.click();
    const modal = page.getByTestId("ranking-transactions-modal");
    await expect(modal).toContainText("생활 · 거래 내역");
    await expect(modal).toContainText("2026년 9월");
    await expect(modal.getByRole("button", { name: "거래 상세보기", exact: true })).toHaveCount(20);
    await expectReadOnly(modal);
    await expect.poll(() => fixture.requests.length).toBeGreaterThan(0);
    expect(fixture.requests[0]).toEqual({ year: 2026, month: 9, type: "EXPENSE", chartFilter: { type: "CATEGORY", keys: ["생활"], exclude: false }, pagination: { page: 1, size: 20, pagingYn: true } });
    await modal.getByRole("button", { name: "다음", exact: true }).click();
    await expect(modal).toContainText("생활 거래 21");
    await expect(modal).toContainText("2 / 2");
    expect(fixture.requests.at(-1)).toEqual({ ...fixture.requests[0], pagination: { page: 2, size: 20, pagingYn: true } });

    // 검증: 표와 상세 화면에서도 편집 진입이 없고 Escape는 원래 모달로 돌아온다.
    await modal.getByRole("button", { name: "표", exact: true }).click();
    await expect(modal.getByRole("table")).toBeVisible();
    await expectReadOnly(modal);
    await modal.getByRole("button", { name: "이전", exact: true }).click();
    await expect(modal.getByRole("table")).toBeVisible();
    await expect(modal).toContainText("생활 거래 01");
    await modal.getByRole("button", { name: "다음", exact: true }).click();
    await expect(modal.getByRole("table")).toBeVisible();
    await modal.getByRole("button", { name: "상세", exact: true }).click();
    const detail = page.getByRole("dialog", { name: "생활 거래 21", exact: true });
    await expect(detail).toBeVisible();
    await expect(detail.getByRole("button", { name: "수정 화면으로 이동", exact: true })).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("생활 거래 21");
    await expect(modal.getByRole("table")).toBeVisible();
    await expect.poll(() => modal.evaluate(element => element.contains(document.activeElement))).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("category-readonly-page2.png"), fullPage: false });
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(fixture.unexpected).toEqual([]);
});

test("ACCOUNT-CHART uses normalized store key and distinguishes real other from synthetic other", async ({ page }) => {
    // 준비: 동일 이름의 실제 기타와 3개 원래 키를 합친 기타가 동시에 존재한다.
    const fixture = await mockCharts(page);
    await openBook(page);

    // 실행: 매장 표시명 대신 정규화 집계 키를 전달하고 두 지점 거래를 확인한다.
    await page.getByTestId("ranking-store-item").first().click();
    const modal = page.getByTestId("ranking-transactions-modal");
    await expect(modal).toContainText("신주쿠 지점 거래");
    await expect(modal).toContainText("시부야 지점 거래");
    expect(fixture.requests.at(-1)?.chartFilter).toEqual({ type: "STORE", keys: ["카페하늘"], exclude: false });
    await page.keyboard.press("Escape");
    await page.getByTestId("ranking-category-item").nth(6).click();
    await expect(modal).toContainText("실제 기타 카테고리 거래");
    expect(fixture.requests.at(-1)?.chartFilter).toEqual({ type: "CATEGORY", keys: ["기타"], exclude: false });
    await page.keyboard.press("Escape");
    await page.getByTestId("ranking-category-item").nth(7).click();

    // 검증: 합산 항목은 문화·교육·미분류만 조회하고 다음 선택에서 0페이지로 시작한다.
    await expect(modal).toContainText("문화 묶음 거래");
    await expect(modal).toContainText("교육 묶음 거래");
    await expect(modal).toContainText("미분류 묶음 거래");
    expect(fixture.requests.at(-1)?.chartFilter).toEqual({ type: "CATEGORY", keys: categoryNames.slice(0, 7), exclude: true });
    expect(fixture.requests.at(-1)?.pagination?.page).toBe(1);
    expect(fixture.unexpected).toEqual([]);
});

test("ACCOUNT-CHART retries a failed request and fits a 320px screen", async ({ page }, testInfo) => {
    // 준비: 선택 거래 조회만 한 번 실패시키고 모바일 너비에서 실제 모달을 연다.
    await page.setViewportSize({ width: 320, height: 760 });
    const fixture = await mockCharts(page, { failFirstChartRequest: true });
    await openBook(page);
    const trigger = page.getByTestId("ranking-category-item").first();
    await trigger.click();
    const modal = page.getByTestId("ranking-transactions-modal");
    await expect(modal.getByRole("alert")).toContainText("거래 내역을 불러오지 못했습니다.");

    // 실행: 수동 재시도 뒤 읽기 전용 목록을 복구한다.
    await modal.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(modal.getByRole("button", { name: "거래 상세보기", exact: true })).toHaveCount(20);
    await expectReadOnly(modal);
    expect(fixture.requests.length).toBe(2);

    // 검증: 가로 클리핑 없이 모든 조작 버튼이 화면 안에 있고 포커스가 모달에 갇힌다.
    const modalWidth = await modal.evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(modalWidth.scroll).toBeLessThanOrEqual(modalWidth.width + 1);
    const outsideButtons = await modal.getByRole("button").evaluateAll(buttons => buttons.filter(button => {
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
    }).map(button => button.textContent));
    expect(outsideButtons).toEqual([]);
    await modal.getByRole("button").first().focus();
    await page.keyboard.press("Shift+Tab");
    await expect(modal.getByRole("button").last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(modal.getByRole("button").first()).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath("category-readonly-320.png"), fullPage: false });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(fixture.unexpected).toEqual([]);
});
