import type { ReceiptReviewItem, ReceiptEditableField } from "./types";
import { recalculateAmountFacts } from "./money";
import { staleConversion } from "./conversion";

export function completeReceiptReview(item: ReceiptReviewItem): ReceiptReviewItem {
    return { ...item, reviewedRevision: item.draftRevision };
}

export function omitReceiptBranch(item: ReceiptReviewItem): ReceiptReviewItem {
    return {
        ...item,
        branchName: null,
        branchOmittedByUser: true,
        reviewedRevision: null,
    };
}

export function editReceiptReview(item: ReceiptReviewItem, field: ReceiptEditableField, value: string): ReceiptReviewItem {
    const nextValue = field === "originalCurrencyCode" ? value.toUpperCase() : value;
    if ((item[field] ?? "") === nextValue)
        return item;
    const amountFactChanged = ["purchaseTotal", "cashTendered", "change"].includes(field);
    const legacyAmountChanged = field === "originalAmount";
    const sourceChanged = amountFactChanged || legacyAmountChanged
        || ["originalCurrencyCode", "transactionDate"].includes(field);
    let next = { ...item, [field]: nextValue } as ReceiptReviewItem;
    if (field === "categoryName")
        next = {
            ...next,
            categorySelection: nextValue,
            directCategoryName: "",
            categorySource: "USER",
            categoryReason: "USER_EDITED",
        };
    if (legacyAmountChanged && !item.paymentBreakdown.length)
        next = { ...next, purchaseTotal: nextValue };
    if (amountFactChanged || (legacyAmountChanged && !item.paymentBreakdown.length))
        next = recalculateAmountFacts(next);
    next = { ...next, reviewedRevision: null };
    return sourceChanged ? {
        ...next,
        conversionStale: true,
        conversion: staleConversion(next)
    } : next;
}

export function editReceiptPayment(item: ReceiptReviewItem, index: number, amount: string): ReceiptReviewItem {
    const payments = item.paymentBreakdown.map((payment, paymentIndex) => paymentIndex === index ? { ...payment, amount } : payment);
    const next = recalculateAmountFacts({ ...item, paymentBreakdown: payments });

    return {
        ...next,
        conversionStale: true,
        conversion: staleConversion(next),
        reviewedRevision: null
    };
}
