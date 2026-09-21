import type {
    AccountBookReceiptAnalysisResponse,
    ReceiptBatchRegistrationRequest,
    ReceiptConversion,
    ReceiptRegistrationCandidate,
} from "@/types/accountBook";
import { isPositiveDecimal } from "./decimalInput";

export type ReceiptReviewItem = ReceiptRegistrationCandidate & {
    clientId: string;
    selected: boolean;
    confidence: number | null;
    detectedLanguage: string | null;
    status: "READY" | "NEEDS_REVIEW" | "UNREADABLE";
    analysisWarnings: string[];
    conversion: ReceiptConversion;
    conversionStale: boolean;
};

export type ReceiptEditableField = Exclude<keyof ReceiptRegistrationCandidate, "receiptId">;

const CONVERSION_WARNING_CODES = new Set([
    "PREVIOUS_PUBLISHED_RATE", "RATE_UNAVAILABLE", "CURRENCY_REQUIRES_REVIEW",
    "AMOUNT_REQUIRES_REVIEW", "DATE_REQUIRES_REVIEW",
]);

export function hasValidReceiptSource(item: ReceiptRegistrationCandidate): boolean {
    const date = item.transactionDate;
    const [integerPart, fractionPart = ""] = item.originalAmount.trim().split(".");
    return isPositiveDecimal(item.originalAmount)
        && integerPart.replace(/^0+/, "").length <= 20 && fractionPart.length <= 8
        && /^[A-Z]{3}$/.test(item.originalCurrencyCode)
        && /^\d{4}-\d{2}-\d{2}$/.test(date)
        && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
        && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
}

export function hasValidReceiptFields(item: ReceiptRegistrationCandidate): boolean {
    return hasValidReceiptSource(item)
        && item.title.trim().length > 0 && item.title.trim().length <= 100
        && item.categoryName.trim().length > 0 && item.categoryName.trim().length <= 50
        && (item.storeName?.trim().length ?? 0) <= 100 && (item.memo?.trim().length ?? 0) <= 500;
}

export function canRegisterReceipt(item: ReceiptReviewItem): boolean {
    return hasValidReceiptFields(item) && !item.conversionStale
        && ["CONVERTED", "NOT_REQUIRED"].includes(item.conversion.conversionStatus)
        && typeof item.conversion.convertedAmount === "string"
        && isPositiveDecimal(item.conversion.convertedAmount);
}

export function createReceiptReview(response: AccountBookReceiptAnalysisResponse): ReceiptReviewItem[] {
    return response.receipts.map((item, index) => {
        const review: ReceiptReviewItem = {
            clientId: `${item.receiptId}-${index}`,
            receiptId: item.receiptId,
            title: item.title ?? item.storeName ?? "",
            storeName: item.storeName ?? "",
            categoryName: item.categoryName ?? "",
            originalAmount: item.originalAmount ?? "",
            originalCurrencyCode: item.detectedCurrencyCode ?? "",
            transactionDate: item.transactionDate ?? "",
            memo: item.memo ?? "",
            selected: false,
            confidence: item.confidence,
            detectedLanguage: item.detectedLanguage,
            status: item.status,
            analysisWarnings: (item.warnings ?? []).filter((warning) => !CONVERSION_WARNING_CODES.has(warning)),
            conversion: { ...item, warnings: item.warnings ?? [] },
            conversionStale: false,
        };
        review.selected = item.status === "READY" && canRegisterReceipt(review);
        return review;
    });
}

export function editReceiptReview(item: ReceiptReviewItem, field: ReceiptEditableField, value: string): ReceiptReviewItem {
    const nextValue = field === "originalCurrencyCode" ? value.toUpperCase() : value;
    if (item[field] === nextValue) return item;
    const sourceChanged = ["originalAmount", "originalCurrencyCode", "transactionDate"].includes(field);
    return {
        ...item,
        [field]: nextValue,
        conversionStale: item.conversionStale || sourceChanged,
        conversion: sourceChanged ? {
            ...item.conversion,
            convertedAmount: null,
            exchangeRate: null,
            requestedRateDate: null,
            effectiveRateDate: null,
            exchangeRateProvider: null,
            rateDateFallback: false,
            conversionStatus: "NEEDS_REVIEW",
            warnings: [],
        } : item.conversion,
    };
}

export function selectReceiptReview(items: ReceiptReviewItem[], clientId: string, selected: boolean): ReceiptReviewItem[] {
    return items.map((item) => item.clientId === clientId ? { ...item, selected } : item);
}

export function receiptSourceKey(item: ReceiptRegistrationCandidate): string {
    return JSON.stringify([item.originalAmount, item.originalCurrencyCode, item.transactionDate]);
}

export function applyReceiptConversion(item: ReceiptReviewItem, sourceKey: string, conversion: ReceiptConversion): ReceiptReviewItem {
    // A late preview must never replace a newer edit's conversion.
    return receiptSourceKey(item) === sourceKey ? { ...item, conversion, conversionStale: false } : item;
}

export function toReceiptCandidate(item: ReceiptRegistrationCandidate): ReceiptRegistrationCandidate {
    return {
        receiptId: item.receiptId,
        title: item.title.trim(),
        storeName: item.storeName?.trim() || null,
        categoryName: item.categoryName.trim(),
        originalAmount: item.originalAmount.trim(),
        originalCurrencyCode: item.originalCurrencyCode.trim().toUpperCase(),
        transactionDate: item.transactionDate,
        memo: item.memo?.trim() || null,
    };
}

export function buildReceiptBatch(items: ReceiptReviewItem[]): ReceiptBatchRegistrationRequest {
    const selected = items.filter((item) => item.selected);
    if (!selected.length || selected.some((item) => !canRegisterReceipt(item))) {
        throw new Error("Selected receipts require review and a current conversion preview.");
    }
    return { receipts: selected.map(toReceiptCandidate) };
}
