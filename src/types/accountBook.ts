import {PagedModel} from "@/types/common";

export type AccountBookInvitationStatus =
    | "PENDING"
    | "ACCEPTED"
    | "REJECTED"
    | "CANCELED";
export type AccountBookMemberRole = "OWNER" | "MEMBER";
export type AccountBookTransactionSourceType = "FIXED_COST";
export type CurrencyCode = string;
export type ReceiptAnalysisMode =
    | "OCR_WITH_AI"
    | "VISION_ONLY"
    | "VISION_FIRST"
    | "OCR_ONLY";
export type ReceiptPaymentType =
    | "LOYALTY_POINTS" | "CASH" | "CREDIT_CARD" | "DEBIT_CARD"
    | "ELECTRONIC_MONEY" | "GIFT_CARD" | "VOUCHER" | "OTHER_PAID" | "UNKNOWN";
export type ReceiptPaymentItem = {
    paymentType: ReceiptPaymentType;
    amount: string;
    evidence: string | null;
    duplicateGroup: string | null;
};
export type TransactionType = "INCOME" | "EXPENSE";
export type TransactionFilterType = "ALL" | TransactionType;

export type AccountBook = {
    id: number;
    name: string;
    description?: string | null;
    category: string;
    currencyCode: CurrencyCode;
    currencySymbol?: string | null;
    currencyDecimalPlaces?: number;
    incomeAmount: number | string;
    expenseAmount: number | string;
    balance: number | string;
    transactionCount?: number;
    expenseGoalAmount?: number | string | null;
    myRole?: AccountBookMemberRole | null;
};

export type AccountBookCategory = {
    id: number;
    accountBookId: number;
    name: string;
    displayOrder: number;
    active: boolean;
};

export type AccountBookCategoryGroup = {
    id: string;
    name: string;
    accountBooks: AccountBook[];
};

export type AccountBookEditFormValues = AccountBookUpdateRequest & {
    expenseGoalAmount: number | string | null;
    shouldDeleteMonthlyGoal: boolean;
};

export type AccountBookFixedCost = {
    id: number;
    accountBookId: number;
    title: string;
    storeName: string | null;
    category: string;
    amount: number | string;
    paymentDay: number;
    startYear: number;
    startMonth: number;
    endYear: number | null;
    endMonth: number | null;
    lastGeneratedYear: number | null;
    lastGeneratedMonth: number | null;
    memo: string | null;
    active: boolean;
};

export type AccountBookFixedCostActiveRequest = {
    active: boolean;
};

export type AccountBookFixedCostGenerateRequest = {
    year: number;
    month: number;
};

export type AccountBookFixedCostGenerateResponse = {
    year: number;
    month: number;
    generatedCount: number;
};

export type AccountBookFixedCostGenerationTarget = {
    fixedCostId: number;
    title: string;
    storeName: string | null;
    category: string;
    amount: number | string;
    paymentDay: number;
    transactionDate: string;
    memo: string | null;
};

export type AccountBookFixedCostGenerationTargetsResponse = {
    year: number;
    month: number;
    count: number;
    targets: AccountBookFixedCostGenerationTarget[];
};

export type AccountBookFixedCostRequest = {
    title: string;
    storeName?: string | null;
    category: string;
    amount: number | string;
    paymentDay: number;
    startYear: number;
    startMonth: number;
    endYear?: number | null;
    endMonth?: number | null;
    memo?: string | null;
};

export type AccountBookInvitation = {
    id: number;
    accountBookId: number;
    accountBookName: string;
    inviterUserId: number;
    inviterPublicId: string;
    inviterUsername: string | null;
    inviteeUserId: number;
    inviteePublicId: string;
    inviteeUsername: string | null;
    role: AccountBookMemberRole;
    status: AccountBookInvitationStatus;
};

export type AccountBookInvitationCreateRequest = {
    publicId: string;
};

export type AccountBookMember = {
    id: number;
    userId: number;
    publicId: string;
    username: string | null;
    role: AccountBookMemberRole;
};

export type AccountBookMemberInviteRequest = {
    publicId: string;
};

export type AccountBookReceiptAnalysisRequest = {
    analysisMode?: ReceiptAnalysisMode;
};

export type AccountBookReceiptAnalysisResponse = {
    receipts: AccountBookReceiptAnalysisItem[];
    receiptCount: number;
    warnings: string[];
    ocrEngine: string | null;
    usedAi: boolean;
};

// Monetary values in the receipt contract stay decimal strings end to end.
export type ReceiptConversion = {
    accountBookCurrencyCode: string;
    convertedAmount: string | null;
    exchangeRate: string | null;
    requestedRateDate: string | null;
    effectiveRateDate: string | null;
    exchangeRateProvider: string | null;
    rateFetchedAt: string | null;
    convertedAt: string | null;
    roundingPrecision: number;
    roundingMode: string;
    conversionPolicyVersion: string;
    conversionQuoteId: string | null;
    conversionStatus: "NOT_REQUIRED" | "CONVERTED" | "RATE_UNAVAILABLE" | "NEEDS_REVIEW";
    rateDateFallback: boolean;
    warnings: string[];
};

export type AccountBookReceiptAnalysisItem = ReceiptConversion & {
    receiptId: string;
    title: string | null;
    storeName: string | null;
    branchName: string | null;
    purchaseTotal: string | null;
    paymentBreakdown: ReceiptPaymentItem[];
    cashTendered: string | null;
    change: string | null;
    bookAmount: string | null;
    amountPolicyVersion: string;
    amountReason: string | null;
    reviewStatus: "READY" | "NEEDS_REVIEW" | "EXCLUDED";
    originalAmount: string | null;
    detectedCurrencyCode: string | null;
    transactionDate: string | null;
    transactionTime: string | null;
    categoryName: string | null;
    memo: string | null;
    confidence: number | null;
    detectedLanguage: string | null;
    status: "READY" | "NEEDS_REVIEW" | "UNREADABLE";
};

export type ReceiptRegistrationCandidate = {
    receiptId: string;
    title: string;
    storeName: string | null;
    branchName: string | null;
    categoryName: string;
    purchaseTotal: string;
    paymentBreakdown: ReceiptPaymentItem[];
    cashTendered: string | null;
    change: string | null;
    originalAmount: string;
    originalCurrencyCode: string;
    transactionDate: string;
    transactionTime: string | null;
    memo: string | null;
    conversionQuoteId: string | null;
    sourceImageId: string;
    analysisRevision: number;
    amountPolicyVersion: string;
    amountReason: string;
    reviewStatus: "READY" | "NEEDS_REVIEW" | "EXCLUDED";
};

export type ReceiptBatchRegistrationRequest = {
    receipts: ReceiptRegistrationCandidate[];
};

export type AccountBookSearchCondition = {
    keyword?: string;
    category?: string;
};

export type AccountBookStoreSuggestion = {
    storeName: string;
};

export type AccountBookUpdateRequest = {
    name: string;
    description?: string;
    category: string;
};

export type CreateAccountBookRequest = {
    name: string;
    description?: string;
    category: string;
    currencyCode: CurrencyCode;
};

export type AccountBookMonthlyChartItem = {
    year: number;
    month: number;
    incomeAmount: number | string;
    expenseAmount: number | string;
    balance: number | string;
    expenseGoalAmount: number | string | null;
};

export type AccountBookMonthlyChartResponse = {
    year: number;
    months: AccountBookMonthlyChartItem[];
};

export type AccountBookMonthlyGoal = {
    id: number | null;
    accountBookId: number;
    year: number;
    month: number;
    goalAmount: number | string | null;
    expenseAmount: number | string;
    remainingAmount: number | string;
    usageRate: number;
    exceeded: boolean;
};

export type AccountBookMonthlyGoalListItem = {
    id: number;
    accountBookId: number;
    year: number;
    month: number;
    goalAmount: number | string;
    expenseAmount: number | string;
    remainingAmount: number | string;
    usageRate: number;
    exceeded: boolean;
};

export type AccountBookMonthlyGoalListResponse =
    AccountBookMonthlyGoalListItem[];

export type AccountBookMonthlyGoalRequest = {
    year: number;
    month: number;
    goalAmount: number | string;
};

export type AccountBookRankingChartItem = {
    name: string;
    amount: number | string;
    transactionCount: number;
    percentage: number;
};

export type AccountBookRankingChartResponse = {
    year: number | null;
    month: number | null;
    totalAmount: number | string;
    items: AccountBookRankingChartItem[];
};

export type AccountBookSummaryResponse = {
    accountBookId: number;
    currencyCode: CurrencyCode;
    currencyDecimalPlaces?: number;
    incomeAmount: number | string;
    expenseAmount: number | string;
    balance: number | string;
    transactionCount: number;
};

export type AccountBookTransaction = {
    id: number;
    accountBookId: number;
    type: TransactionType;
    title: string;
    storeName: string | null;
    category: string;
    amount: number | string;
    transactionDate: string;
    memo: string | null;
    createdAt?: string;

    originalAmount?: string | null;
    originalCurrencyCode?: string | null;
    exchangeRate?: string | null;
    requestedRateDate?: string | null;
    effectiveRateDate?: string | null;
    exchangeRateProvider?: string | null;
    targetCurrencyCode?: string | null;
    rateFetchedAt?: string | null;
    convertedAt?: string | null;
    roundingPrecision?: number | null;
    roundingMode?: string | null;
    conversionPolicyVersion?: string | null;
    conversionQuoteId?: string | null;
    purchaseTotal?: string | null;
    bookAmount?: string | null;
    receiptPaymentBreakdownJson?: string | null;
    cashTendered?: string | null;
    changeAmount?: string | null;
    amountPolicyVersion?: string | null;
    amountReason?: string | null;
    amountReviewStatus?: string | null;
    receiptBranchName?: string | null;
    receiptSourceImageId?: string | null;
    receiptAnalysisRevision?: number | null;
    receiptTransactionTime?: string | null;

    sourceType: AccountBookTransactionSourceType | null;
    sourceId: number | null;
    sourceYear: number | null;
    sourceMonth: number | null;
};

export type AccountBookTransactionListRequest = {
    year?: number;
    month?: number;
    page: number;
    size: number;
    type?: TransactionType;
    keyword?: string;
};

export type AccountBookTransactionListResponse = {
    page: PagedModel<AccountBookTransaction>;
    currencyName: string;
};

export type AccountBookTransactionMonthOption = {
    value: string;
    label: string;
    year: number;
    month: number;
    currentMonth: boolean;
};

export type AccountBookTransactionCreateRequest = {
    type: TransactionType;
    title: string;
    storeName?: string | null;
    category: string;
    amount: number | string;
    transactionDate: string;
    memo?: string | null;
};

export type AccountBookTransactionUpdateRequest = {
    type: TransactionType;
    title: string;
    storeName?: string | null;
    category: string;
    amount: number | string;
    transactionDate: string;
    memo?: string | null;
};

export type Currency = {
    id: number;
    code: CurrencyCode;
    name: string;
    symbol: string;
    decimalPlaces: number;
    baseCurrency: boolean;
};

export type CreateAccountBookFormValues = {
    name: string;
    description?: string;
    currencyCode: CurrencyCode;
    expenseGoalAmount?: number | string | null;
    categoryMode: "EXISTING" | "NEW";
    categoryId?: string;
    categoryName?: string;
    newCategoryName?: string;
};

export type CreateTransactionFormValues = {
    type: TransactionType;
    title: string;
    storeName?: string;
    categoryName: string;
    amount: number | string;
    transactionDate: string;
    memo?: string;
};
