import type { AccountBookTransaction, CurrencyCode } from "./accountBook";

export type SpendingAnalysisPeriod = {
    periodType: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "CUSTOM";
    year: number;
    month?: number;
    quarter?: number;
    half?: number;
    startDate?: string;
    endDate?: string;
};

export type SpendingAnalysisRequest = SpendingAnalysisPeriod & {
    locale: "ko" | "ja" | "en";
    comment?: string;
};

export type SpendingAnalysisJob = {
    id: number;
    periodStart: string;
    periodEndExclusive: string;
    status: "QUEUED" | "RUNNING" | "CANCELING" | "SUCCEEDED" | "FAILED" | "CANCELED";
    canCancel: boolean;
    requestedByMe: boolean;
    analysisId: string | null;
    errorCode: string | null;
};

export type SpendingAnalysisSnapshot = {
    snapshotFingerprint: string;
    transactionCount: number;
    totalExpense: string;
};

export type SpendingAnalysisFinding = {
    id: string;
    title: string;
    reason: string;
    action: string;
    contextQuestion: string | null;
    uncertainty: string | null;
    evidenceAmount: string;
    evidenceTransactions: AccountBookTransaction[];
    opinion?: string | null;
    historicalTransactions?: AccountBookTransaction[];
    savings?: SpendingSavingsScenario | null;
    savingsTransactions?: AccountBookTransaction[];
};

export type SpendingSavingsScenario = {
    basisAmount?: string;
    lower: string; estimate: string; upper: string;
    grossReduction: string; replacementCost: string;
    reductionLowBps: number; reductionHighBps: number;
    replacementLowBps: number; replacementHighBps: number;
    kind: string; assumption: string;
};

export type SpendingAnalysisResponse = {
    periodType: SpendingAnalysisPeriod["periodType"];
    year: number;
    month: number | null;
    periodStart: string;
    periodEndExclusive: string;
    currencyCode: CurrencyCode;
    decimalPlaces: number;
    totalExpense: string;
    transactionCount: number;
    coverage: {
        analyzedTransactionCount: number;
        totalTransactionCount: number;
        isPartial: boolean;
        reason: string | null;
    };
    summary: string;
    findings: SpendingAnalysisFinding[];
    contextComment: string | null;
    generatedAt: string;
    snapshotAt?: string | null;
    snapshotFingerprint: string;
    analysisId?: string;
    quarter?: number | null;
    half?: number | null;
    policyVersion?: string;
    savings?: SpendingSavingsScenario | null;
};

export type SpendingAnalysisHistoryItem = Pick<SpendingAnalysisResponse,
    "analysisId" | "periodType" | "periodStart" | "periodEndExclusive" | "currencyCode" | "totalExpense" | "summary" | "contextComment" | "generatedAt" | "policyVersion" | "savings">;
export type SpendingAnalysisHistoryPage = { items: SpendingAnalysisHistoryItem[]; total: number; page: number; size: number };
