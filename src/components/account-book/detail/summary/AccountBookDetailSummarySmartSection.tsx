"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import AccountBookSummaryCards from "@/components/account-book/detail/AccountBookSummaryCards";
import AccountBookExpenseGoalCard from "@/components/account-book/detail/AccountBookExpenseGoalCard";
import MonthlyExpenseChart from "@/components/account-book/detail/monthly-chart/MonthlyExpenseChart";
import ExpenseRankingChart from "@/components/account-book/detail/ranking-chart/ExpenseRankingChart";
import { useQuery } from "@/hooks/useQuery";
import { accountBookService } from "@/services/account-book/accountBookService";
import { accountBookMonthlyGoalService } from "@/services/account-book/accountBookMonthlyGoalService";
import { accountBookChartService } from "@/services/account-book/accountBookChartService";
import { accountBookTransactionService } from "@/services/account-book/accountBookTransactionService";
import { accountBookDetailQueryKeys } from "@/hooks/account-book/detail/accountBookDetailQueryKeys";
import { useAccountBookDetailRevalidation } from "@/hooks/account-book/detail/useAccountBookDetailRevalidation";
import { parseSelectedMonthValue } from "@/utils/account-book/detail/month";
import { CurrencyCode } from "@/types/accountBook";

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
    const selectedYearMonth = useMemo(
        () => parseSelectedMonthValue(selectedMonth),
        [selectedMonth]
    );

    const revalidation = useAccountBookDetailRevalidation({
        accountBookId,
        selectedMonth,
    });

    const {
        data: accountBookSummary,
        isLoading: isAccountBookSummaryLoading,
        isError: accountBookSummaryQueryError,
    } = useQuery({
        keys: accountBookDetailQueryKeys.summary(accountBookId, selectedMonth),
        fetcher: (_, accountBookId, selectedMonthValue) => {
            const parsedMonth = parseSelectedMonthValue(selectedMonthValue);

            return accountBookService.getSummary(
                accountBookId,
                parsedMonth
                    ? {
                          year: parsedMonth.year,
                          month: parsedMonth.month,
                      }
                    : undefined
            );
        },
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    const {
        data: monthlyGoal,
        isLoading: isMonthlyGoalLoading,
        isError: monthlyGoalQueryError,
        mutate: mutateMonthlyGoal,
    } = useQuery({
        keys: selectedYearMonth
            ? accountBookDetailQueryKeys.monthlyGoal(
                  accountBookId,
                  selectedYearMonth.year,
                  selectedYearMonth.month
              )
            : null,
        fetcher: (_, accountBookId, year, month) =>
            accountBookMonthlyGoalService.getMonthlyGoal(
                accountBookId,
                year,
                month
            ),
    });

    const { data: transactionMonthOptions = [] } = useQuery({
        keys: accountBookDetailQueryKeys.transactionMonths(accountBookId),
        fetcher: (_, accountBookId) =>
            accountBookTransactionService.listTransactionMonths(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });

    const chartYear =
        selectedYearMonth?.year ??
        transactionMonthOptions[0]?.year ??
        new Date().getFullYear();

    const {
        data: monthlyChart,
        isLoading: isMonthlyChartLoading,
    } = useQuery({
        keys: accountBookDetailQueryKeys.monthlyChart(accountBookId, chartYear),
        fetcher: (_, accountBookId, year) =>
            accountBookChartService.getMonthlyChart(accountBookId, year),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    const rankingChartPeriod = selectedYearMonth
        ? {
              year: selectedYearMonth.year,
              month: selectedYearMonth.month,
          }
        : undefined;

    const rankingChartPeriodKey = selectedYearMonth
        ? `${selectedYearMonth.year}-${selectedYearMonth.month}`
        : "ALL";

    const {
        data: categoryChart,
        isLoading: isCategoryChartLoading,
    } = useQuery({
        keys: accountBookDetailQueryKeys.categoryRankingChart(
            accountBookId,
            rankingChartPeriodKey
        ),
        fetcher: (_, accountBookId) =>
            accountBookChartService.getCategoryChart(
                accountBookId,
                rankingChartPeriod
            ),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    const {
        data: storeChart,
        isLoading: isStoreChartLoading,
    } = useQuery({
        keys: accountBookDetailQueryKeys.storeRankingChart(
            accountBookId,
            rankingChartPeriodKey
        ),
        fetcher: (_, accountBookId) =>
            accountBookChartService.getStoreChart(
                accountBookId,
                rankingChartPeriod
            ),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    const currencyCode = accountBookSummary?.currencyCode ?? fallbackCurrencyCode;
    const monthlyGoalAmount = monthlyGoal?.goalAmount ?? null;
    const monthlyGoalError = monthlyGoalQueryError
        ? t("expenseGoal.messages.loadFailed")
        : null;

    const handleSaveExpenseGoalAmount = async (
        year: number,
        month: number,
        goalAmount: number
    ) => {
        try {
            const response = await accountBookMonthlyGoalService.saveMonthlyGoal(
                accountBookId,
                {
                    year,
                    month,
                    goalAmount,
                }
            );

            if (
                selectedYearMonth &&
                selectedYearMonth.year === year &&
                selectedYearMonth.month === month
            ) {
                await mutateMonthlyGoal(response, false);
                await revalidation.revalidateCharts();
            }
        } catch (error) {
            console.error(error);
            alert(t("expenseGoal.messages.saveFailed"));
        }
    };

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
