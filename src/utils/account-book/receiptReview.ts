import type {
    AccountBookReceiptAnalysisResponse, ReceiptBatchRegistrationRequest,
    ReceiptConversion, ReceiptPaymentItem, ReceiptRegistrationCandidate,
} from "@/types/accountBook";
import { isPositiveDecimal } from "./decimalInput";

export type ReceiptReviewItem = ReceiptRegistrationCandidate & {
    clientId: string; sourceFileName: string; selected: boolean;
    confidence: number | null; detectedLanguage: string | null;
    status: "READY" | "NEEDS_REVIEW" | "UNREADABLE";
    analysisWarnings: string[]; conversion: ReceiptConversion; conversionStale: boolean;
};

export type ReceiptEditableField =
    | "title" | "storeName" | "branchName" | "categoryName"
    | "purchaseTotal" | "cashTendered" | "change" | "originalAmount"
    | "originalCurrencyCode" | "transactionDate" | "transactionTime" | "memo";
export type ReceiptBatchAttempt = { signature: string; idempotencyKey: string };

const CONVERSION_WARNING_CODES = new Set([
    "PREVIOUS_PUBLISHED_RATE", "RATE_UNAVAILABLE", "CURRENCY_REQUIRES_REVIEW",
    "AMOUNT_REQUIRES_REVIEW", "DATE_REQUIRES_REVIEW",
]);
const PAID_TYPES = new Set([
    "CASH", "CREDIT_CARD", "DEBIT_CARD", "ELECTRONIC_MONEY",
    "GIFT_CARD", "VOUCHER", "OTHER_PAID",
]);
const ZERO = BigInt(0);
const DECIMAL_UNIT = BigInt(100000000);

function decimalUnits(value: string | null): bigint | null {
    if (value == null || !/^\d+(?:\.\d{1,8})?$/.test(value.trim())) return null;
    const [whole, fraction = ""] = value.trim().split(".");
    return BigInt(whole) * DECIMAL_UNIT + BigInt(fraction.padEnd(8, "0"));
}

function decimalText(value: bigint): string {
    const whole = value / DECIMAL_UNIT;
    const fraction = (value % DECIMAL_UNIT).toString().padStart(8, "0").replace(/0+$/, "");
    return fraction ? `${whole}.${fraction}` : whole.toString();
}

function recalculateAmountFacts(item: ReceiptReviewItem): ReceiptReviewItem {
    const total = decimalUnits(item.purchaseTotal);
    if (total == null || total <= ZERO) return {
        ...item, originalAmount: "", reviewStatus: "NEEDS_REVIEW",
        amountReason: "MISSING_OR_INVALID_PURCHASE_TOTAL",
    };
    if (!item.paymentBreakdown.length) return {
        ...item, originalAmount: decimalText(total), reviewStatus: "READY",
        amountPolicyVersion: "receipt-book-amount-v1",
        amountReason: "PURCHASE_TOTAL_NO_PAYMENT_ALLOCATION",
    };

    const groups = new Map<string, ReceiptPaymentItem>();
    const collapsed: ReceiptPaymentItem[] = [];
    for (const payment of item.paymentBreakdown) {
        const amount = decimalUnits(payment.amount);
        if (amount == null || amount <= ZERO || payment.paymentType === "UNKNOWN") return {
            ...item, originalAmount: "", reviewStatus: "NEEDS_REVIEW",
            amountReason: "INVALID_PAYMENT_ALLOCATION",
        };
        if (!payment.duplicateGroup) collapsed.push(payment);
        else {
            const previous = groups.get(payment.duplicateGroup);
            if (!previous) { groups.set(payment.duplicateGroup, payment); collapsed.push(payment); }
            else if (previous.paymentType !== payment.paymentType || previous.amount !== payment.amount) return {
                ...item, originalAmount: "", reviewStatus: "NEEDS_REVIEW",
                amountReason: "PAYMENT_DUPLICATE_CONFLICT",
            };
        }
    }
    let points = ZERO;
    let nonCashPaid = ZERO;
    let cashPaid = ZERO;
    for (const payment of collapsed) {
        const amount = decimalUnits(payment.amount)!;
        if (payment.paymentType === "LOYALTY_POINTS") points += amount;
        else if (payment.paymentType === "CASH") cashPaid += amount;
        else if (PAID_TYPES.has(payment.paymentType)) nonCashPaid += amount;
    }
    const hasCash = collapsed.some((payment) => payment.paymentType === "CASH");
    if (item.cashTendered) {
        const tendered = decimalUnits(item.cashTendered);
        const change = decimalUnits(item.change);
        if (tendered == null || change == null || tendered < change) return {
            ...item, originalAmount: "", reviewStatus: "NEEDS_REVIEW", amountReason: "INVALID_CASH_FACTS",
        };
        const netCash = tendered - change;
        if (hasCash && cashPaid !== tendered && cashPaid !== netCash) return {
            ...item, originalAmount: "", reviewStatus: "NEEDS_REVIEW", amountReason: "INVALID_CASH_FACTS",
        };
        cashPaid = netCash;
    } else if (!hasCash && item.change && decimalUnits(item.change) !== ZERO) {
        return { ...item, originalAmount: "", reviewStatus: "NEEDS_REVIEW", amountReason: "INVALID_CASH_FACTS" };
    }
    let paid = nonCashPaid + cashPaid;
    if (points + paid !== total) {
        const ungrouped = collapsed.filter((payment) => !payment.duplicateGroup
            && payment.paymentType !== "CASH" && PAID_TYPES.has(payment.paymentType));
        const unique = new Map(ungrouped.map((payment) => [
            `${payment.paymentType}:${payment.amount}`, decimalUnits(payment.amount)!,
        ]));
        const fixed = collapsed.filter((payment) => payment.paymentType !== "CASH" && payment.duplicateGroup)
            .filter((payment) => PAID_TYPES.has(payment.paymentType))
            .reduce((sum, payment) => sum + decimalUnits(payment.amount)!, cashPaid);
        const deduplicated = [...unique.values()].reduce((sum, amount) => sum + amount, fixed);
        if (unique.size < ungrouped.length && points + deduplicated === total) paid = deduplicated;
        else if (points > ZERO && points < total && cashPaid === ZERO && nonCashPaid === total) {
            paid = total - points;
        }
        else return { ...item, originalAmount: "", reviewStatus: "NEEDS_REVIEW", amountReason: "PAYMENT_TOTAL_MISMATCH" };
    }
    if (paid === ZERO && points === total) return {
        ...item, originalAmount: "0", reviewStatus: "EXCLUDED", amountReason: "FULL_LOYALTY_REDEMPTION",
    };
    return {
        ...item, originalAmount: decimalText(paid), reviewStatus: "READY",
        amountPolicyVersion: "receipt-book-amount-v1",
        amountReason: "SETTLED_PAYMENT_EXCLUDING_LOYALTY_POINTS",
    };
}

export function hasValidReceiptSource(item: ReceiptRegistrationCandidate): boolean {
    const date = item.transactionDate;
    const [integerPart, fractionPart = ""] = item.originalAmount.trim().split(".");
    return isPositiveDecimal(item.originalAmount) && isPositiveDecimal(item.purchaseTotal)
        && item.paymentBreakdown.every((payment) => isPositiveDecimal(payment.amount))
        && item.reviewStatus === "READY" && item.amountPolicyVersion === "receipt-book-amount-v1"
        && item.sourceImageId.trim().length > 0 && item.analysisRevision > 0
        && integerPart.replace(/^0+/, "").length <= 20 && fractionPart.length <= 8
        && /^[A-Z]{3}$/.test(item.originalCurrencyCode)
        && /^\d{4}-\d{2}-\d{2}$/.test(date)
        && (!item.transactionTime || /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(item.transactionTime))
        && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
        && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
}

export function hasValidReceiptFields(item: ReceiptRegistrationCandidate): boolean {
    return hasValidReceiptSource(item)
        && item.title.trim().length > 0 && item.title.trim().length <= 100
        && item.categoryName.trim().length > 0 && item.categoryName.trim().length <= 50
        && (item.storeName?.trim().length ?? 0) <= 100
        && (item.branchName?.trim().length ?? 0) <= 100
        && (item.memo?.trim().length ?? 0) <= 500;
}

export function canRegisterReceipt(item: ReceiptReviewItem): boolean {
    return hasValidReceiptFields(item) && !item.conversionStale
        && ["CONVERTED", "NOT_REQUIRED"].includes(item.conversion.conversionStatus)
        && typeof item.conversion.convertedAmount === "string"
        && isPositiveDecimal(item.conversion.convertedAmount)
        && /^[a-f0-9]{64}$/.test(item.conversion.conversionQuoteId ?? "");
}

export function createReceiptReview(
    response: AccountBookReceiptAnalysisResponse, sourceImageId = "legacy-source",
    analysisRevision = 1, sourceFileName = "receipt",
): ReceiptReviewItem[] {
    return response.receipts.map((item) => {
        const review: ReceiptReviewItem = {
            clientId: `${sourceImageId}:${analysisRevision}:${item.receiptId}`,
            receiptId: item.receiptId, sourceImageId, analysisRevision, sourceFileName,
            title: item.title ?? item.storeName ?? "", storeName: item.storeName ?? "",
            branchName: item.branchName ?? null, categoryName: item.categoryName ?? "",
            purchaseTotal: item.purchaseTotal ?? item.originalAmount ?? "",
            paymentBreakdown: item.paymentBreakdown ?? [], cashTendered: item.cashTendered ?? null,
            change: item.change ?? null, originalAmount: item.bookAmount ?? item.originalAmount ?? "",
            amountPolicyVersion: item.amountPolicyVersion ?? "receipt-book-amount-v1",
            amountReason: item.amountReason ?? "PURCHASE_TOTAL_NO_PAYMENT_ALLOCATION",
            reviewStatus: item.reviewStatus ?? (item.originalAmount ? "READY" : "NEEDS_REVIEW"),
            originalCurrencyCode: item.detectedCurrencyCode ?? "", transactionDate: item.transactionDate ?? "",
            transactionTime: item.transactionTime ?? null,
            memo: item.memo ?? "", conversionQuoteId: item.conversionQuoteId,
            selected: false, confidence: item.confidence, detectedLanguage: item.detectedLanguage,
            status: item.status,
            analysisWarnings: (item.warnings ?? []).filter((warning) => !CONVERSION_WARNING_CODES.has(warning)),
            conversion: { ...item, warnings: item.warnings ?? [] }, conversionStale: false,
        };
        review.selected = item.status === "READY" && canRegisterReceipt(review);
        return review;
    });
}

function staleConversion(item: ReceiptReviewItem): ReceiptConversion {
    return {
        ...item.conversion, convertedAmount: null, exchangeRate: null, requestedRateDate: null,
        effectiveRateDate: null, exchangeRateProvider: null, rateFetchedAt: null, convertedAt: null,
        conversionQuoteId: null, rateDateFallback: false, conversionStatus: "NEEDS_REVIEW", warnings: [],
    };
}

export function editReceiptReview(item: ReceiptReviewItem, field: ReceiptEditableField, value: string): ReceiptReviewItem {
    const nextValue = field === "originalCurrencyCode" ? value.toUpperCase() : value;
    if ((item[field] ?? "") === nextValue) return item;
    const amountFactChanged = ["purchaseTotal", "cashTendered", "change"].includes(field);
    const legacyAmountChanged = field === "originalAmount";
    const sourceChanged = amountFactChanged || legacyAmountChanged
        || ["originalCurrencyCode", "transactionDate"].includes(field);
    let next = { ...item, [field]: nextValue } as ReceiptReviewItem;
    if (legacyAmountChanged && !item.paymentBreakdown.length) next = { ...next, purchaseTotal: nextValue };
    if (amountFactChanged || (legacyAmountChanged && !item.paymentBreakdown.length)) next = recalculateAmountFacts(next);
    return sourceChanged ? { ...next, conversionStale: true, conversion: staleConversion(next) } : next;
}

export function editReceiptPayment(item: ReceiptReviewItem, index: number, amount: string): ReceiptReviewItem {
    const payments = item.paymentBreakdown.map((payment, paymentIndex) =>
        paymentIndex === index ? { ...payment, amount } : payment);
    const next = recalculateAmountFacts({ ...item, paymentBreakdown: payments });
    return { ...next, conversionStale: true, conversion: staleConversion(next) };
}

export function selectReceiptReview(items: ReceiptReviewItem[], clientId: string, selected: boolean): ReceiptReviewItem[] {
    return items.map((item) => item.clientId === clientId ? { ...item, selected } : item);
}

export function receiptSourceKey(item: ReceiptRegistrationCandidate): string {
    return JSON.stringify([item.purchaseTotal, item.paymentBreakdown, item.cashTendered, item.change,
        item.originalAmount, item.originalCurrencyCode, item.transactionDate,
        item.transactionTime,
        item.amountPolicyVersion, item.amountReason, item.reviewStatus]);
}

export function applyReceiptConversion(item: ReceiptReviewItem, sourceKey: string, conversion: ReceiptConversion): ReceiptReviewItem {
    return receiptSourceKey(item) === sourceKey ? { ...item, conversion, conversionStale: false } : item;
}

export function toReceiptCandidate(item: ReceiptReviewItem): ReceiptRegistrationCandidate {
    return {
        receiptId: item.receiptId, title: item.title.trim(), storeName: item.storeName?.trim() || null,
        branchName: item.branchName?.trim() || null, categoryName: item.categoryName.trim(),
        purchaseTotal: item.purchaseTotal.trim(),
        paymentBreakdown: item.paymentBreakdown.map((payment) => ({ ...payment, amount: payment.amount.trim() })),
        cashTendered: item.cashTendered?.trim() || null, change: item.change?.trim() || null,
        originalAmount: item.originalAmount.trim(), originalCurrencyCode: item.originalCurrencyCode.trim().toUpperCase(),
        transactionDate: item.transactionDate, transactionTime: item.transactionTime?.trim() || null,
        memo: item.memo?.trim() || null,
        conversionQuoteId: item.conversion.conversionQuoteId, sourceImageId: item.sourceImageId,
        analysisRevision: item.analysisRevision, amountPolicyVersion: item.amountPolicyVersion,
        amountReason: item.amountReason, reviewStatus: item.reviewStatus,
    };
}

export function buildReceiptBatch(items: ReceiptReviewItem[]): ReceiptBatchRegistrationRequest {
    const selected = items.filter((item) => item.selected);
    if (!selected.length || selected.some((item) => !canRegisterReceipt(item)))
        throw new Error("Selected receipts require review and a current conversion preview.");
    return { receipts: selected.map(toReceiptCandidate) };
}

export function getOrCreateReceiptBatchAttempt(
    previous: ReceiptBatchAttempt | null, request: ReceiptBatchRegistrationRequest,
    createKey: () => string = () => `receipt-${crypto.randomUUID()}`,
): ReceiptBatchAttempt {
    const signature = JSON.stringify(request.receipts);
    return previous?.signature === signature ? previous : { signature, idempotencyKey: createKey() };
}
