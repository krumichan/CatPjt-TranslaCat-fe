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
    id: string;
    accountBookId: string;
    title: string;
    storeName?: string;
    categoryName: string;
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

export type AccountBookTransaction = {
    id: string;
    accountBookId: string;
    type: TransactionType;
    title: string;
    storeName?: string;
    categoryName: string;
    amount: number;
    memo?: string;
    transactionDate: string;
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
