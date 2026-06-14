import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import SpinLoader from "@/components/common/SpinLoader";
import ConfirmModal from "@/components/common/ConfirmModal";
import TransactionList from "@/components/account-book/detail/transaction-list/TransactionList";
import TransactionFormModal from "@/components/account-book/detail/modal/TransactionFormModal";
import { useQuery } from "@/hooks/useQuery";
import { accountBookCategoryService } from "@/services/account-book/accountBookCategoryService";
import { accountBookTransactionService } from "@/services/account-book/accountBookTransactionService";
import { accountBookDetailQueryKeys } from "@/hooks/account-book/detail/accountBookDetailQueryKeys";
import { useAccountBookDetailRevalidation } from "@/hooks/account-book/detail/useAccountBookDetailRevalidation";
import { parseSelectedMonthValue } from "@/utils/account-book/detail/month";
import { toNullableText } from "@/utils/text/normalizeText";
import {
    AccountBookTransaction,
    AccountBookTransactionCreateRequest,
    AccountBookTransactionUpdateRequest,
    CreateTransactionFormValues,
    CurrencyCode, TransactionFilterType,
} from "@/types/accountBook";
import TransactionFilterPanel from "@/components/account-book/detail/TransactionFilterPanel";

type AccountBookTransactionSmartSectionProps = {
    accountBookId: number;
    selectedMonth: string;
    currencyCode: CurrencyCode;
    isCreateModalOpen: boolean;
    onCloseCreateModal: () => void;
    onChangeSelectedMonth: (value: string) => void;
};

export default function AccountBookTransactionSmartSection({
    accountBookId,
    selectedMonth,
    currencyCode,
    isCreateModalOpen,
    onCloseCreateModal,
    onChangeSelectedMonth,
}: AccountBookTransactionSmartSectionProps) {
    const t = useTranslations("AccountBook.detail");
    const revalidation = useAccountBookDetailRevalidation({
        accountBookId,
        selectedMonth,
    });

    const [keyword, setKeyword] = useState("");
    const [filterType, setFilterType] =
        useState<TransactionFilterType>("ALL");
    const [transactionPage, setTransactionPage] = useState(0);
    const [editingTransaction, setEditingTransaction] =
        useState<AccountBookTransaction | null>(null);
    const [deletingTransaction, setDeletingTransaction] =
        useState<AccountBookTransaction | null>(null);

    const transactionKeyword = keyword.trim();

    const {
        data: transactionMonthOptions = [],
        mutate: mutateTransactionMonthOptions,
    } = useQuery({
        keys: accountBookDetailQueryKeys.transactionMonths(accountBookId),
        fetcher: (_, accountBookId) =>
            accountBookTransactionService.listTransactionMonths(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });

    const {
        data: transactionResponse,
        isLoading: isTransactionLoading,
        isError: transactionQueryError,
        mutate: mutateTransactions,
    } = useQuery({
        keys: accountBookDetailQueryKeys.transactions(
            accountBookId,
            selectedMonth,
            transactionPage,
            filterType,
            transactionKeyword
        ),
        fetcher: (
            _,
            accountBookId,
            selectedMonthValue,
            page,
            type,
            keywordValue
        ) => {
            const parsedMonth = parseSelectedMonthValue(selectedMonthValue);

            return accountBookTransactionService.listTransactions(accountBookId, {
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

    const { data: categoryOptions = [] } = useQuery({
        keys: accountBookDetailQueryKeys.categories(accountBookId),
        fetcher: (_, accountBookId) =>
            accountBookCategoryService.listCategories(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });

    const { data: storeOptions = [] } = useQuery({
        keys: accountBookDetailQueryKeys.storeSuggestions(accountBookId),
        fetcher: (_, accountBookId) =>
            accountBookTransactionService.listStoreSuggestions(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });

    const transactions = useMemo(() => {
        return transactionResponse?.page.content ?? [];
    }, [transactionResponse?.page.content]);

    const transactionTotalPages =
        transactionResponse?.page.page.totalPages ?? 0;

    const transactionError = transactionQueryError
        ? t("transaction.loadError")
        : null;

    const handleChangeFilterType = (value: TransactionFilterType) => {
        setFilterType(value);
        setTransactionPage(0);
    };

    const handleChangeKeyword = (value: string) => {
        setKeyword(value);
        setTransactionPage(0);
    };

    const handleChangeSelectedMonth = (value: string) => {
        onChangeSelectedMonth(value);
        setTransactionPage(0);
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

    const handleCreateTransaction = async (
        values: CreateTransactionFormValues
    ) => {
        try {
            await accountBookTransactionService.createTransaction(
                accountBookId,
                toTransactionCreateRequest(values)
            );

            await revalidation.revalidateTransactionRelated();
        } catch (error) {
            console.error(error);
            alert(t("transaction.messages.createFailed"));
            throw error;
        }
    };

    const handleUpdateTransaction = async (
        transactionId: number,
        values: CreateTransactionFormValues
    ) => {
        try {
            const updatedTransaction =
                await accountBookTransactionService.updateTransaction(
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

            await revalidation.revalidateTransactionRelated();
        } catch (error) {
            console.error(error);
            alert(t("transaction.messages.updateFailed"));
            throw error;
        }
    };

    const handleDeleteTransaction = async () => {
        if (!deletingTransaction) {
            return;
        }

        const targetTransaction = deletingTransaction;

        try {
            await accountBookTransactionService.deleteTransaction(
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

            setDeletingTransaction(null);
            await revalidation.revalidateTransactionRelated();

            if (targetTransaction.sourceType === "FIXED_COST") {
                await revalidation.revalidateFixedCostGenerationTargets();
            }
        } catch (error) {
            console.error(error);
            alert(t("transaction.messages.deleteFailed"));
            throw error;
        }
    };

    return (
        <>
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

            {(isCreateModalOpen || editingTransaction !== null) && (
                <TransactionFormModal
                    key={editingTransaction ? `edit-${editingTransaction.id}` : "create"}
                    isOpen={true}
                    mode={editingTransaction ? "EDIT" : "CREATE"}
                    transaction={editingTransaction}
                    currencyCode={currencyCode}
                    categoryOptions={categoryOptions}
                    storeOptions={storeOptions}
                    onClose={() => {
                        onCloseCreateModal();
                        setEditingTransaction(null);
                    }}
                    onSubmit={async (values, transactionId) => {
                        if (editingTransaction && transactionId) {
                            await handleUpdateTransaction(transactionId, values);
                            setEditingTransaction(null);
                            return;
                        }

                        await handleCreateTransaction(values);
                        onCloseCreateModal();
                        await mutateTransactionMonthOptions(
                            (currentData) => currentData,
                            true
                        );
                    }}
                />
            )}

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
