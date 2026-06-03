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

export default function AccountBookDetailPage() {
    const params = useParams<{ accountBookId: string }>();

    const [keyword, setKeyword] = useState("");
    const [filterType, setFilterType] =
        useState<TransactionFilterType>("ALL");
    const [selectedMonth, setSelectedMonth] = useState("ALL");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isFixedExpenseModalOpen, setIsFixedExpenseModalOpen] = useState(false);

    const [transactions, setTransactions] =
        useState<AccountBookTransaction[]>(mockTransactions);

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

    return (
        <>
            <main className="min-h-[calc(100vh-60px)] px-4 pt-20 pb-12 text-gray-800 dark:text-white sm:px-6 lg:px-8">
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
                    />
                </div>
            </main>

            <TransactionCreateModal
                isOpen={isCreateModalOpen}
                currencyCode={accountBookSummary.currencyCode}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateTransaction}
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