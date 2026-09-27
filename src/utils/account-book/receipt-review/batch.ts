import type { ReceiptReviewItem, ReceiptBatchAttempt } from "./types";
import type { ReceiptRegistrationCandidate, ReceiptBatchRegistrationRequest } from "@/types/accountBook";
import { canRegisterReceipt } from "./validation";

export function toReceiptCandidate(item: ReceiptReviewItem): ReceiptRegistrationCandidate {
    const candidate: ReceiptRegistrationCandidate = {
        receiptId: item.registrationReceiptId,
        title: item.title.trim(),
        storeName: item.storeName?.trim() || null,
        branchName: item.branchName?.trim() || null,
        categoryName: item.categoryName.trim(),
        categorySource: item.categorySource,
        categoryReason: item.categoryReason?.trim() || null,
        purchaseTotal: item.purchaseTotal.trim(),
        paymentBreakdown: item.paymentBreakdown.map((payment) => ({ ...payment, amount: payment.amount.trim() })),
        cashTendered: item.cashTendered?.trim() || null,
        change: item.change?.trim() || null,
        originalAmount: item.originalAmount.trim(),
        originalCurrencyCode: item.originalCurrencyCode.trim().toUpperCase(),
        transactionDate: item.transactionDate,
        transactionTime: item.transactionTime?.trim() || null,
        memo: item.memo?.trim() || null,
        conversionQuoteId: item.conversion.conversionQuoteId,
        // The provider trace is the durable source link stored by BE. Queue ids remain
        // local UI identities and continue to drive retry/removal/revision handling.
        sourceImageId: item.analysisTraceId ?? item.sourceImageId,
        analysisRevision: item.analysisRevision,
        amountPolicyVersion: item.amountPolicyVersion,
        amountReason: item.amountReason,
        reviewStatus: item.reviewStatus,
    };
    if (item.reviewMode === "ASSISTED")
        Object.assign(
            candidate,
            {
                reviewMode: item.reviewMode,
                draftRevision: item.draftRevision,
                reviewedRevision: item.reviewedRevision,
                sourceRegion: item.sourceRegion,
                branchOmittedByUser: item.branchOmittedByUser,
            }
        );
    return candidate;
}

export function buildReceiptBatch(items: ReceiptReviewItem[]): ReceiptBatchRegistrationRequest {
    const selected = items.filter((item) => item.selected);
    if (!selected.length || selected.some((item) => !canRegisterReceipt(item)))
        throw new Error("Selected receipts require review and a current conversion preview.");

    return { receipts: selected.map(toReceiptCandidate) };
}

export function getOrCreateReceiptBatchAttempt(
    previous: ReceiptBatchAttempt | null,
    request: ReceiptBatchRegistrationRequest,
    createKey: () => string = () => `receipt-${crypto.randomUUID()}`
): ReceiptBatchAttempt {
    const signature = JSON.stringify(request.receipts);
    return previous?.signature === signature ? previous : { signature, idempotencyKey: createKey() };
}
