import { decimalUnits } from "./money";
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
    if (receiptSourceKey(item) !== sourceKey)
        return item;

    // 응답의 원금액·통화·요청일이 현재 draft와 다르면 이전 quote를 붙이지 않는다.
    const successful = ["CONVERTED", "NOT_REQUIRED"].includes(conversion.conversionStatus);
    if (successful && !conversionMatchesReceiptSource(item, conversion)) {
        return { ...item, conversion: staleConversion(item), conversionStale: true };
    }
    return { ...item, conversion, conversionStale: false };
}

/** 상태 플래그와 별개로 서버가 계산한 원본과 현재 금융 필드의 일치를 검사한다. */
export function conversionMatchesReceiptSource(item: ReceiptReviewItem, conversion = item.conversion): boolean {
    const amountMatches = conversion.originalAmount === undefined
        || decimalUnits(conversion.originalAmount) === decimalUnits(item.originalAmount);
    const currencyMatches = conversion.originalCurrencyCode === undefined
        || conversion.originalCurrencyCode === item.originalCurrencyCode;
    return amountMatches && currencyMatches
        && conversion.requestedRateDate === item.transactionDate
        && conversion.accountBookCurrencyCode === item.conversion.accountBookCurrencyCode;
}
