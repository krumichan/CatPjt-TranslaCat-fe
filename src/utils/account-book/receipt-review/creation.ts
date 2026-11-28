import type { AccountBookReceiptAnalysisResponse } from "@/types/accountBook";
import type { ReceiptReviewItem } from "./types";
import { recalculateAmountFacts } from "./money";
import { staleConversion } from "./conversion";

export const CONVERSION_WARNING_CODES = new Set([
    "PREVIOUS_PUBLISHED_RATE",
    "RATE_UNAVAILABLE",
    "CURRENCY_REQUIRES_REVIEW",
    "AMOUNT_REQUIRES_REVIEW",
    "DATE_REQUIRES_REVIEW",
]);

/** 解析結果を編集用に変換し、支払根拠から確定できる原金額を補う。 */
export function createReceiptReview(
    response: AccountBookReceiptAnalysisResponse,
    sourceImageId = "legacy-source",
    analysisRevision = 1,
    sourceFileName = "receipt",
    reviewAssisted = false
): ReceiptReviewItem[] {
    return response.receipts.map((item, index) => {
        const review: ReceiptReviewItem = {
            clientId: `${sourceImageId}:${analysisRevision}:${item.receiptId}`,
            registrationReceiptId: `${sourceImageId}:${analysisRevision}:${index + 1}`,
            receiptId: item.receiptId,
            sourceImageId,
            analysisRevision,
            sourceFileName,
            title: item.title ?? item.storeName ?? "",
            storeName: item.storeName ?? "",
            branchName: item.branchName ?? null,
            categoryName: item.categoryName ?? "",
            categorySource: item.categorySource ?? (item.categoryName ? "EXISTING" : "FALLBACK"),
            categoryReason: item.categoryReason ?? null,
            categorySelection: item.categoryName ?? "",
            directCategoryName: "",
            purchaseTotal: item.purchaseTotal ?? item.originalAmount ?? "",
            paymentBreakdown: item.paymentBreakdown ?? [],
            cashTendered: item.cashTendered ?? null,
            change: item.change ?? null,
            originalAmount: item.bookAmount ?? item.originalAmount ?? "",
            amountPolicyVersion: item.amountPolicyVersion ?? "receipt-book-amount-v1",
            amountReason: item.amountReason ?? "PURCHASE_TOTAL_NO_PAYMENT_ALLOCATION",
            reviewStatus: item.reviewStatus ?? (item.originalAmount ? "READY" : "NEEDS_REVIEW"),
            originalCurrencyCode: item.detectedCurrencyCode ?? "",
            transactionDate: item.transactionDate ?? "",
            transactionTime: item.transactionTime ?? null,
            memo: item.memo ?? "",
            conversionQuoteId: item.conversionQuoteId,
            selected: true,
            confidence: item.confidence,
            detectedLanguage: item.detectedLanguage,
            status: item.status,
            analysisWarnings: (item.warnings ?? []).filter((warning) => !CONVERSION_WARNING_CODES.has(warning)),
            conversion: { ...item, warnings: item.warnings ?? [] },
            conversionStale: false,
            draftRevision: 0,
            reviewMode: reviewAssisted ? "ASSISTED" : "AUTOMATIC",
            reviewedRevision: reviewAssisted ? null : 0,
            sourceRegion: item.boundingBox ?? item.identitySourceBox ?? null,
            branchOmittedByUser: false,
            manuallyAdded: false,
            amountCorrection: null,
            analysisTraceId: response.analysisTraceId ?? null,
        };
        // 원금액이 빠졌을 때만 결제 근거와 총액의 대조로 복구한다.
        const hasPaymentFacts = review.paymentBreakdown.length > 0
            || (review.cashTendered?.trim() && review.change?.trim());
        if (review.originalAmount.trim() || !hasPaymentFacts || review.reviewStatus === "EXCLUDED"
            || review.amountPolicyVersion !== "receipt-book-amount-v1") {
            return review;
        }

        const reconciled = recalculateAmountFacts(review);
        if (reconciled.reviewStatus !== "READY") {
            return review;
        }

        // 보완된 금액은 기존 환산 결과와 분리하고 재확인을 거친다.
        return { ...reconciled, conversionStale: true, conversion: staleConversion(reconciled) };
    });
}

export function createManualReceiptReview(
    sourceImageId: string,
    analysisRevision: number,
    sourceFileName: string,
    sourceRegion: number[],
    accountBookCurrencyCode: string,
    receiptId = `manual-${crypto.randomUUID()}`
): ReceiptReviewItem {
    return {
        clientId: `${sourceImageId}:${analysisRevision}:${receiptId}`,
        registrationReceiptId: receiptId,
        receiptId,
        sourceImageId,
        analysisRevision,
        sourceFileName,
        title: "",
        storeName: "",
        branchName: null,
        categoryName: "",
        categorySource: "USER",
        categoryReason: "USER_ADDED_FROM_SOURCE_REGION",
        categorySelection: "",
        directCategoryName: "",
        purchaseTotal: "",
        paymentBreakdown: [],
        cashTendered: null,
        change: null,
        originalAmount: "",
        amountPolicyVersion: "receipt-book-amount-v1",
        amountReason: "MISSING_OR_INVALID_PURCHASE_TOTAL",
        reviewStatus: "NEEDS_REVIEW",
        originalCurrencyCode: "",
        transactionDate: "",
        transactionTime: null,
        memo: null,
        conversionQuoteId: null,
        selected: true,
        confidence: null,
        detectedLanguage: null,
        status: "NEEDS_REVIEW",
        analysisWarnings: ["USER_ADDED_RECEIPT_REGION"],
        conversion: {
            accountBookCurrencyCode,
            convertedAmount: null,
            exchangeRate: null,
            requestedRateDate: null,
            effectiveRateDate: null,
            exchangeRateProvider: null,
            rateFetchedAt: null,
            convertedAt: null,
            roundingPrecision: 0,
            roundingMode: "HALF_UP",
            conversionPolicyVersion: "receipt-fx-v1",
            conversionQuoteId: null,
            conversionStatus: "NEEDS_REVIEW",
            rateDateFallback: false,
            warnings: [],
        },
        conversionStale: true,
        draftRevision: 0,
        reviewMode: "ASSISTED",
        reviewedRevision: null,
        sourceRegion,
        branchOmittedByUser: false,
        manuallyAdded: true,
        amountCorrection: null,
        analysisTraceId: null,
    };
}
