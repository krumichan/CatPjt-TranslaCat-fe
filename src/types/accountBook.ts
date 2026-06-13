import {PagedModel} from "@/types/common";

export type AccountBookMemberRole = "OWNER" | "MEMBER";
export type AccountBookTransactionSourceType = "FIXED_COST";
export type CurrencyCode = string;
export type TransactionType = "INCOME" | "EXPENSE";

export type AccountBook = {
    id: number;
    name: string;
    description?: string | null;
    category: string;
    currencyCode: CurrencyCode;
    currencySymbol?: string | null;
    incomeAmount: number;
    expenseAmount: number;
    balance: number;
    transactionCount?: number;
    expenseGoalAmount?: number | null;
    myRole: AccountBookMemberRole;
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
    expenseGoalAmount: number | null;
    shouldDeleteMonthlyGoal: boolean;
};

export type AccountBookFixedCost = {
    id: number;
    accountBookId: number;
    title: string;
    storeName: string | null;
    category: string;
    amount: number;
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
    amount: number;
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
    amount: number;
    paymentDay: number;
    startYear: number;
    startMonth: number;
    endYear?: number | null;
    endMonth?: number | null;
    memo?: string | null;
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
    expenseGoalAmount?: number | null;
};

export type AccountBookMonthlyChartItem = {
    year: number;
    month: number;
    incomeAmount: number;
    expenseAmount: number;
    balance: number;
    expenseGoalAmount: number | null;
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
    goalAmount: number | null;
    expenseAmount: number;
    remainingAmount: number;
    usageRate: number;
    exceeded: boolean;
};

export type AccountBookMonthlyGoalListItem = {
    id: number;
    accountBookId: number;
    year: number;
    month: number;
    goalAmount: number;
    expenseAmount: number;
    remainingAmount: number;
    usageRate: number;
    exceeded: boolean;
};

export type AccountBookMonthlyGoalListResponse =
    AccountBookMonthlyGoalListItem[];

export type AccountBookMonthlyGoalRequest = {
    year: number;
    month: number;
    goalAmount: number;
};

export type AccountBookRankingChartItem = {
    name: string;
    amount: number;
    transactionCount: number;
    percentage: number;
};

export type AccountBookRankingChartResponse = {
    year: number | null;
    month: number | null;
    totalAmount: number;
    items: AccountBookRankingChartItem[];
};

export type AccountBookSummaryResponse = {
    accountBookId: number;
    currencyCode: CurrencyCode;
    incomeAmount: number;
    expenseAmount: number;
    balance: number;
    transactionCount: number;
};

export type AccountBookTransaction = {
    id: number;
    accountBookId: number;
    type: TransactionType;
    title: string;
    storeName: string | null;
    category: string;
    amount: number;
    transactionDate: string;
    memo: string | null;
    createdAt?: string;

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
    amount: number;
    transactionDate: string;
    memo?: string | null;
};

export type AccountBookTransactionUpdateRequest = {
    type: TransactionType;
    title: string;
    storeName?: string | null;
    category: string;
    amount: number;
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
    expenseGoalAmount?: number | null;
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
    amount: number;
    transactionDate: string;
    memo?: string;
};

export type MonthlyAnalyticsItem = {
    month: string;
    incomeAmount: number;
    expenseAmount: number;
    budgetAmount: number | null;
    balanceAmount: number;
};

export type MonthlyExpenseChartProps = {
    data: MonthlyAnalyticsItem[];
    currencyCode: CurrencyCode;
};

export type ReceiptAnalysisResult = {
    title?: string;
    storeName?: string;
    amount?: number;
    transactionDate?: string;
    categoryName?: string;
    memo?: string;
    confidence?: number;
};

export type UpdateTransactionFormValues = CreateTransactionFormValues;
