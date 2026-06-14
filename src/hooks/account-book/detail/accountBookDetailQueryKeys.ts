import {TransactionFilterType} from "@/types/accountBook";

export const accountBookDetailQueryKeys = {
    detail: (accountBookId: number) =>
        ["account-book-detail", accountBookId] as const,

    summary: (accountBookId: number, selectedMonth: string) =>
        ["account-book-summary", accountBookId, selectedMonth] as const,

    monthlyGoal: (accountBookId: number, year: number, month: number) =>
        ["account-book-monthly-goal", accountBookId, year, month] as const,

    monthlyGoalList: (accountBookId: number) =>
        ["account-book-monthly-goal-list", accountBookId] as const,

    transactionMonths: (accountBookId: number) =>
        ["account-book-transaction-months", accountBookId] as const,

    monthlyChart: (accountBookId: number, year: number) =>
        ["account-book-monthly-chart", accountBookId, year] as const,

    categoryRankingChart: (accountBookId: number, periodKey: string) =>
        ["account-book-category-ranking-chart", accountBookId, periodKey] as const,

    storeRankingChart: (accountBookId: number, periodKey: string) =>
        ["account-book-store-ranking-chart", accountBookId, periodKey] as const,

    transactions: (
        accountBookId: number,
        selectedMonth: string,
        transactionPage: number,
        filterType: TransactionFilterType,
        keyword: string
    ) =>
        [
            "account-book-transactions",
            accountBookId,
            selectedMonth,
            transactionPage,
            filterType,
            keyword,
        ] as const,

    fixedCosts: (accountBookId: number) =>
        ["account-book-fixed-costs", accountBookId] as const,

    categories: (accountBookId: number) =>
        ["account-book-categories", accountBookId] as const,

    storeSuggestions: (accountBookId: number) =>
        ["account-book-store-suggestions", accountBookId] as const,

    fixedCostGenerationTargets: (
        accountBookId: number,
        year: number,
        month: number
    ) =>
        [
            "account-book-fixed-cost-generation-targets",
            accountBookId,
            year,
            month,
        ] as const,
};
