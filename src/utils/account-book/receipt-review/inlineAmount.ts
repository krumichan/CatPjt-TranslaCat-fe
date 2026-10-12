import type { ReceiptReviewItem, ReceiptInlineAmountEditPolicy } from "./types";
import { decimalUnits, ZERO, PAID_TYPES, recalculateAmountFacts } from "./money";
import { staleConversion } from "./conversion";

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
        && (Boolean(item.cashTendered?.trim()) || Boolean(item.change?.trim()) && decimalUnits(item.change) !== ZERO);
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
    // 모달/인라인이 같은 사실을 정정한다. 관측 기록과 결제 배열은 보존한다.
    const paymentBreakdown = policy.mode === "SINGLE_PAYMENT"
        ? item.paymentBreakdown.map((payment, index) => index === policy.paymentIndex ? { ...payment, amount: value } : payment)
        : item.paymentBreakdown;
    const next = recalculateAmountFacts({ ...item, purchaseTotal: value, paymentBreakdown });

    return {
        ...next,
        conversionStale: true,
        conversion: staleConversion(next),
        reviewedRevision: null,
        amountCorrection: { ...observed, correctedAmount: value },
    };
}
