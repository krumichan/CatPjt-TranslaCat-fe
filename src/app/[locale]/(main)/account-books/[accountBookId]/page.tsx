"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AccountBookDetailHeader from "@/components/account-book/detail/AccountBookDetailHeader";
import AccountBookSummaryCards from "@/components/account-book/detail/AccountBookSummaryCards";
import TransactionFilterPanel, {
    TransactionFilterType,
} from "@/components/account-book/detail/TransactionFilterPanel";
import TransactionList from "@/components/account-book/detail/transaction-list/TransactionList";
import {
    mockAccountBookDetail,
} from "@/data/account-book/mockAccountBookDetail";
import FixedExpenseCreateModal from "@/components/account-book/detail/modal/FixedExpenseCreateModal";
import TransactionCreateModal from "@/components/account-book/detail/modal/TransactionCreateModal";
import {
    AccountBookTransaction,
    CreateTransactionFormValues,
    AccountBookFixedExpense,
    CreateFixedExpenseFormValues,
} from "@/types/accountBook";
import AccountBookExpenseGoalCard from "@/components/account-book/detail/AccountBookExpenseGoalCard";
import MonthlyExpenseChart from "@/components/account-book/analytics/MonthlyExpenseChart";
import {mockMonthlyAnalytics} from "@/data/account-book/mockAccountBookAnalytics";
import FixedExpenseSection from "@/components/account-book/detail/FixedExpenseSection";
import ExpenseBreakdownPieChart, {buildExpenseBreakdownData} from "@/components/account-book/analytics/ExpenseBreakdownPieChart";
import TransactionEditModal from "@/components/account-book/detail/modal/TransactionEditModal";
import {accountBookService} from "@/services/account-book/accountBookService";
import {useTranslations} from "next-intl";
import SpinLoader from "@/components/common/SpinLoader";
import {accountBookMonthlyGoalService} from "@/services/account-book/accountBookMonthlyGoalService";
import {useQuery} from "@/hooks/useQuery";

function createClientId(): number {
    return Date.now();
}

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

export default function AccountBookDetailPage() {
    const t = useTranslations("AccountBook.detail");
    const params = useParams<{ accountBookId: string }>();

    const [keyword, setKeyword] = useState("");
    const [filterType, setFilterType] =
        useState<TransactionFilterType>("ALL");
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);

    const selectedYearMonth = useMemo(() => {
        return parseSelectedMonthValue(selectedMonth);
    }, [selectedMonth]);

    const [transactionPage, setTransactionPage] = useState(0);

    const {
        data: monthlyGoal,
        isLoading: isMonthlyGoalLoading,
        isError: monthlyGoalQueryError,
        mutate: mutateMonthlyGoal,
    } = useQuery({
        keys: selectedYearMonth
            ? [
                Number(params.accountBookId),
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

    const transactionKeyword = keyword.trim();

    const {
        data: transactionResponse,
        isLoading: isTransactionLoading,
        isError: transactionQueryError,
        mutate: mutateTransactions,
    } = useQuery({
        keys: [
            "account-book-transactions",
            params.accountBookId,
            selectedMonth,
            transactionPage,
            filterType,
            transactionKeyword,
        ] as const,
        fetcher: (_, accountBookId, selectedMonthValue, page, type, keywordValue) => {
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
        data: transactionMonthOptions = [],
    } = useQuery({
        keys: [
            "account-book-transaction-months",
            Number(params.accountBookId),
        ] as const,
        fetcher: (_, accountBookId) =>
            accountBookService.listTransactionMonths(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });

    const {
        data: accountBookSummary,
        isLoading: isAccountBookSummaryLoading,
        isError: accountBookSummaryQueryError,
    } = useQuery({
        keys: [
            "account-book-summary",
            Number(params.accountBookId),
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

    const currencyCode = accountBookSummary?.currencyCode ?? "JPY";

    const monthlyGoalAmount = monthlyGoal?.goalAmount ?? null;

    const monthlyGoalError = monthlyGoalQueryError
        ? t("expenseGoal.messages.loadFailed")
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
    const [isFixedExpenseModalOpen, setIsFixedExpenseModalOpen] = useState(false);

    const [editingTransaction, setEditingTransaction] =
        useState<AccountBookTransaction | null>(null);

    const [fixedExpenses, setFixedExpenses] =
        useState<AccountBookFixedExpense[]>([]);

    const analyticsTransactions = useMemo(() => {
        return transactions.filter((transaction) => {
            const matchedMonth =
                selectedMonth === "ALL" ||
                transaction.transactionDate.startsWith(selectedMonth);

            return matchedMonth && transaction.type === "EXPENSE";
        });
    }, [transactions, selectedMonth]);

    const categoryExpenseData = useMemo(() => {
        return buildExpenseBreakdownData(
            analyticsTransactions,
            (transaction) => transaction.category || t("chart.uncategorized"),
            5
        );
    }, [analyticsTransactions, t]);

    const storeExpenseData = useMemo(() => {
        return buildExpenseBreakdownData(
            analyticsTransactions,
            (transaction) => transaction.storeName || t("chart.storeNotSet"),
            5
        );
    }, [analyticsTransactions, t]);

    const handleCreateFixedExpense = (values: CreateFixedExpenseFormValues) => {
        const newFixedExpense: AccountBookFixedExpense = {
            id: createClientId(),
            accountBookId: mockAccountBookDetail.id,
            title: values.title,
            storeName: values.storeName,
            category: values.categoryName,
            amount: values.amount,
            paymentDay: values.paymentDay,
            memo: values.memo,
            isActive: true,
        };

        setFixedExpenses((prevFixedExpenses) => [
            newFixedExpense,
            ...prevFixedExpenses,
        ]);
    };

    const handleCreateTransaction = (values: CreateTransactionFormValues) => {
        const newTransaction: AccountBookTransaction = {
            id: createClientId(),
            accountBookId: mockAccountBookDetail.id,
            type: values.type,
            title: values.title,
            storeName: values.storeName,
            category: values.categoryName,
            amount: values.amount,
            transactionDate: values.transactionDate,
            memo: values.memo,
        };

        void mutateTransactions((currentData) => {
            if (!currentData) {
                return currentData;
            }

            return {
                ...currentData,
                page: {
                    ...currentData.page,
                    content: [newTransaction, ...currentData.page.content],
                    page: {
                        ...currentData.page.page,
                        totalElements:
                            currentData.page.page.totalElements + 1,
                    },
                },
            };
        }, false);
    };

    const handleChangeFilterType = (value: TransactionFilterType) => {
        setFilterType(value);
        setTransactionPage(0);
    };

    const handleChangeKeyword = (value: string) => {
        setKeyword(value);
        setTransactionPage(0);
    };

    const handleChangeSelectedMonth = (value: string) => {
        setSelectedMonth(value);
        setTransactionPage(0);
    };

    const handleSaveExpenseGoalAmount = async (
        year: number,
        month: number,
        goalAmount: number
    ) => {
        try {
            const response = await accountBookMonthlyGoalService.saveMonthlyGoal(
                Number(params.accountBookId),
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
            }
        } catch (error) {
            console.error(error);
            alert(t("expenseGoal.messages.saveFailed"));
        }
    };

    const handleUpdateTransaction = (
        transactionId: number,
        values: CreateTransactionFormValues
    ) => {
        void mutateTransactions((currentData) => {
            if (!currentData) {
                return currentData;
            }

            return {
                ...currentData,
                page: {
                    ...currentData.page,
                    content: currentData.page.content.map((transaction) =>
                        transaction.id === transactionId
                            ? {
                                ...transaction,
                                type: values.type,
                                title: values.title,
                                storeName: values.storeName,
                                category: values.categoryName,
                                amount: values.amount,
                                transactionDate: values.transactionDate,
                                memo: values.memo,
                            }
                            : transaction
                    ),
                },
            };
        }, false);
    };

    return (
        <>
            <main className="min-h-[calc(100vh-60px)] px-4 pt-24 pb-12 text-gray-800 dark:text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <AccountBookDetailHeader
                        accountBook={{
                            ...mockAccountBookDetail,
                            currencyCode,
                            incomeAmount: accountBookSummary?.incomeAmount ?? 0,
                            expenseAmount: accountBookSummary?.expenseAmount ?? 0,
                            balance: accountBookSummary?.balance ?? 0,
                            transactionCount: accountBookSummary?.transactionCount ?? 0,
                        }}
                        onClickCreateTransaction={() => setIsCreateModalOpen(true)}
                    />

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
                        accountBookId={Number(params.accountBookId)}
                        selectedMonth={selectedMonth}
                        currencyCode={currencyCode}
                        goalAmount={monthlyGoalAmount}
                        expenseAmount={monthlyGoal?.expenseAmount ?? 0}
                        isLoading={isMonthlyGoalLoading}
                        errorMessage={monthlyGoalError}
                        onSaveGoalAmount={handleSaveExpenseGoalAmount}
                    />

                    <FixedExpenseSection
                        fixedExpenses={fixedExpenses}
                        currencyCode={currencyCode}
                        onClickCreateFixedExpense={() => setIsFixedExpenseModalOpen(true)}
                    />

                    <MonthlyExpenseChart
                        data={mockMonthlyAnalytics}
                        currencyCode="JPY"
                    />

                    <div className="mt-6 mb-6 grid gap-6 lg:grid-cols-2">
                        <ExpenseBreakdownPieChart
                            title={t("chart.categoryExpenseTitle")}
                            description={t("chart.categoryExpenseDescription")}
                            data={categoryExpenseData}
                            currencyCode={currencyCode}
                        />

                        <ExpenseBreakdownPieChart
                            title={t("chart.storeExpenseTitle")}
                            description={t("chart.storeExpenseDescription")}
                            data={storeExpenseData}
                            currencyCode={currencyCode}
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
                            isLoading={isTransactionLoading}
                            page={transactionPage}
                            totalPages={transactionTotalPages}
                            onChangePage={setTransactionPage}
                        />
                    </div>
                </div>
            </main>

            <TransactionCreateModal
                isOpen={isCreateModalOpen}
                currencyCode={currencyCode}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateTransaction}
            />

            <TransactionEditModal
                isOpen={editingTransaction !== null}
                transaction={editingTransaction}
                currencyCode={currencyCode}
                onClose={() => setEditingTransaction(null)}
                onSubmit={(transactionId, values) => {
                    handleUpdateTransaction(transactionId, values);
                    setEditingTransaction(null);
                }}
            />

            <FixedExpenseCreateModal
                isOpen={isFixedExpenseModalOpen}
                currencyCode={currencyCode}
                onClose={() => setIsFixedExpenseModalOpen(false)}
                onSubmit={handleCreateFixedExpense}
            />
        </>
    );
}