import assert from "node:assert/strict";
import test from "node:test";
import { analysisLocale, analysisScopeKey, createAnalysisRequestCoordinator, initialAnalysisInputs, inclusiveAnalysisEnd, matchesAnalysisPeriod, parseAnalysisPeriod } from "../../src/utils/account-book/spendingAnalysis.ts";

test("analysis period selection rejects invalid months and keeps yearly requests free of a month", () => {
    // 준비 / 실행
    const monthly = parseAnalysisPeriod("MONTHLY", "2026-10", "2025");
    const yearly = parseAnalysisPeriod("YEARLY", "2026-10", "2025");

    // 검증: 다른 선택값이 요청 기간에 섞이지 않는다.
    assert.deepEqual(monthly, { periodType: "MONTHLY", year: 2026, month: 10 });
    assert.deepEqual(yearly, { periodType: "YEARLY", year: 2025 });
    for (const value of ["", "2026-00", "2026-13", "0000-10", "1999-10", "9999-10", "2026-1", "ALL"]) assert.equal(parseAnalysisPeriod("MONTHLY", value, "2026"), null);
    for (const value of ["", "0", "1999", "9999", "10000", "2e3", "-1", "2026.5"]) assert.equal(parseAnalysisPeriod("YEARLY", "2026-10", value), null);
    assert.notEqual(analysisScopeKey(1, monthly, "ko"), analysisScopeKey(2, monthly, "ko"));
    assert.notEqual(analysisScopeKey(1, monthly, "ko"), analysisScopeKey(1, yearly, "ko"));
});

test("analysis defaults to the selected book month and falls back from all-period to the current month", () => {
    // 준비
    const now = new Date(2026, 9, 31, 12);

    // 실행 / 검증
    assert.deepEqual(initialAnalysisInputs("2025-02", now), { monthValue: "2025-02", yearValue: "2025" });
    assert.deepEqual(initialAnalysisInputs("ALL", now), { monthValue: "2026-10", yearValue: "2026" });
    assert.deepEqual(initialAnalysisInputs("2025-99", now), { monthValue: "2026-10", yearValue: "2026" });
    assert.equal(analysisLocale("learning"), "ja");
});

test("duplicate analysis is suppressed and a canceled late response cannot own the next period", async () => {
    // 준비: 월별 요청이 끝나기 전에 연별로 바꾸는 순서를 만든다.
    const coordinator = createAnalysisRequestCoordinator();
    const month = coordinator.start("book-1:2026-10");
    assert.equal(coordinator.start("book-1:2026-10"), null);
    let release;
    const oldResponse = new Promise(resolve => { release = resolve; });
    const applied = [];
    const completion = oldResponse.then(() => {
        if (coordinator.isCurrent(month)) applied.push("old-month");
        coordinator.finish(month);
    });

    // 실행: 취소 후 새 요청이 시작되고 과거 응답이 뒤늦게 도착한다.
    coordinator.cancel();
    const year = coordinator.start("book-1:2026");
    release();
    await completion;

    // 검증: 과거 finish도 현재 요청을 지우지 않는다.
    assert.equal(month.controller.signal.aborted, true);
    assert.equal(coordinator.isCurrent(month), false);
    assert.equal(coordinator.isCurrent(year), true);
    assert.deepEqual(applied, []);
    coordinator.finish(year);
    assert.ok(coordinator.start("book-1:2027"));
    coordinator.cancel();
});

test("responses for a different period, account book, or income evidence are rejected", () => {
    // 준비
    const period = { periodType: "MONTHLY", year: 2026, month: 10 };
    const transaction = { accountBookId: 1, type: "EXPENSE" };
    const response = { ...period, findings: [{ evidenceTransactions: [transaction] }] };

    // 실행 / 검증
    assert.equal(matchesAnalysisPeriod(response, period, 1), true);
    assert.equal(matchesAnalysisPeriod({ ...response, month: 9 }, period, 1), false);
    assert.equal(matchesAnalysisPeriod(response, period, 2), false);
    assert.equal(matchesAnalysisPeriod({ ...response, findings: [{ evidenceTransactions: [{ ...transaction, type: "INCOME" }] }] }, period, 1), false);
    assert.equal(matchesAnalysisPeriod({ periodType: "YEARLY", year: 2026, month: null, findings: [] }, { periodType: "YEARLY", year: 2026 }, 1), true);
});

test("analysis range labels respect exclusive bounds across leap days and year boundaries", () => {
    // 준비 / 실행 / 검증
    assert.equal(inclusiveAnalysisEnd("2024-03-01"), "2024-02-29");
    assert.equal(inclusiveAnalysisEnd("2027-01-01"), "2026-12-31");
    assert.equal(inclusiveAnalysisEnd("invalid"), "invalid");
});

test("custom ranges use inclusive calendar-month boundaries, including short February", () => {
    // 준비 / 실행 / 검증
    const values = { startValue: "2026-01-31", endValue: "2026-02-27" };
    assert.deepEqual(parseAnalysisPeriod("CUSTOM", "", "", values), { periodType: "CUSTOM", year: 2026, startDate: "2026-01-31", endDate: "2026-02-27" });
    assert.equal(parseAnalysisPeriod("CUSTOM", "", "", { ...values, endValue: "2026-02-26" }), null);
    assert.equal(parseAnalysisPeriod("CUSTOM", "", "", { ...values, endValue: "2026-02-30" }), null);
    assert.equal(parseAnalysisPeriod("CUSTOM", "", "", { ...values, endValue: "2025-12-31" }), null);
});

test("quarter and half requests reject stray calendar values and have distinct identities", () => {
    // 준비 / 실행
    const quarter = parseAnalysisPeriod("QUARTERLY", "2026-10", "2026", { quarterValue: "4" });
    const half = parseAnalysisPeriod("HALF_YEARLY", "2026-10", "2026", { halfValue: "2" });

    // 검증
    assert.deepEqual(quarter, { periodType: "QUARTERLY", year: 2026, quarter: 4 });
    assert.deepEqual(half, { periodType: "HALF_YEARLY", year: 2026, half: 2 });
    assert.notEqual(analysisScopeKey(1, quarter, "ko"), analysisScopeKey(1, half, "ko"));
    assert.equal(parseAnalysisPeriod("QUARTERLY", "", "2026", { quarterValue: "5" }), null);
    assert.equal(parseAnalysisPeriod("HALF_YEARLY", "", "2026", { halfValue: "0" }), null);
});
