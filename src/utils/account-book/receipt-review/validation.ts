import type { ReceiptRegistrationCandidate } from "@/types/accountBook";
import { isPositiveDecimal } from "../decimalInput";
import type {
    ReceiptReviewItem,
    ReceiptRegistrationValidation,
    ReceiptBlockingIssue,
    ReceiptBlockingField
} from "./types";
import { isValidPositiveMoney } from "./money";

export function isValidSourceRegion(value: number[] | null): value is [
    number,
    number,
    number,
    number
] {
    return Boolean(value && value.length === 4
        && value.every((part) => Number.isFinite(part) && part >= 0 && part <= 1)
        && value[0] < value[2] && value[1] < value[3]);
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
    return validateReceiptForRegistration(item).registrable;
}

export function validateReceiptForRegistration(item: ReceiptReviewItem): ReceiptRegistrationValidation {
    const blockingIssues: ReceiptBlockingIssue[] = [];
    const add = (code: ReceiptBlockingIssue["code"], field: ReceiptBlockingField) => blockingIssues.push({ code, field });
    const title = item.title.trim();
    const category = item.categoryName.trim();
    if (!title)
        add("TITLE_REQUIRED", "title");
    else if (title.length > 100)
        add("TITLE_TOO_LONG", "title");
    if (!category)
        add("CATEGORY_REQUIRED", "categoryName");
    else if (category.length > 50)
        add("CATEGORY_TOO_LONG", "categoryName");
    if ((item.storeName?.trim().length ?? 0) > 100)
        add("STORE_TOO_LONG", "storeName");
    if ((item.branchName?.trim().length ?? 0) > 100)
        add("BRANCH_TOO_LONG", "branchName");
    if ((item.memo?.trim().length ?? 0) > 500)
        add("MEMO_TOO_LONG", "memo");
    if (!isValidPositiveMoney(item.purchaseTotal))
        add("PURCHASE_TOTAL_INVALID", "purchaseTotal");
    if (item.paymentBreakdown.some((payment) => !isValidPositiveMoney(payment.amount)))
        add("PAYMENT_INVALID", "paymentBreakdown");
    if (!isValidPositiveMoney(item.originalAmount) || item.reviewStatus !== "READY")
        add("BOOK_AMOUNT_INVALID", "originalAmount");
    if (item.amountPolicyVersion !== "receipt-book-amount-v1")
        add("AMOUNT_POLICY_INVALID", "originalAmount");
    if (!/^[A-Z]{3}$/.test(item.originalCurrencyCode))
        add("CURRENCY_INVALID", "originalCurrencyCode");
    const date = item.transactionDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)
        || !Number.isFinite(Date.parse(`${date}T00:00:00Z`))
        || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)
        add("DATE_INVALID", "transactionDate");
    if (item.transactionTime && !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(item.transactionTime))
        add("TIME_INVALID", "transactionTime");
    if (!item.sourceImageId.trim() || item.analysisRevision <= 0)
        add("SOURCE_INVALID", "source");
    else if (item.reviewMode === "ASSISTED" && !isValidSourceRegion(item.sourceRegion))
        add("SOURCE_INVALID", "source");
    if (item.conversionStale)
        add("QUOTE_STALE", "conversion");
    else if (!["CONVERTED", "NOT_REQUIRED"].includes(item.conversion.conversionStatus)
        || typeof item.conversion.convertedAmount !== "string"
        || !isValidPositiveMoney(item.conversion.convertedAmount))
        add("CONVERSION_UNAVAILABLE", "conversion");
    if (!item.conversionStale && !/^[a-f0-9]{64}$/.test(item.conversion.conversionQuoteId ?? ""))
        add("QUOTE_MISSING", "conversion");
    if (item.reviewMode === "ASSISTED" && item.reviewedRevision !== item.draftRevision)
        add("REVIEW_CONFIRMATION_REQUIRED", "review");

    return {
        registrable: blockingIssues.length === 0,
        blockingIssues,
        advisoryWarnings: [...new Set([...item.analysisWarnings, ...(item.conversion.warnings ?? [])])],
    };
}

export function summarizeReceiptSelection(items: ReceiptReviewItem[]) {
    const selected = items.filter((item) => item.selected);
    const registrableCount = selected.filter((item) => validateReceiptForRegistration(item).registrable).length;

    return {
        selectedCount: selected.length,
        registrableCount,
        blockedCount: selected.length - registrableCount
    };
}

export function selectRegisterableReceiptReviews(items: ReceiptReviewItem[]): ReceiptReviewItem[] {
    return items.map((item) => ({ ...item, selected: validateReceiptForRegistration(item).registrable }));
}

export function selectReceiptReview(items: ReceiptReviewItem[], clientId: string, selected: boolean): ReceiptReviewItem[] {
    return items.map((item) => item.clientId === clientId ? { ...item, selected } : item);
}
