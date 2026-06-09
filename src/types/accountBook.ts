import {PagedModel} from "@/types/common";

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
};

export type AccountBookCategory = {
    id: string;
    name: string;
    accountBooks: AccountBook[];
};

export type AccountBookFixedExpense = {
    id: number;
    accountBookId: number;
    title: string;
    storeName?: string;
    category: string;
    amount: number;
    paymentDay: number;
    memo?: string;
    isActive: boolean;
};

export type AccountBookSearchCondition = {
    keyword?: string;
    category?: string;
};

export type CreateAccountBookRequest = {
    name: string;
    description?: string;
    category: string;
    currencyCode: CurrencyCode;
    expenseGoalAmount?: number | null;
};

export type AccountBookMonthlyGoal = {
    id: number | null;
    accountBookId: number;
    year: number;
    month: number;
    goalAmount: number | null;
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

export type AccountBookTransaction = {
    id: number;
    accountBookId?: number;
    type: TransactionType;
    title: string;
    storeName?: string | null;
    category: string;
    amount: number;
    transactionDate: string;
    memo?: string | null;
    createdAt?: string;
};

export type AccountBookTransactionListRequest = {
    year?: number;
    month?: number;
    page?: number;
    size?: number;
};

export type AccountBookTransactionListResponse = {
    page: PagedModel<AccountBookTransaction>;
    currencyName: string;
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

export type CreateFixedExpenseFormValues = {
    title: string;
    storeName?: string;
    categoryName: string;
    amount: number;
    paymentDay: number;
    memo?: string;
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
