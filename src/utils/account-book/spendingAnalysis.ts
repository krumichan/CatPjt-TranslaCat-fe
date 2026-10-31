import type { SpendingAnalysisPeriod, SpendingAnalysisResponse } from "@/types/accountBookAnalysis";

export function analysisLocale(locale: string): "ko" | "ja" | "en" {
    return locale === "ko" || locale === "en" ? locale : "ja";
}

export function initialAnalysisInputs(selectedMonth: string, now = new Date()) {
    const match = /^(\d{4})-(\d{2})$/.exec(selectedMonth);
    const valid = match && Number(match[1]) >= 2000 && Number(match[1]) <= 9998 && Number(match[2]) >= 1 && Number(match[2]) <= 12;
    const year = valid ? match[1] : String(now.getFullYear());
    const month = valid ? match[2] : String(now.getMonth() + 1).padStart(2, "0");
    return { monthValue: `${year}-${month}`, yearValue: year };
}

export function parseAnalysisPeriod(periodType: SpendingAnalysisPeriod["periodType"], monthValue: string, yearValue: string): SpendingAnalysisPeriod | null {
    if (periodType === "MONTHLY") {
        const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
        if (!match || Number(match[1]) < 2000 || Number(match[1]) > 9998 || Number(match[2]) < 1 || Number(match[2]) > 12) return null;
        return { periodType, year: Number(match[1]), month: Number(match[2]) };
    }
    if (!/^\d{4}$/.test(yearValue) || Number(yearValue) < 2000 || Number(yearValue) > 9998) return null;
    return { periodType, year: Number(yearValue) };
}

export function analysisScopeKey(accountBookId: number, period: SpendingAnalysisPeriod | null, locale: string) {
    return period ? `${accountBookId}:${period.periodType}:${period.year}:${period.month ?? "ALL"}:${locale}` : "INVALID";
}

export function matchesAnalysisPeriod(response: SpendingAnalysisResponse, period: SpendingAnalysisPeriod, accountBookId: number) {
    return response.periodType === period.periodType && response.year === period.year
        && (response.month ?? undefined) === period.month
        && response.findings.every(finding => finding.evidenceTransactions.every(transaction =>
            transaction.accountBookId === accountBookId && transaction.type === "EXPENSE"));
}

export function inclusiveAnalysisEnd(endExclusive: string) {
    const date = new Date(`${endExclusive.slice(0, 10)}T00:00:00Z`);
    if (!Number.isFinite(date.getTime())) return endExclusive;
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}

// React 렌더와 무관한 요청 소유권으로 취소 뒤 도착한 응답과 연속 클릭을 구분한다.
export function createAnalysisRequestCoordinator() {
    let active: { controller: AbortController; scope: string } | null = null;
    return {
        start(scope: string) {
            if (active) return null;
            active = { controller: new AbortController(), scope };
            return active;
        },
        isCurrent(request: { controller: AbortController; scope: string }) {
            return active === request && !request.controller.signal.aborted;
        },
        finish(request: { controller: AbortController; scope: string }) {
            if (active === request) active = null;
        },
        cancel() {
            active?.controller.abort();
            active = null;
        },
    };
}
