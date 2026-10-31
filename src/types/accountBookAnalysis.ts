import type { AccountBookTransaction, CurrencyCode } from "./accountBook";

export type SpendingAnalysisPeriod = {
    periodType: "MONTHLY" | "YEARLY";
    year: number;
    month?: number;
};

export type SpendingAnalysisRequest = SpendingAnalysisPeriod & {
    locale: "ko" | "ja" | "en";
    comment?: string;
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
    snapshotFingerprint: string;
};
