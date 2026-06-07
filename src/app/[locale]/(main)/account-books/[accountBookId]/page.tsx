"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AccountBookDetailHeader from "@/components/account-book/detail/AccountBookDetailHeader";
import AccountBookSummaryCards from "@/components/account-book/detail/AccountBookSummaryCards";
import TransactionFilterPanel, {
    TransactionFilterType,
} from "@/components/account-book/detail/TransactionFilterPanel";
import TransactionList from "@/components/account-book/detail/TransactionList";
import {
    mockAccountBookDetail,
    mockTransactions,
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

function createClientId(prefix: string) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}`;
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

export default function AccountBookDetailPage() {
    const params = useParams<{ accountBookId: string }>();

    const [keyword, setKeyword] = useState("");
    const [filterType, setFilterType] =
        useState<TransactionFilterType>("ALL");
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isFixedExpenseModalOpen, setIsFixedExpenseModalOpen] = useState(false);

    const [transactions, setTransactions] =
        useState<AccountBookTransaction[]>(mockTransactions);

    const [editingTransaction, setEditingTransaction] =
        useState<AccountBookTransaction | null>(null);

    const [fixedExpenses, setFixedExpenses] =
        useState<AccountBookFixedExpense[]>([]);

    const [expenseGoalAmount, setExpenseGoalAmount] =
        useState<number | null>(mockAccountBookDetail.expenseGoalAmount ?? null);

    const accountBookSummary = useMemo(() => {
        return {
            ...buildAccountBookSummary(mockAccountBookDetail, transactions),
            expenseGoalAmount,
        };
    }, [transactions, expenseGoalAmount]);

    const filteredTransactions = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();

        return transactions.filter((transaction: AccountBookTransaction) => {
            const matchedAccountBook =
                transaction.accountBookId === mockAccountBookDetail.id ||
                transaction.accountBookId === params.accountBookId;

            const matchedType =
                filterType === "ALL" || transaction.type === filterType;

            const matchedMonth =
                selectedMonth === "ALL" ||
                transaction.transactionDate.startsWith(selectedMonth);

            const matchedKeyword =
                !normalizedKeyword ||
                transaction.title.toLowerCase().includes(normalizedKeyword) ||
                transaction.categoryName.toLowerCase().includes(normalizedKeyword) ||
                transaction.memo?.toLowerCase().includes(normalizedKeyword);

            return (
                matchedAccountBook &&
                matchedType &&
                matchedMonth &&
                matchedKeyword
            );
        });
    }, [transactions, keyword, filterType, selectedMonth, params.accountBookId]);

    const analyticsTransactions = useMemo(() => {
        return transactions.filter((transaction) => {
            const matchedAccountBook =
                transaction.accountBookId === mockAccountBookDetail.id ||
                transaction.accountBookId === params.accountBookId;

            const matchedMonth =
                selectedMonth === "ALL" ||
                transaction.transactionDate.startsWith(selectedMonth);

            return (
                matchedAccountBook &&
                matchedMonth &&
                transaction.type === "EXPENSE"
            );
        });
    }, [transactions, selectedMonth, params.accountBookId]);

    const categoryExpenseData = useMemo(() => {
        return buildExpenseBreakdownData(
            analyticsTransactions,
            (transaction) => transaction.categoryName || "未分類",
            5
        );
    }, [analyticsTransactions]);

    const storeExpenseData = useMemo(() => {
        return buildExpenseBreakdownData(
            analyticsTransactions,
            (transaction) => transaction.storeName || "店名未設定",
            5
        );
    }, [analyticsTransactions]);

    const handleCreateFixedExpense = (values: CreateFixedExpenseFormValues) => {
        const newFixedExpense: AccountBookFixedExpense = {
            id: createClientId("fixed"),
            accountBookId: mockAccountBookDetail.id,
            title: values.title,
            storeName: values.storeName,
            categoryName: values.categoryName,
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
            id: createClientId("tx"),
            accountBookId: mockAccountBookDetail.id,
            type: values.type,
            title: values.title,
            categoryName: values.categoryName,
            amount: values.amount,
            transactionDate: values.transactionDate,
            memo: values.memo,
        };

        setTransactions((prevTransactions) => [
            newTransaction,
            ...prevTransactions,
        ]);
    };

    const handleSaveExpenseGoalAmount = async (goalAmount: number | null) => {
        console.log("저장할 목표 금액:", goalAmount);

        // TODO: API 연결
        // await updateAccountBookExpenseGoal(accountBook.id, goalAmount);

        // TODO: 저장 후 accountBook 다시 조회
        // await fetchAccountBookDetail();

        setExpenseGoalAmount(goalAmount);
    };

    const handleUpdateTransaction = (
        transactionId: string,
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
                        accountBook={accountBookSummary}
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
                            title="カテゴリ別支出"
                            description="支出額が多いカテゴリを上位から表示します。"
                            data={categoryExpenseData}
                            currencyCode={accountBookSummary.currencyCode}
                        />

                        <ExpenseBreakdownPieChart
                            title="店舗別支出"
                            description="支出額が多い店舗を上位から表示します。"
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

                    <TransactionList
                        transactions={filteredTransactions}
                        currencyCode={accountBookSummary.currencyCode}
                        onClickEditTransaction={setEditingTransaction}
                    />
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