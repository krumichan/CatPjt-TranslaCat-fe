"use client";

import { useTranslations } from "next-intl";
import SpinLoader from "@/components/common/SpinLoader";
import ConfirmModal from "@/components/common/ConfirmModal";
import TransactionList from "@/components/account-book/detail/transaction-list/TransactionList";
import TransactionFormModal from "@/components/account-book/detail/modal/TransactionFormModal";
import TransactionDetailModal from "@/components/account-book/detail/modal/TransactionDetailModal";
import TransactionFilterPanel from "@/components/account-book/detail/TransactionFilterPanel";
import { useAccountBookTransactionController } from "@/hooks/account-book/detail/transaction/useAccountBookTransactionController";
import type { CurrencyCode } from "@/types/accountBook";

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
    const {
        keyword,
        filterType,
        transactionPage,
        setTransactionPage,
        editingTransaction,
        setEditingTransaction,
        detailTransaction,
        setDetailTransaction,
        deletingTransaction,
        setDeletingTransaction,
        transactionMonthOptions,
        transactionError,
        isTransactionLoading,
        transactions,
        transactionTotalPages,
        categoryOptions,
        categoryOptionsStatus,
        storeOptions,
        incomeSourceOptions,
        handleChangeKeyword,
        handleChangeFilterType,
        handleChangeSelectedMonth,
        handleAnalyzeReceipt,
        handlePreviewReceiptConversion,
        handleSubmitReceiptBatch,
        handleCloseForm,
        handleSubmitForm,
        handleEditDetail,
        handleCloseDetail,
        handleCloseDelete,
        handleDeleteTransaction,
        handleRetryCategories,
    } = useAccountBookTransactionController({
        accountBookId,
        selectedMonth,
        onCloseCreateModal,
        onChangeSelectedMonth,
    });

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
                <SpinLoader
                    isLoading={isTransactionLoading}
                    size="lg"
                />

                <TransactionList
                    transactions={transactions}
                    currencyCode={currencyCode}
                    onClickEditTransaction={setEditingTransaction}
                    onClickDetailTransaction={setDetailTransaction}
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
                    isOpen={isCreateModalOpen || editingTransaction !== null}
                    mode={editingTransaction ? "EDIT" : "CREATE"}
                    transaction={editingTransaction}
                    currencyCode={currencyCode}
                    categoryOptions={categoryOptions}
                    categoryOptionsStatus={categoryOptionsStatus}
                    onRetryCategories={handleRetryCategories}
                    storeOptions={storeOptions}
                    incomeSourceOptions={incomeSourceOptions}
                    onAnalyzeReceipt={handleAnalyzeReceipt}
                    onPreviewReceiptConversion={handlePreviewReceiptConversion}
                    onSubmitReceiptBatch={handleSubmitReceiptBatch}
                    onClose={handleCloseForm}
                    onSubmit={handleSubmitForm}
                />
            )}

            {detailTransaction && (
                <TransactionDetailModal
                    transaction={detailTransaction}
                    currencyCode={currencyCode}
                    onClose={handleCloseDetail}
                    onEdit={handleEditDetail}
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
                        ? t(
                            "transaction.deleteConfirm.fixedCostDescription",
                            {
                                title: deletingTransaction?.title ?? "",
                            }
                        )
                        : t(
                            "transaction.deleteConfirm.description",
                            {
                                title: deletingTransaction?.title ?? "",
                            }
                        )
                }
                confirmLabel={t("transaction.deleteConfirm.confirm")}
                variant="danger"
                onClose={handleCloseDelete}
                onConfirm={handleDeleteTransaction}
            />
        </>
    );
}
