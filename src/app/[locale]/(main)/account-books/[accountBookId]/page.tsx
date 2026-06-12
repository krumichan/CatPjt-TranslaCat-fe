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
import TransactionCreateModal from "@/components/account-book/detail/modal/TransactionCreateModal";
import FixedCostFormModal from "@/components/account-book/detail/modal/FixedCostFormModal";
import FixedCostSection from "@/components/account-book/detail/FixedCostSection";
import {
    AccountBookTransaction,
    CreateTransactionFormValues,
    AccountBookFixedCostRequest,
    AccountBookFixedCost,
} from "@/types/accountBook";
import AccountBookExpenseGoalCard from "@/components/account-book/detail/AccountBookExpenseGoalCard";
import MonthlyExpenseChart from "@/components/account-book/analytics/MonthlyExpenseChart";
import {mockMonthlyAnalytics} from "@/data/account-book/mockAccountBookAnalytics";
import ExpenseBreakdownPieChart, {buildExpenseBreakdownData} from "@/components/account-book/analytics/ExpenseBreakdownPieChart";
import TransactionEditModal from "@/components/account-book/detail/modal/TransactionEditModal";
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
        mutate: mutateTransactionMonthOptions,
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
        mutate: mutateAccountBookSummary,
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

    const {
        data: fixedCosts = [],
        isLoading: isFixedCostsLoading,
        isError: fixedCostsQueryError,
        mutate: mutateFixedCosts,
    } = useQuery({
        keys: [
            "account-book-fixed-costs",
            Number(params.accountBookId),
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
        data: fixedCostCategoryOptions = [],
        mutate: mutateFixedCostCategoryOptions,
    } = useQuery({
        keys: [
            "account-book-categories",
            Number(params.accountBookId),
        ] as const,
        fetcher: (_, accountBookId) =>
            accountBookCategoryService.listCategories(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });

    const {
        data: fixedCostStoreOptions = [],
        mutate: mutateFixedCostStoreOptions,
    } = useQuery({
        keys: [
            "account-book-store-suggestions",
            Number(params.accountBookId),
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
                Number(params.accountBookId),
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
                    Number(params.accountBookId),
                    values
                );

            await mutateFixedCosts((currentData) => {
                const nextData = currentData
                    ? [createdFixedCost, ...currentData]
                    : [createdFixedCost];

                return sortFixedCosts(nextData);
            }, false);

            await mutateFixedCostCategoryOptions();
            await mutateFixedCostStoreOptions();
            await revalidateFixedCostGenerationTargets();
        } catch (error) {
            console.error(error);
            alert(t("fixedCost.messages.createFailed"));
            throw error;
        }
    };

    const handleCreateTransaction = (values: CreateTransactionFormValues) => {
        const newTransaction: AccountBookTransaction = {
            id: createClientId(),
            accountBookId: mockAccountBookDetail.id,
            type: values.type,
            title: values.title,
            storeName: values.storeName?.trim() || null,
            category: values.categoryName,
            amount: values.amount,
            transactionDate: values.transactionDate,
            memo: values.memo?.trim() || null,

            sourceType: null,
            sourceId: null,
            sourceYear: null,
            sourceMonth: null,
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

    const handleChangeFixedCostActive = async (
        fixedCostId: number,
        active: boolean
    ) => {
        try {
            const updatedFixedCost =
                await accountBookFixedCostService.updateActive(
                    Number(params.accountBookId),
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
                Number(params.accountBookId),
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

            await mutateFixedCostCategoryOptions();
            await mutateFixedCostStoreOptions();
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

        try {
            await accountBookService.deleteTransaction(
                Number(params.accountBookId),
                deletingTransaction.id
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
                            (transaction) =>
                                transaction.id !== deletingTransaction.id
                        ),
                        page: {
                            ...currentData.page.page,
                            totalElements:
                                currentData.page.page.totalElements - 1,
                        },
                    },
                };
            }, false);

            await mutateAccountBookSummary((currentData) => currentData, true);
            await mutateMonthlyGoal((currentData) => currentData, true);

            if (deletingTransaction.sourceType === "FIXED_COST") {
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
                Number(params.accountBookId),
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
                    Number(params.accountBookId),
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

            await mutateFixedCostCategoryOptions();
            await mutateFixedCostStoreOptions();
            await revalidateFixedCostGenerationTargets();
        } catch (error) {
            console.error(error);
            alert(t("fixedCost.messages.updateFailed"));
            throw error;
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
                                storeName: toNullableText(values.storeName),
                                category: values.categoryName,
                                amount: values.amount,
                                transactionDate: values.transactionDate,
                                memo: toNullableText(values.memo),
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
                            onClickDeleteTransaction={setDeletingTransaction}
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

            <FixedCostFormModal
                isOpen={isCreateFixedCostModalOpen || editingFixedCost !== null}
                fixedCost={editingFixedCost}
                currencyCode={currencyCode}
                categoryOptions={fixedCostCategoryOptions}
                storeOptions={fixedCostStoreOptions}
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
        </>
    );
}