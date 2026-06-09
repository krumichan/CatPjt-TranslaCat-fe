"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
    AccountBook,
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

function createClientId(): number {
    return Date.now();
}

function buildAccountBookSummary(
    accountBook: AccountBook,
    transactions: AccountBookTransaction[]
): AccountBook {
    const incomeAmount = transactions
        .filter((transaction) => transaction.type === "INCOME")
        .reduce((total, transaction) => total + transaction.amount, 0);

    const expenseAmount = transactions
        .filter((transaction) => transaction.type === "EXPENSE")
        .reduce((total, transaction) => total + transaction.amount, 0);

    return {
        ...accountBook,
        incomeAmount,
        expenseAmount,
        balance: incomeAmount - expenseAmount,
        transactionCount: transactions.length,
    };
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

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isFixedExpenseModalOpen, setIsFixedExpenseModalOpen] = useState(false);

    const [transactions, setTransactions] = useState<AccountBookTransaction[]>([]);
    const [transactionCurrencyName, setTransactionCurrencyName] = useState<string>("");
    const [transactionPage, setTransactionPage] = useState(0);
    const [transactionTotalPages, setTransactionTotalPages] = useState(0);
    const [isTransactionLoading, setIsTransactionLoading] = useState(false);
    const [transactionError, setTransactionError] = useState<string | null>(null);

    const [editingTransaction, setEditingTransaction] =
        useState<AccountBookTransaction | null>(null);

    const [fixedExpenses, setFixedExpenses] =
        useState<AccountBookFixedExpense[]>([]);

    const [monthlyGoalAmount, setMonthlyGoalAmount] = useState<number | null>(null);

    const [isMonthlyGoalLoading, setIsMonthlyGoalLoading] = useState(false);
    const [monthlyGoalError, setMonthlyGoalError] = useState<string | null>(null);

    const accountBookSummary = useMemo(() => {
        return buildAccountBookSummary(mockAccountBookDetail, transactions);
    }, [transactions]);

    const loadMonthlyGoal = useCallback(async () => {
        const parsedMonth = parseSelectedMonthValue(selectedMonth);

        if (!parsedMonth) {
            setMonthlyGoalAmount(null);
            return;
        }

        try {
            setIsMonthlyGoalLoading(true);
            setMonthlyGoalError(null);

            const response = await accountBookMonthlyGoalService.getMonthlyGoal(
                Number(params.accountBookId),
                parsedMonth.year,
                parsedMonth.month
            );

            setMonthlyGoalAmount(response.goalAmount);
        } catch (error) {
            console.error(error);
            setMonthlyGoalError(t("expenseGoal.messages.loadFailed"));
        } finally {
            setIsMonthlyGoalLoading(false);
        }
    }, [params.accountBookId, selectedMonth, t]);

    useEffect(() => {
        void loadMonthlyGoal();
    }, [loadMonthlyGoal]);

    const loadTransactions = useCallback(async () => {
        try {
            setIsTransactionLoading(true);
            setTransactionError(null);

            const parsedMonth = parseSelectedMonthValue(selectedMonth);

            if (!parsedMonth) {
                return;
            }

            const { year, month } = parsedMonth;

            const response = await accountBookService.listTransactions(
                params.accountBookId,
                {
                    year,
                    month,
                    page: transactionPage,
                    size: 20,
                }
            );

            setTransactions(response.page.content);
            setTransactionCurrencyName(response.currencyName);
            setTransactionTotalPages(response.page.page.totalPages);
        } catch (error) {
            console.error(error);
            setTransactionError("거래 내역을 불러오지 못했습니다.");
        } finally {
            setIsTransactionLoading(false);
        }
    }, [params.accountBookId, selectedMonth, transactionPage]);

    useEffect(() => {
        void loadTransactions();
    }, [loadTransactions]);

    useEffect(() => {
        setTransactionPage(0);
    }, [selectedMonth, filterType, keyword]);

    const filteredTransactions = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();

        return transactions.filter((transaction: AccountBookTransaction) => {
            const matchedType =
                filterType === "ALL" || transaction.type === filterType;

            const matchedMonth =
                selectedMonth === "ALL" ||
                transaction.transactionDate.startsWith(selectedMonth);

            const matchedKeyword =
                !normalizedKeyword ||
                transaction.title.toLowerCase().includes(normalizedKeyword) ||
                transaction.category.toLowerCase().includes(normalizedKeyword) ||
                transaction.storeName?.toLowerCase().includes(normalizedKeyword) ||
                transaction.memo?.toLowerCase().includes(normalizedKeyword);

            return matchedType && matchedMonth && matchedKeyword;
        });
    }, [transactions, keyword, filterType, selectedMonth]);

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
            category: values.categoryName,
            amount: values.amount,
            transactionDate: values.transactionDate,
            memo: values.memo,
        };

        setTransactions((prevTransactions) => [
            newTransaction,
            ...prevTransactions,
        ]);
    };

    const handleSaveExpenseGoalAmount = async (
        year: number,
        month: number,
        goalAmount: number
    ) => {
        try {
            setIsMonthlyGoalLoading(true);
            setMonthlyGoalError(null);

            const response = await accountBookMonthlyGoalService.saveMonthlyGoal(
                Number(params.accountBookId),
                {
                    year,
                    month,
                    goalAmount,
                }
            );

            const parsedSelectedMonth = parseSelectedMonthValue(selectedMonth);

            if (
                parsedSelectedMonth &&
                parsedSelectedMonth.year === year &&
                parsedSelectedMonth.month === month
            ) {
                setMonthlyGoalAmount(response.goalAmount);
            }
        } catch (error) {
            console.error(error);
            setMonthlyGoalError(t("expenseGoal.messages.saveFailed"));
        } finally {
            setIsMonthlyGoalLoading(false);
        }
    };

    const handleUpdateTransaction = (
        transactionId: number,
        values: CreateTransactionFormValues
    ) => {
        setTransactions((prevTransactions) =>
            prevTransactions.map((transaction) =>
                transaction.id === transactionId
                    ? {
                        ...transaction,
                        type: values.type,
                        title: values.title,
                        storeName: values.storeName,
                        categoryName: values.categoryName,
                        amount: values.amount,
                        transactionDate: values.transactionDate,
                        memo: values.memo,
                    }
                    : transaction
            )
        );
    };

    return (
        <>
            <main className="min-h-[calc(100vh-60px)] px-4 pt-24 pb-12 text-gray-800 dark:text-white sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <AccountBookDetailHeader
                        accountBook={accountBookSummary}
                        onClickCreateTransaction={() => setIsCreateModalOpen(true)}
                    />

                    <AccountBookSummaryCards accountBook={accountBookSummary} />

                    <AccountBookExpenseGoalCard
                        accountBookId={Number(params.accountBookId)}
                        selectedMonth={selectedMonth}
                        currencyCode={accountBookSummary.currencyCode}
                        goalAmount={monthlyGoalAmount}
                        expenseAmount={accountBookSummary.expenseAmount}
                        isLoading={isMonthlyGoalLoading}
                        errorMessage={monthlyGoalError}
                        onSaveGoalAmount={handleSaveExpenseGoalAmount}
                    />

                    <FixedExpenseSection
                        fixedExpenses={fixedExpenses}
                        currencyCode={accountBookSummary.currencyCode}
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
                            currencyCode={accountBookSummary.currencyCode}
                        />

                        <ExpenseBreakdownPieChart
                            title={t("chart.storeExpenseTitle")}
                            description={t("chart.storeExpenseDescription")}
                            data={storeExpenseData}
                            currencyCode={accountBookSummary.currencyCode}
                        />
                    </div>

                    <TransactionFilterPanel
                        keyword={keyword}
                        filterType={filterType}
                        selectedMonth={selectedMonth}
                        onChangeKeyword={setKeyword}
                        onChangeFilterType={setFilterType}
                        onChangeSelectedMonth={setSelectedMonth}
                    />

                    {transactionError && (
                        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                            {transactionError}
                        </div>
                    )}

                    <div className="relative min-h-40">
                        <SpinLoader isLoading={isTransactionLoading} size="lg" />

                        <TransactionList
                            transactions={filteredTransactions}
                            currencyCode={accountBookSummary.currencyCode}
                            onClickEditTransaction={setEditingTransaction}
                            isLoading={isTransactionLoading}
                        />
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                        type="button"
                        disabled={transactionPage <= 0 || isTransactionLoading}
                        onClick={() => setTransactionPage((prev) => Math.max(prev - 1, 0))}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300"
                    >
                        이전
                    </button>

                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        {transactionPage + 1} / {Math.max(transactionTotalPages, 1)}
                    </span>

                    <button
                        type="button"
                        disabled={
                            isTransactionLoading ||
                            transactionTotalPages === 0 ||
                            transactionPage + 1 >= transactionTotalPages
                        }
                        onClick={() => setTransactionPage((prev) => prev + 1)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300"
                    >
                        다음
                    </button>
                </div>
            </main>

            <TransactionCreateModal
                isOpen={isCreateModalOpen}
                currencyCode={accountBookSummary.currencyCode}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateTransaction}
            />

            <TransactionEditModal
                isOpen={editingTransaction !== null}
                transaction={editingTransaction}
                currencyCode={accountBookSummary.currencyCode}
                onClose={() => setEditingTransaction(null)}
                onSubmit={(transactionId, values) => {
                    handleUpdateTransaction(transactionId, values);
                    setEditingTransaction(null);
                }}
            />

            <FixedExpenseCreateModal
                isOpen={isFixedExpenseModalOpen}
                currencyCode={accountBookSummary.currencyCode}
                onClose={() => setIsFixedExpenseModalOpen(false)}
                onSubmit={handleCreateFixedExpense}
            />
        </>
    );
}