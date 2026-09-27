"use client";

import { useTranslations } from "next-intl";
import type { CurrencyCode } from "@/types/accountBook";
import { useAccountBookSummaryController } from "@/hooks/account-book/detail/useAccountBookSummaryController";
import AccountBookSummaryCards from "@/components/account-book/detail/AccountBookSummaryCards";
import AccountBookExpenseGoalCard from "@/components/account-book/detail/AccountBookExpenseGoalCard";
import MonthlyExpenseChart from "@/components/account-book/detail/monthly-chart/MonthlyExpenseChart";
import ExpenseRankingChart from "@/components/account-book/detail/ranking-chart/ExpenseRankingChart";

type AccountBookDetailSummarySmartSectionProps = {
    accountBookId: number;
    selectedMonth: string;
    fallbackCurrencyCode?: CurrencyCode;
};

export default function AccountBookDetailSummarySmartSection({
    accountBookId,
    selectedMonth,
    fallbackCurrencyCode = "JPY",
}: AccountBookDetailSummarySmartSectionProps) {
    const t = useTranslations("AccountBook.detail");
    const {
        accountBookSummaryQueryError,
        accountBookSummary,
        isAccountBookSummaryLoading,
        currencyCode,
        monthlyGoalAmount,
        monthlyGoal,
        isMonthlyGoalLoading,
        monthlyGoalError,
        handleSaveExpenseGoalAmount,
        monthlyChart,
        isMonthlyChartLoading,
        categoryChart,
        isCategoryChartLoading,
        storeChart,
        isStoreChartLoading
    } = useAccountBookSummaryController({
        accountBookId,
        selectedMonth,
        fallbackCurrencyCode,
    });

    return (
        <>
            {accountBookSummaryQueryError && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    {t("summaryCards.messages.loadFailed")}
                </div>
            )}

            <AccountBookSummaryCards
                accountBookSummary={accountBookSummary}
                isLoading={isAccountBookSummaryLoading}
            />

            <AccountBookExpenseGoalCard
                accountBookId={accountBookId}
                selectedMonth={selectedMonth}
                currencyCode={currencyCode}
                goalAmount={monthlyGoalAmount}
                expenseAmount={monthlyGoal?.expenseAmount ?? 0}
                isLoading={isMonthlyGoalLoading}
                errorMessage={monthlyGoalError}
                onSaveGoalAmount={handleSaveExpenseGoalAmount}
            />

            <MonthlyExpenseChart
                chartItems={monthlyChart?.months ?? []}
                currencyCode={currencyCode}
                isLoading={isMonthlyChartLoading}
            />

            <div className="mt-6 mb-6 grid gap-6 lg:grid-cols-2">
                <ExpenseRankingChart
                    type="CATEGORY"
                    chart={categoryChart}
                    currencyCode={currencyCode}
                    isLoading={isCategoryChartLoading}
                />

                <ExpenseRankingChart
                    type="STORE"
                    chart={storeChart}
                    currencyCode={currencyCode}
                    isLoading={isStoreChartLoading}
                />
            </div>
        </>
    );
}
