import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@/hooks/useQuery";
import { accountBookService } from "@/services/account-book/accountBookService";
import { accountBookMonthlyGoalService } from "@/services/account-book/accountBookMonthlyGoalService";
import { accountBookChartService } from "@/services/account-book/accountBookChartService";
import { accountBookTransactionService } from "@/services/account-book/accountBookTransactionService";
import { accountBookDetailQueryKeys } from "@/hooks/account-book/detail/accountBookDetailQueryKeys";
import { useAccountBookDetailRevalidation } from "@/hooks/account-book/detail/useAccountBookDetailRevalidation";
import { parseSelectedMonthValue } from "@/utils/account-book/detail/month";
import type { CurrencyCode } from "@/types/accountBook";

type Params = {
    accountBookId: number;
    selectedMonth: string;
    fallbackCurrencyCode?: CurrencyCode;
};

export function useAccountBookSummaryController({
    accountBookId,
    selectedMonth,
    fallbackCurrencyCode = "JPY",
}: Params) {
    const t = useTranslations("AccountBook.detail");
    const selectedYearMonth = useMemo(() => parseSelectedMonthValue(selectedMonth), [selectedMonth]);
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
            ? accountBookDetailQueryKeys.monthlyGoal(accountBookId, selectedYearMonth.year, selectedYearMonth.month)
            : null,
        fetcher: (
            _,
            accountBookId,
            year,
            month
        ) => accountBookMonthlyGoalService.getMonthlyGoal(accountBookId, year, month),
    });
    const { data: transactionMonthOptions = [] } = useQuery({
        keys: accountBookDetailQueryKeys.transactionMonths(accountBookId),
        fetcher: (_, accountBookId) => accountBookTransactionService.listTransactionMonths(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });
    const chartYear = selectedYearMonth?.year ??
        transactionMonthOptions[0]?.year ??
        new Date().getFullYear();
    const { data: monthlyChart, isLoading: isMonthlyChartLoading, } = useQuery({
        keys: accountBookDetailQueryKeys.monthlyChart(accountBookId, chartYear),
        fetcher: (_, accountBookId, year) => accountBookChartService.getMonthlyChart(accountBookId, year),
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
    const { data: categoryChart, isLoading: isCategoryChartLoading, } = useQuery({
        keys: accountBookDetailQueryKeys.categoryRankingChart(accountBookId, rankingChartPeriodKey),
        fetcher: (_, accountBookId) => accountBookChartService.getCategoryChart(accountBookId, rankingChartPeriod),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });
    const { data: storeChart, isLoading: isStoreChartLoading, } = useQuery({
        keys: accountBookDetailQueryKeys.storeRankingChart(accountBookId, rankingChartPeriodKey),
        fetcher: (_, accountBookId) => accountBookChartService.getStoreChart(accountBookId, rankingChartPeriod),
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

    const handleSaveExpenseGoalAmount = async (year: number, month: number, goalAmount: number | string) => {
        try {
            const response = await accountBookMonthlyGoalService.saveMonthlyGoal(accountBookId, {
                year,
                month,
                goalAmount,
            });
            if (selectedYearMonth &&
                selectedYearMonth.year === year &&
                selectedYearMonth.month === month) {
                await mutateMonthlyGoal(response, false);
                await revalidation.revalidateCharts();
            }
        } catch (error) {
            console.error(error);
            alert(t("expenseGoal.messages.saveFailed"));
        }
    };

    return {
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
    };
}
