import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAccountBookDetailRevalidation } from "../useAccountBookDetailRevalidation";
import { useAccountBookTransactionQueries } from "./useAccountBookTransactionQueries";
import { accountBookTransactionService } from "@/services/account-book/accountBookTransactionService";
import { toTransactionCreateRequest, toTransactionUpdateRequest } from "@/utils/account-book/detail/transactionRequest";
import type {
    AccountBookTransaction,
    CreateTransactionFormValues,
    TransactionFilterType,
    ReceiptAnalysisMode,
    ReceiptRegistrationCandidate,
    ReceiptBatchRegistrationRequest,
} from "@/types/accountBook";

type Params = {
    accountBookId: number;
    selectedMonth: string;
    onCloseCreateModal: () => void;
    onChangeSelectedMonth: (value: string) => void;
};

export function useAccountBookTransactionController({
    accountBookId,
    selectedMonth,
    onCloseCreateModal,
    onChangeSelectedMonth,
}: Params) {
    const t = useTranslations("AccountBook.detail");
    const revalidation = useAccountBookDetailRevalidation({
        accountBookId,
        selectedMonth,
    });
    const [keyword, setKeyword] = useState("");
    const [filterType, setFilterType] = useState<TransactionFilterType>("ALL");
    const [transactionPage, setTransactionPage] = useState(0);
    const [editingTransaction, setEditingTransaction] = useState<AccountBookTransaction | null>(null);
    const [detailTransaction, setDetailTransaction] = useState<AccountBookTransaction | null>(null);
    const [deletingTransaction, setDeletingTransaction] = useState<AccountBookTransaction | null>(null);
    const transactionKeyword = keyword.trim();
    const queries = useAccountBookTransactionQueries({
        accountBookId,
        selectedMonth,
        transactionPage,
        filterType,
        transactionKeyword,
    });
    const {
        mutateTransactions,
        mutateTransactionMonthOptions,
        mutateCategories
    } = queries;

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

    const handleAnalyzeReceipt = (file: File, analysisMode: ReceiptAnalysisMode, signal?: AbortSignal) => accountBookTransactionService.analyzeReceipt(
        accountBookId,
        file,
        analysisMode,
        signal
    );

    const handleCreateTransaction = async (values: CreateTransactionFormValues) => {
        try {
            await accountBookTransactionService.createTransaction(accountBookId, toTransactionCreateRequest(values));
            await revalidation.revalidateTransactionRelated();
        } catch (error) {
            console.error(error);
            alert(t("transaction.messages.createFailed"));
            throw error;
        }
    };

    const handleUpdateTransaction = async (transactionId: number, values: CreateTransactionFormValues) => {
        try {
            const updatedTransaction = await accountBookTransactionService.updateTransaction(accountBookId, transactionId, toTransactionUpdateRequest(values));
            await mutateTransactions(
                (currentData) => {
                    if (!currentData) {
                        return currentData;
                    }

                    return {
                        ...currentData,
                        page: {
                            ...currentData.page,
                            content: currentData.page.content.map((transaction) => transaction.id === updatedTransaction.id
                                ? updatedTransaction
                                : transaction),
                        },
                    };
                },
                false
            );
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
            await accountBookTransactionService.deleteTransaction(accountBookId, targetTransaction.id);
            await mutateTransactions(
                (currentData) => {
                    if (!currentData) {
                        return currentData;
                    }

                    return {
                        ...currentData,
                        page: {
                            ...currentData.page,
                            content: currentData.page.content.filter((transaction) => transaction.id !== targetTransaction.id),
                            page: {
                                ...currentData.page.page,
                                totalElements: Math.max(currentData.page.page.totalElements - 1, 0),
                            },
                        },
                    };
                },
                false
            );
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

    const handleCloseForm = () => {
        onCloseCreateModal();
        setEditingTransaction(null);
    };

    const handleSubmitForm = async (values: CreateTransactionFormValues, transactionId?: number) => {
        if (editingTransaction && transactionId) {
            await handleUpdateTransaction(transactionId, values);
            setEditingTransaction(null);
            return;
        }
        await handleCreateTransaction(values);
        onCloseCreateModal();
        await mutateTransactionMonthOptions((currentData) => currentData, true);
    };

    const handlePreviewReceiptConversion = (candidate: ReceiptRegistrationCandidate) => accountBookTransactionService.previewReceiptConversion(accountBookId, candidate);

    const handleSubmitReceiptBatch = async (request: ReceiptBatchRegistrationRequest, idempotencyKey: string) => {
        await accountBookTransactionService.registerReceiptBatch(accountBookId, request, idempotencyKey);
        // Registration succeeded: a refresh failure must not offer a duplicate retry.
        await Promise.allSettled([
            revalidation.revalidateTransactionRelated(),
            mutateTransactionMonthOptions((currentData) => currentData, true),
        ]);
    };

    const handleEditDetail = (transaction: AccountBookTransaction) => {
        setDetailTransaction(null);
        setEditingTransaction(transaction);
    };

    const handleCloseDetail = () => setDetailTransaction(null);
    const handleCloseDelete = () => setDeletingTransaction(null);

    const handleRetryCategories = () => {
        void mutateCategories();
    };

    return {
        ...queries,
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
    };
}
