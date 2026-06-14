"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AccountBookDetailHeader from "@/components/account-book/detail/AccountBookDetailHeader";
import AccountBookSummaryCards from "@/components/account-book/detail/AccountBookSummaryCards";
import TransactionFilterPanel, {
    TransactionFilterType,
} from "@/components/account-book/detail/TransactionFilterPanel";
import TransactionList from "@/components/account-book/detail/transaction-list/TransactionList";
import FixedCostFormModal from "@/components/account-book/detail/modal/FixedCostFormModal";
import FixedCostSection from "@/components/account-book/detail/FixedCostSection";
import {
    AccountBookTransaction,
    CreateTransactionFormValues,
    AccountBookFixedCostRequest,
    AccountBookFixedCost,
    AccountBookTransactionUpdateRequest,
    AccountBookTransactionCreateRequest,
} from "@/types/accountBook";
import AccountBookExpenseGoalCard from "@/components/account-book/detail/AccountBookExpenseGoalCard";
import MonthlyExpenseChart from "@/components/account-book/detail/monthly-chart/MonthlyExpenseChart";
import ExpenseRankingChart from "@/components/account-book/detail/ranking-chart/ExpenseRankingChart";
import {accountBookService} from "@/services/account-book/accountBookService";
import {useTranslations} from "next-intl";
import SpinLoader from "@/components/common/SpinLoader";
import {accountBookMonthlyGoalService} from "@/services/account-book/accountBookMonthlyGoalService";
import {useQuery} from "@/hooks/useQuery";
import {accountBookFixedCostService} from "@/services/account-book/accountBookFixedCostService";
import {accountBookCategoryService} from "@/services/account-book/accountBookCategoryService";
import ConfirmModal from "@/components/common/ConfirmModal";
import FixedCostGenerationBanner from "@/components/account-book/detail/fixed-cost/FixedCostGenerationBanner";
import {toNullableText} from "@/utils/text/normalizeText";
import {accountBookChartService} from "@/services/account-book/accountBookChartService";
import TransactionFormModal from "@/components/account-book/detail/modal/TransactionFormModal";
import AccountBookMemberManageModal from "@/components/account-book/detail/member/modal/AccountBookMemberManageModal";

function getCurrentMonthValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}

function parseSelectedMonthValue(selectedMonth: string) {
    if (selectedMonth === "ALL") {
        return null;
    }

    const [year, month] = selectedMonth.split("-").map(Number);

    return {
        year,
        month,
    };
}

function sortFixedCosts(fixedCosts: AccountBookFixedCost[]) {
    return [...fixedCosts].sort((a, b) => {
        if (a.active !== b.active) {
            return a.active ? -1 : 1;
        }

        if (a.paymentDay !== b.paymentDay) {
            return a.paymentDay - b.paymentDay;
        }

        return b.id - a.id;
    });
}

export default function AccountBookDetailPage() {
    const t = useTranslations("AccountBook.detail");
    const params = useParams<{ accountBookId: string }>();

    const accountBookId = Number(params.accountBookId);
    const isValidAccountBookId = Number.isFinite(accountBookId);

    const [keyword, setKeyword] = useState("");
    const [filterType, setFilterType] =
        useState<TransactionFilterType>("ALL");
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);

    const selectedYearMonth = useMemo(() => {
        return parseSelectedMonthValue(selectedMonth);
    }, [selectedMonth]);

    const [transactionPage, setTransactionPage] = useState(0);

    const [editingFixedCost, setEditingFixedCost] =
        useState<AccountBookFixedCost | null>(null);

    const [deletingFixedCost, setDeletingFixedCost] =
        useState<AccountBookFixedCost | null>(null);

    const [deletingTransaction, setDeletingTransaction] =
        useState<AccountBookTransaction | null>(null);

    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

    const {
        data: accountBookDetail,
        isLoading: isAccountBookDetailLoading,
    } = useQuery({
        keys: isValidAccountBookId
            ? ["account-book-detail", accountBookId] as const
            : null,
        fetcher: (_, accountBookId) => accountBookService.get(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    const canManageMembers = accountBookDetail?.myRole === "OWNER";

    const {
        data: monthlyGoal,
        isLoading: isMonthlyGoalLoading,
        isError: monthlyGoalQueryError,
        mutate: mutateMonthlyGoal,
    } = useQuery({
        keys: selectedYearMonth
            ? [
                accountBookId,
                selectedYearMonth.year,
                selectedYearMonth.month,
            ] as const
            : null,
        fetcher: (accountBookId, year, month) =>
            accountBookMonthlyGoalService.getMonthlyGoal(
                accountBookId,
                year,
                month
            ),
    });

    const {
        data: transactionMonthOptions = [],
        mutate: mutateTransactionMonthOptions,
    } = useQuery({
        keys: [
            "account-book-transaction-months",
            accountBookId,
        ] as const,
        fetcher: (_, accountBookId) =>
            accountBookService.listTransactionMonths(accountBookId),
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
        mutate: mutateMonthlyChart,
    } = useQuery({
        keys: isValidAccountBookId
            ? ["account-book-monthly-chart", accountBookId, chartYear] as const
            : null,
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
        mutate: mutateCategoryChart,
    } = useQuery({
        keys: isValidAccountBookId
            ? [
                "account-book-category-ranking-chart",
                accountBookId,
                rankingChartPeriodKey,
            ] as const
            : null,
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
        mutate: mutateStoreChart,
    } = useQuery({
        keys: isValidAccountBookId
            ? [
                "account-book-store-ranking-chart",
                accountBookId,
                rankingChartPeriodKey,
            ] as const
            : null,
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

    const transactionKeyword = keyword.trim();

    const {
        data: transactionResponse,
        isLoading: isTransactionLoading,
        isError: transactionQueryError,
        mutate: mutateTransactions,
    } = useQuery({
        keys: isValidAccountBookId
            ? [
                "account-book-transactions",
                accountBookId,
                selectedMonth,
                transactionPage,
                filterType,
                transactionKeyword,
            ] as const
            : null,
        fetcher: (
            _,
            accountBookId,
            selectedMonthValue,
            page,
            type,
            keywordValue
        ) => {
            const parsedMonth = parseSelectedMonthValue(selectedMonthValue);

            return accountBookService.listTransactions(accountBookId, {
                year: parsedMonth?.year,
                month: parsedMonth?.month,
                page,
                size: 20,
                type: type === "ALL" ? undefined : type,
                keyword: keywordValue || undefined,
            });
        },
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    const {
        data: accountBookSummary,
        isLoading: isAccountBookSummaryLoading,
        isError: accountBookSummaryQueryError,
        mutate: mutateAccountBookSummary,
    } = useQuery({
        keys: [
            "account-book-summary",
            accountBookId,
            selectedMonth,
        ] as const,
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
        data: fixedCosts = [],
        isLoading: isFixedCostsLoading,
        isError: fixedCostsQueryError,
        mutate: mutateFixedCosts,
    } = useQuery({
        keys: [
            "account-book-fixed-costs",
            accountBookId,
        ] as const,
        fetcher: (_, accountBookId) =>
            accountBookFixedCostService.listFixedCosts(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    const {
        data: categoryOptions = [],
        mutate: mutateCategoryOptions,
    } = useQuery({
        keys: [
            "account-book-categories",
            accountBookId,
        ] as const,
        fetcher: (_, accountBookId) =>
            accountBookCategoryService.listCategories(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });

    const {
        data: storeOptions = [],
        mutate: mutateStoreOptions,
    } = useQuery({
        keys: [
            "account-book-store-suggestions",
            accountBookId,
        ] as const,
        fetcher: (_, accountBookId) =>
            accountBookService.listStoreSuggestions(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });

    const {
        data: fixedCostGenerationTargets,
        mutate: mutateFixedCostGenerationTargets,
    } = useQuery({
        keys: selectedYearMonth
            ? [
                "account-book-fixed-cost-generation-targets",
                accountBookId,
                selectedYearMonth.year,
                selectedYearMonth.month,
            ] as const
            : null,
        fetcher: (_, accountBookId, year, month) =>
            accountBookFixedCostService.getGenerationTargets(
                accountBookId,
                year,
                month
            ),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    const currencyCode = accountBookSummary?.currencyCode ?? "JPY";

    const monthlyGoalAmount = monthlyGoal?.goalAmount ?? null;

    const monthlyGoalError = monthlyGoalQueryError
        ? t("expenseGoal.messages.loadFailed")
        : null;

    const fixedCostsError = fixedCostsQueryError
        ? t("fixedCost.messages.loadFailed")
        : null;

    const transactions = useMemo(() => {
        return transactionResponse?.page.content ?? [];
    }, [transactionResponse?.page.content]);

    const transactionTotalPages =
        transactionResponse?.page.page.totalPages ?? 0;

    const transactionError = transactionQueryError
        ? t("transaction.loadError")
        : null;

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateFixedCostModalOpen, setIsCreateFixedCostModalOpen] = useState(false);

    const [isGeneratingFixedCostTransactions, setIsGeneratingFixedCostTransactions] =
        useState(false);

    const [editingTransaction, setEditingTransaction] =
        useState<AccountBookTransaction | null>(null);

    const revalidateFixedCostGenerationTargets = async () => {
        if (!selectedYearMonth) {
            return;
        }

        await mutateFixedCostGenerationTargets(
            (currentData) => currentData,
            true
        );
    };

    const handleCreateFixedCost = async (
        values: AccountBookFixedCostRequest
    ) => {
        try {
            const createdFixedCost =
                await accountBookFixedCostService.createFixedCost(
                    accountBookId,
                    values
                );

            await mutateFixedCosts((currentData) => {
                const nextData = currentData
                    ? [createdFixedCost, ...currentData]
                    : [createdFixedCost];

                return sortFixedCosts(nextData);
            }, false);

            await mutateCategoryOptions();
            await mutateStoreOptions();
            await revalidateFixedCostGenerationTargets();
        } catch (error) {
            console.error(error);
            alert(t("fixedCost.messages.createFailed"));
            throw error;
        }
    };

    const toTransactionCreateRequest = (
        values: CreateTransactionFormValues
    ): AccountBookTransactionCreateRequest => ({
        type: values.type,
        title: values.title.trim(),
        storeName: toNullableText(values.storeName),
        category: values.categoryName.trim(),
        amount: values.amount,
        transactionDate: values.transactionDate,
        memo: toNullableText(values.memo),
    });

    const handleCreateTransaction = async (
        values: CreateTransactionFormValues
    ) => {
        try {
            await accountBookService.createTransaction(
                accountBookId,
                toTransactionCreateRequest(values)
            );

            await mutateTransactions((currentData) => currentData, true);
            await mutateAccountBookSummary((currentData) => currentData, true);
            await mutateMonthlyGoal((currentData) => currentData, true);
            await mutateTransactionMonthOptions((currentData) => currentData, true);
            await mutateCategoryOptions((currentData) => currentData, true);
            await mutateStoreOptions((currentData) => currentData, true);
            await mutateMonthlyChart((currentData) => currentData, true);
            await mutateCategoryChart((currentData) => currentData, true);
            await mutateStoreChart((currentData) => currentData, true);
        } catch (error) {
            console.error(error);
            alert(t("transaction.messages.createFailed"));
            throw error;
        }
    };

    const handleChangeFilterType = (value: TransactionFilterType) => {
        setFilterType(value);
        setTransactionPage(0);
    };

    const handleChangeFixedCostActive = async (
        fixedCostId: number,
        active: boolean
    ) => {
        try {
            const updatedFixedCost =
                await accountBookFixedCostService.updateActive(
                    accountBookId,
                    fixedCostId,
                    { active }
                );

            await mutateFixedCosts((currentData) => {
                if (!currentData) {
                    return [updatedFixedCost];
                }

                return sortFixedCosts(
                    currentData.map((fixedCost) =>
                        fixedCost.id === fixedCostId
                            ? updatedFixedCost
                            : fixedCost
                    )
                );
            }, false);

            await revalidateFixedCostGenerationTargets();
        } catch (error) {
            console.error(error);
            alert(t("fixedCost.messages.updateFailed"));
        }
    };

    const handleChangeKeyword = (value: string) => {
        setKeyword(value);
        setTransactionPage(0);
    };

    const handleChangeSelectedMonth = (value: string) => {
        setSelectedMonth(value);
        setTransactionPage(0);
    };

    const handleCloseFixedCostModal = () => {
        setIsCreateFixedCostModalOpen(false);
        setEditingFixedCost(null);
    };

    const handleDeleteFixedCost = async () => {
        if (!deletingFixedCost) {
            return;
        }

        try {
            await accountBookFixedCostService.deleteFixedCost(
                accountBookId,
                deletingFixedCost.id
            );

            await mutateFixedCosts((currentData) => {
                if (!currentData) {
                    return [];
                }

                return currentData.filter(
                    (fixedCost) => fixedCost.id !== deletingFixedCost.id
                );
            }, false);

            await mutateCategoryOptions();
            await mutateStoreOptions();
            await revalidateFixedCostGenerationTargets();
        } catch (error) {
            console.error(error);
            alert(t("fixedCost.messages.deleteFailed"));
            throw error;
        }
    };

    const handleDeleteTransaction = async () => {
        if (!deletingTransaction) {
            return;
        }

        const targetTransaction = deletingTransaction;

        try {
            await accountBookService.deleteTransaction(
                accountBookId,
                targetTransaction.id
            );

            await mutateTransactions((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return {
                    ...currentData,
                    page: {
                        ...currentData.page,
                        content: currentData.page.content.filter(
                            (transaction) => transaction.id !== targetTransaction.id
                        ),
                        page: {
                            ...currentData.page.page,
                            totalElements: Math.max(
                                currentData.page.page.totalElements - 1,
                                0
                            ),
                        },
                    },
                };
            }, false);

            await mutateTransactions((currentData) => currentData, true);
            await mutateAccountBookSummary((currentData) => currentData, true);
            await mutateMonthlyGoal((currentData) => currentData, true);
            await mutateTransactionMonthOptions((currentData) => currentData, true);
            await mutateMonthlyChart((currentData) => currentData, true);
            await mutateCategoryChart((currentData) => currentData, true);
            await mutateStoreChart((currentData) => currentData, true);

            if (targetTransaction.sourceType === "FIXED_COST") {
                await revalidateFixedCostGenerationTargets();
            }
        } catch (error) {
            console.error(error);
            alert(t("transaction.messages.deleteFailed"));
            throw error;
        }
    };

    const handleGenerateFixedCostTransactions = async () => {
        if (!selectedYearMonth || isGeneratingFixedCostTransactions) {
            return;
        }

        try {
            setIsGeneratingFixedCostTransactions(true);

            await accountBookFixedCostService.generateTransactions(
                accountBookId,
                {
                    year: selectedYearMonth.year,
                    month: selectedYearMonth.month,
                }
            );

            await mutateFixedCostGenerationTargets(
                (currentData) =>
                    currentData
                        ? {
                            ...currentData,
                            count: 0,
                            targets: [],
                        }
                        : currentData,
                false
            );

            await mutateTransactions((currentData) => currentData, true);
            await mutateAccountBookSummary((currentData) => currentData, true);
            await mutateMonthlyGoal((currentData) => currentData, true);
            await mutateTransactionMonthOptions(
                (currentData) => currentData,
                true
            );
            await mutateMonthlyChart((currentData) => currentData, true);
            await mutateCategoryChart((currentData) => currentData, true);
            await mutateStoreChart((currentData) => currentData, true);
        } catch (error) {
            console.error(error);
            alert(t("fixedCost.generation.messages.generateFailed"));
        } finally {
            setIsGeneratingFixedCostTransactions(false);
        }
    };

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
                await mutateMonthlyChart((currentData) => currentData, true);
            }
        } catch (error) {
            console.error(error);
            alert(t("expenseGoal.messages.saveFailed"));
        }
    };

    const handleSubmitFixedCost = async (
        values: AccountBookFixedCostRequest
    ) => {
        if (editingFixedCost) {
            await handleUpdateFixedCost(editingFixedCost.id, values);
            return;
        }

        await handleCreateFixedCost(values);
    };

    const handleUpdateFixedCost = async (
        fixedCostId: number,
        values: AccountBookFixedCostRequest
    ) => {
        try {
            const updatedFixedCost =
                await accountBookFixedCostService.updateFixedCost(
                    accountBookId,
                    fixedCostId,
                    values
                );

            await mutateFixedCosts((currentData) => {
                if (!currentData) {
                    return [updatedFixedCost];
                }

                return sortFixedCosts(
                    currentData.map((fixedCost) =>
                        fixedCost.id === fixedCostId
                            ? updatedFixedCost
                            : fixedCost
                    )
                );
            }, false);

            await mutateCategoryOptions();
            await mutateStoreOptions();
            await revalidateFixedCostGenerationTargets();
        } catch (error) {
            console.error(error);
            alert(t("fixedCost.messages.updateFailed"));
            throw error;
        }
    };

    const toTransactionUpdateRequest = (
        values: CreateTransactionFormValues
    ): AccountBookTransactionUpdateRequest => ({
        type: values.type,
        title: values.title.trim(),
        storeName: toNullableText(values.storeName),
        category: values.categoryName.trim(),
        amount: values.amount,
        transactionDate: values.transactionDate,
        memo: toNullableText(values.memo),
    });

    const handleUpdateTransaction = async (
        transactionId: number,
        values: CreateTransactionFormValues
    ) => {
        try {
            const updatedTransaction = await accountBookService.updateTransaction(
                accountBookId,
                transactionId,
                toTransactionUpdateRequest(values)
            );

            await mutateTransactions((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return {
                    ...currentData,
                    page: {
                        ...currentData.page,
                        content: currentData.page.content.map((transaction) =>
                            transaction.id === updatedTransaction.id
                                ? updatedTransaction
                                : transaction
                        ),
                    },
                };
            }, false);

            await mutateTransactions((currentData) => currentData, true);
            await mutateAccountBookSummary((currentData) => currentData, true);
            await mutateMonthlyGoal((currentData) => currentData, true);
            await mutateTransactionMonthOptions((currentData) => currentData, true);
            await mutateMonthlyChart((currentData) => currentData, true);
            await mutateCategoryChart((currentData) => currentData, true);
            await mutateStoreChart((currentData) => currentData, true);
        } catch (error) {
            console.error(error);
            alert(t("transaction.messages.updateFailed"));
            throw error;
        }
    };

    return (
        <>
            <main className="min-h-[calc(100vh-60px)] px-4 pt-24 pb-12 text-gray-800 dark:text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    {isAccountBookDetailLoading ? (
                        <div className="mb-6 rounded-2xl border border-white/70 bg-white/80 p-6 text-sm font-semibold text-slate-500 shadow-lg dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                            {t("messages.loading")}
                        </div>
                    ) : accountBookDetail ? (
                        <AccountBookDetailHeader
                            accountBook={accountBookDetail}
                            onClickCreateTransaction={() => setIsCreateModalOpen(true)}
                            canManageMembers={canManageMembers}
                            onClickManageMembers={() => setIsMemberModalOpen(true)}
                        />
                    ) : (
                        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                            {t("messages.loadFailed")}
                        </div>
                    )}

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

                    <FixedCostGenerationBanner
                        generationTargets={fixedCostGenerationTargets}
                        currencyCode={currencyCode}
                        isLoading={isGeneratingFixedCostTransactions}
                        onClickGenerate={handleGenerateFixedCostTransactions}
                    />

                    <FixedCostSection
                        fixedCosts={fixedCosts}
                        currencyCode={currencyCode}
                        isLoading={isFixedCostsLoading}
                        errorMessage={fixedCostsError}
                        onClickCreateFixedCost={() => setIsCreateFixedCostModalOpen(true)}
                        onClickEditFixedCost={setEditingFixedCost}
                        onClickDeleteFixedCost={setDeletingFixedCost}
                        onChangeActive={handleChangeFixedCostActive}
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

                    <TransactionFilterPanel
                        keyword={keyword}
                        filterType={filterType}
                        selectedMonth={selectedMonth}
                        monthOptions={transactionMonthOptions}
                        onChangeKeyword={handleChangeKeyword}
                        onChangeFilterType={handleChangeFilterType}
                        onChangeSelectedMonth={handleChangeSelectedMonth}
                    />

                    {transactionError && (
                        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                            {transactionError}
                        </div>
                    )}

                    <div className="relative min-h-40">
                        <SpinLoader isLoading={isTransactionLoading} size="lg" />

                        <TransactionList
                            transactions={transactions}
                            currencyCode={currencyCode}
                            onClickEditTransaction={setEditingTransaction}
                            onClickDeleteTransaction={setDeletingTransaction}
                            isLoading={isTransactionLoading}
                            page={transactionPage}
                            totalPages={transactionTotalPages}
                            onChangePage={setTransactionPage}
                        />
                    </div>
                </div>
            </main>

            <TransactionFormModal
                key={editingTransaction ? `edit-${editingTransaction.id}` : "create"}
                isOpen={isCreateModalOpen || editingTransaction !== null}
                mode={editingTransaction ? "EDIT" : "CREATE"}
                transaction={editingTransaction}
                currencyCode={currencyCode}
                categoryOptions={categoryOptions}
                storeOptions={storeOptions}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setEditingTransaction(null);
                }}
                onSubmit={async (values, transactionId) => {
                    if (editingTransaction && transactionId) {
                        await handleUpdateTransaction(transactionId, values);
                        setEditingTransaction(null);
                        return;
                    }

                    await handleCreateTransaction(values);
                    setIsCreateModalOpen(false);
                }}
            />

            <FixedCostFormModal
                isOpen={isCreateFixedCostModalOpen || editingFixedCost !== null}
                fixedCost={editingFixedCost}
                currencyCode={currencyCode}
                categoryOptions={categoryOptions}
                storeOptions={storeOptions}
                onClose={handleCloseFixedCostModal}
                onSubmit={handleSubmitFixedCost}
            />

            <ConfirmModal
                isOpen={deletingFixedCost !== null}
                title={t("fixedCost.deleteConfirm.title")}
                description={t("fixedCost.deleteConfirm.description", {
                    title: deletingFixedCost?.title ?? "",
                })}
                confirmLabel={t("fixedCost.deleteConfirm.confirm")}
                variant="danger"
                onClose={() => setDeletingFixedCost(null)}
                onConfirm={handleDeleteFixedCost}
            />

            <ConfirmModal
                isOpen={deletingTransaction !== null}
                title={
                    deletingTransaction?.sourceType === "FIXED_COST"
                        ? t("transaction.deleteConfirm.fixedCostTitle")
                        : t("transaction.deleteConfirm.title")
                }
                description={
                    deletingTransaction?.sourceType === "FIXED_COST"
                        ? t("transaction.deleteConfirm.fixedCostDescription", {
                            title: deletingTransaction?.title ?? "",
                        })
                        : t("transaction.deleteConfirm.description", {
                            title: deletingTransaction?.title ?? "",
                        })
                }
                confirmLabel={t("transaction.deleteConfirm.confirm")}
                variant="danger"
                onClose={() => setDeletingTransaction(null)}
                onConfirm={handleDeleteTransaction}
            />

            {accountBookDetail && (
                <AccountBookMemberManageModal
                    isOpen={isMemberModalOpen}
                    accountBookId={accountBookId}
                    accountBookName={accountBookDetail.name}
                    onClose={() => setIsMemberModalOpen(false)}
                />
            )}
        </>
    );
}