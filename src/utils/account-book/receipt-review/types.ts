import type { ReceiptRegistrationCandidate, ReceiptConversion } from "@/types/accountBook";

export type ReceiptReviewItem = ReceiptRegistrationCandidate & {
    clientId: string;
    sourceFileName: string;
    selected: boolean;
    registrationReceiptId: string;
    analysisTraceId: string | null;
    confidence: number | null;
    detectedLanguage: string | null;
    status: "READY" | "NEEDS_REVIEW" | "UNREADABLE";
    analysisWarnings: string[];
    conversion: ReceiptConversion;
    conversionStale: boolean;
    categorySelection: string;
    directCategoryName: string;
    draftRevision: number;
    reviewMode: "AUTOMATIC" | "ASSISTED";
    reviewedRevision: number | null;
    sourceRegion: number[] | null;
    branchOmittedByUser: boolean;
    manuallyAdded: boolean;
    amountCorrection: ReceiptAmountCorrection | null;
};

export type ReceiptAmountCorrection = {
    observedPurchaseTotal: string;
    observedOriginalAmount: string;
    observedPaymentAmount: string | null;
    paymentIndex: number | null;
    correctedAmount: string;
};

export type ReceiptInlineAmountEditPolicy = {
    mode: "SIMPLE_TOTAL";
    paymentIndex: null;
    reason: null;
} | {
    mode: "SINGLE_PAYMENT";
    paymentIndex: number;
    reason: null;
} | {
    mode: "DETAILS_REQUIRED";
    paymentIndex: null;
    reason: "POINTS" | "MULTIPLE_PAYMENTS" | "CASH_CHANGE" | "AMBIGUOUS_PAYMENT";
};

export type ReceiptBlockingField = ReceiptEditableField | "paymentBreakdown" | "conversion" | "source" | "review";

export type ReceiptBlockingIssue = {
    code: "TITLE_REQUIRED"
    | "TITLE_TOO_LONG"
    | "CATEGORY_REQUIRED"
    | "CATEGORY_TOO_LONG"
    | "STORE_TOO_LONG"
    | "BRANCH_TOO_LONG"
    | "MEMO_TOO_LONG"
    | "PURCHASE_TOTAL_INVALID"
    | "PAYMENT_INVALID"
    | "BOOK_AMOUNT_INVALID"
    | "AMOUNT_POLICY_INVALID"
    | "CURRENCY_INVALID"
    | "DATE_INVALID"
    | "TIME_INVALID"
    | "SOURCE_INVALID"
    | "QUOTE_STALE"
    | "CONVERSION_UNAVAILABLE"
    | "QUOTE_MISSING"
    | "REVIEW_CONFIRMATION_REQUIRED";
    field: ReceiptBlockingField;
};

export type ReceiptRegistrationValidation = {
    registrable: boolean;
    blockingIssues: ReceiptBlockingIssue[];
    advisoryWarnings: string[];
};

export type ReceiptEditableField = "title"
    | "storeName"
    | "branchName"
    | "categoryName"
    | "purchaseTotal"
    | "cashTendered"
    | "change"
    | "originalAmount"
    | "originalCurrencyCode"
    | "transactionDate"
    | "transactionTime"
    | "memo";

export type ReceiptBatchAttempt = {
    signature: string;
    idempotencyKey: string;
};
