import type { ReceiptReviewItem, ReceiptInlineAmountEditPolicy } from "./types";
import { decimalUnits, ZERO, PAID_TYPES } from "./money";
import { editReceiptReview, editReceiptPayment } from "./editing";

export function classifyReceiptInlineAmountEdit(item: ReceiptReviewItem): ReceiptInlineAmountEditPolicy {
    if (!item.paymentBreakdown.length)
        return {
            mode: "SIMPLE_TOTAL",
            paymentIndex: null,
            reason: null
        };
    if (item.paymentBreakdown.some((payment) => payment.paymentType === "LOYALTY_POINTS"))
        return {
            mode: "DETAILS_REQUIRED",
            paymentIndex: null,
            reason: "POINTS"
        };
    if (item.paymentBreakdown.length !== 1)
        return {
            mode: "DETAILS_REQUIRED",
            paymentIndex: null,
            reason: "MULTIPLE_PAYMENTS"
        };
    const [payment] = item.paymentBreakdown;
    const hasCashFacts = payment.paymentType === "CASH"
        && (item.cashTendered !== null || decimalUnits(item.change) !== null && decimalUnits(item.change)! > ZERO);
    if (hasCashFacts)
        return {
            mode: "DETAILS_REQUIRED",
            paymentIndex: null,
            reason: "CASH_CHANGE"
        };
    if (!PAID_TYPES.has(payment.paymentType))
        return {
            mode: "DETAILS_REQUIRED",
            paymentIndex: null,
            reason: "AMBIGUOUS_PAYMENT"
        };

    return {
        mode: "SINGLE_PAYMENT",
        paymentIndex: 0,
        reason: null
    };
}

export function applyReceiptInlineAmountCorrection(item: ReceiptReviewItem, value: string): ReceiptReviewItem | null {
    const policy = classifyReceiptInlineAmountEdit(item);
    if (policy.mode === "DETAILS_REQUIRED")
        return null;
    const observed = item.amountCorrection ?? {
        observedPurchaseTotal: item.purchaseTotal,
        observedOriginalAmount: item.originalAmount,
        observedPaymentAmount: policy.mode === "SINGLE_PAYMENT"
            ? item.paymentBreakdown[policy.paymentIndex]?.amount ?? null : null,
        paymentIndex: policy.paymentIndex,
        correctedAmount: value,
    };
    let next = editReceiptReview(item, "originalAmount", value);
    if (policy.mode === "SINGLE_PAYMENT") {
        next = editReceiptReview(item, "purchaseTotal", value);
        next = editReceiptPayment(next, policy.paymentIndex, value);
    }

    return {
        ...next,
        amountCorrection: { ...observed, correctedAmount: value },
    };
}
