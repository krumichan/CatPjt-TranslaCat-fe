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

export type SpendingAnalysisInputs = { periodType: SpendingAnalysisPeriod["periodType"]; monthValue: string; yearValue: string; quarterValue: string; halfValue: string; startValue: string; endValue: string };

function validDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? parsed : null;
}

export function parseAnalysisPeriod(periodType: SpendingAnalysisPeriod["periodType"], monthValue: string, yearValue: string,
    extras: Partial<SpendingAnalysisInputs> = {}): SpendingAnalysisPeriod | null {
    if (periodType === "CUSTOM") {
        const start = validDate(extras.startValue ?? ""), end = validDate(extras.endValue ?? "");
        if (!start || !end || start.getUTCFullYear() < 2000 || end.getUTCFullYear() > 9998) return null;
        // 말일은 다음 달의 마지막 날짜로 보정한다. 끝 날짜는 선택 기간에 포함한다.
        const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
        const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
        next.setUTCDate(Math.min(start.getUTCDate(), lastDay));
        const exclusive = new Date(end); exclusive.setUTCDate(exclusive.getUTCDate() + 1);
        if (exclusive < next) return null;
        return { periodType, year: start.getUTCFullYear(), startDate: extras.startValue, endDate: extras.endValue };
    }
    if (periodType === "MONTHLY") {
        const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
        if (!match || Number(match[1]) < 2000 || Number(match[1]) > 9998 || Number(match[2]) < 1 || Number(match[2]) > 12) return null;
        return { periodType, year: Number(match[1]), month: Number(match[2]) };
    }
    if (!/^\d{4}$/.test(yearValue) || Number(yearValue) < 2000 || Number(yearValue) > 9998) return null;
    if (periodType === "QUARTERLY") {
        if (!/^[1-4]$/.test(extras.quarterValue ?? "")) return null;
        return { periodType, year: Number(yearValue), quarter: Number(extras.quarterValue) };
    }
    if (periodType === "HALF_YEARLY") {
        if (!/^[1-2]$/.test(extras.halfValue ?? "")) return null;
        return { periodType, year: Number(yearValue), half: Number(extras.halfValue) };
    }
    return { periodType, year: Number(yearValue) };
}

export function analysisScopeKey(accountBookId: number, period: SpendingAnalysisPeriod | null, locale: string) {
    return period ? `${accountBookId}:${period.periodType}:${period.year}:${period.month ?? "ALL"}:${period.quarter ?? ""}:${period.half ?? ""}:${period.startDate ?? ""}:${period.endDate ?? ""}:${locale}` : "INVALID";
}

export function matchesAnalysisPeriod(response: SpendingAnalysisResponse, period: SpendingAnalysisPeriod, accountBookId: number) {
    return response.periodType === period.periodType && response.year === period.year
        && (response.month ?? undefined) === period.month
        && (response.quarter ?? undefined) === period.quarter && (response.half ?? undefined) === period.half
        && (period.periodType !== "CUSTOM" || (response.periodStart === period.startDate && inclusiveAnalysisEnd(response.periodEndExclusive) === period.endDate))
        && response.findings.every(finding => finding.evidenceTransactions.every(transaction =>
            transaction.accountBookId === accountBookId && transaction.type === "EXPENSE")
            && (finding.historicalTransactions ?? []).every(transaction => transaction.accountBookId === accountBookId && transaction.type === "EXPENSE"));
}

export function inputsFromAnalysis(response: SpendingAnalysisResponse): SpendingAnalysisInputs {
    return { periodType: response.periodType, monthValue: response.periodStart.slice(0, 7), yearValue: String(response.year),
        quarterValue: String(response.quarter ?? 1), halfValue: String(response.half ?? 1),
        startValue: response.periodStart, endValue: inclusiveAnalysisEnd(response.periodEndExclusive) };
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
