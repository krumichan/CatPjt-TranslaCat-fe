import type { ReceiptReviewItem } from "./types";
import type { ReceiptConversion, ReceiptRegistrationCandidate } from "@/types/accountBook";

export function staleConversion(item: ReceiptReviewItem): ReceiptConversion {
    return {
        ...item.conversion,
        convertedAmount: null,
        exchangeRate: null,
        requestedRateDate: null,
        effectiveRateDate: null,
        exchangeRateProvider: null,
        rateFetchedAt: null,
        convertedAt: null,
        conversionQuoteId: null,
        rateDateFallback: false,
        conversionStatus: "NEEDS_REVIEW",
        warnings: [],
    };
}

export function receiptSourceKey(item: ReceiptRegistrationCandidate): string {
    return JSON.stringify([
        item.purchaseTotal,
        item.paymentBreakdown,
        item.cashTendered,
        item.change,
        item.originalAmount,
        item.originalCurrencyCode,
        item.transactionDate,
        item.transactionTime,
        item.amountPolicyVersion,
        item.amountReason,
        item.reviewStatus
    ]);
}

export function applyReceiptConversion(item: ReceiptReviewItem, sourceKey: string, conversion: ReceiptConversion): ReceiptReviewItem {
    return receiptSourceKey(item) === sourceKey ? {
        ...item,
        conversion,
        conversionStale: false
    } : item;
}
