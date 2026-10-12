import type { ReceiptPaymentType } from "@/types/accountBook";
import type { ReceiptReviewItem, ReceiptEditableField } from "./types";
import { recalculateAmountFacts } from "./money";
import { staleConversion } from "./conversion";
import { applyReceiptInlineAmountCorrection } from "./inlineAmount";

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
    // 단순 금액 정정은 입력 위치와 관계없이 구매총액·단일 결제 사실을 함께 갱신한다.
    if (field === "originalAmount" || field === "purchaseTotal") {
        const corrected = applyReceiptInlineAmountCorrection(item, nextValue);
        if (corrected) {
            // 소수점 입력 중간값(예: 15.)을 지우지 않는다. 등록 검증은 유효한 Decimal만 허용한다.
            return field === "originalAmount" ? { ...corrected, originalAmount: nextValue } : corrected;
        }
        // 포인트/복수 결제의 반영액은 상세 사실에서만 계산한다.
        if (field === "originalAmount")
            return item;
    }
    const amountFactChanged = ["purchaseTotal", "cashTendered", "change"].includes(field);
    const sourceChanged = amountFactChanged
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
    if (amountFactChanged) {
        next = recalculateAmountFacts(next);
        if (next.amountCorrection)
            next = { ...next, amountCorrection: { ...next.amountCorrection, correctedAmount: next.originalAmount } };
    }
    next = { ...next, reviewedRevision: null };
    return sourceChanged ? {
        ...next,
        conversionStale: true,
        conversion: staleConversion(next)
    } : next;
}

export function editReceiptPayment(item: ReceiptReviewItem, index: number, amount: string, paymentType?: ReceiptPaymentType): ReceiptReviewItem {
    const current = item.paymentBreakdown[index];
    if (!current)
        return item;

    // 사용자가 정정한 결제 유형과 AI 관측 유형을 구분한다. 원문 근거/중복 그룹은 보존한다.
    const observedPaymentTypes = paymentType && paymentType !== current.paymentType
        ? { ...item.observedPaymentTypes, [index]: item.observedPaymentTypes?.[index] ?? current.paymentType }
        : item.observedPaymentTypes;
    const payments = item.paymentBreakdown.map((payment, paymentIndex) => paymentIndex === index
        ? { ...payment, amount, paymentType: paymentType ?? payment.paymentType } : payment);
    const next = recalculateAmountFacts({ ...item, paymentBreakdown: payments, observedPaymentTypes });

    return {
        ...next,
        amountCorrection: next.amountCorrection ? { ...next.amountCorrection, correctedAmount: next.originalAmount } : null,
        conversionStale: true,
        conversion: staleConversion(next),
        reviewedRevision: null
    };
}
