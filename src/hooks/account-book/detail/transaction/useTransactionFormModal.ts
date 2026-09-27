import { useMemo, useState, type SyntheticEvent } from "react";
import type { TransactionType } from "@/types/accountBook";
import { DIRECT_INPUT_VALUE } from "@/utils/account-book/transactionForm";
import type { TransactionFormModalProps } from "@/types/accountBookTransactionForm";
import {
    getInitialAmount,
    getInitialCategoryValue,
    getInitialDirectCategoryName,
    getInitialDirectStoreName,
    getInitialMemo,
    getInitialStoreValue,
    getInitialTitle,
    getInitialTransactionDate,
    getInitialType,
    toCategoryNames,
    toStoreNames,
} from "@/utils/account-book/transactionForm";
import { useReceiptWorkflow } from "../receipt/useReceiptWorkflow";
import { isPositiveDecimal } from "@/utils/account-book/decimalInput";

type UseTransactionFormModalParams = Pick<TransactionFormModalProps, "mode"
    | "transaction"
    | "currencyCode"
    | "categoryOptions"
    | "categoryOptionsStatus"
    | "onRetryCategories"
    | "storeOptions"
    | "incomeSourceOptions"
    | "onSubmit"
    | "onClose"
    | "onAnalyzeReceipt"
    | "onPreviewReceiptConversion"
    | "onSubmitReceiptBatch">;

export function useTransactionFormModal({
    mode,
    transaction,
    currencyCode,
    categoryOptions,
    categoryOptionsStatus = categoryOptions.length ? "ready" : "empty",
    onRetryCategories,
    storeOptions,
    incomeSourceOptions = [],
    onSubmit,
    onClose,
    onAnalyzeReceipt,
    onPreviewReceiptConversion,
    onSubmitReceiptBatch,
}: UseTransactionFormModalParams) {
    const categoryNames = useMemo(() => toCategoryNames(categoryOptions), [categoryOptions]);
    const [inputMode, setInputMode] = useState<"MANUAL" | "RECEIPT">("MANUAL");
    const [type, setType] = useState<TransactionType>(() => getInitialType(mode, transaction));
    const storeNames = useMemo(
        () => toStoreNames(type === "INCOME" ? incomeSourceOptions : storeOptions),
        [incomeSourceOptions, storeOptions, type]
    );
    const [title, setTitle] = useState(() => getInitialTitle(mode, transaction));
    const [storeName, setStoreName] = useState(() => getInitialStoreValue(transaction, storeNames));
    const [directStoreName, setDirectStoreName] = useState(() => getInitialDirectStoreName(transaction, storeNames));
    const [categoryName, setCategoryName] = useState(() => getInitialCategoryValue(mode, transaction, categoryNames));
    const [directCategoryName, setDirectCategoryName] = useState(() => getInitialDirectCategoryName(mode, transaction, categoryNames));
    const [amount, setAmount] = useState(() => getInitialAmount(mode, transaction));
    const [transactionDate, setTransactionDate] = useState(() => getInitialTransactionDate(mode, transaction));
    const [memo, setMemo] = useState(() => getInitialMemo(mode, transaction));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const receipt = useReceiptWorkflow({
        onAnalyzeReceipt,
        onPreviewReceiptConversion,
        onSubmitReceiptBatch,
        onClose,
        accountBookCurrencyCode: currencyCode,
    });
    const isCreateMode = mode === "CREATE";
    const isEditMode = mode === "EDIT";
    const isDirectStoreInput = storeName === DIRECT_INPUT_VALUE;
    const isDirectCategoryInput = categoryName === DIRECT_INPUT_VALUE;
    const canSubmit = useMemo(
        () => {
            const finalCategoryName = isDirectCategoryInput
                ? directCategoryName.trim()
                : categoryName.trim();
            return (title.trim().length > 0 &&
                finalCategoryName.length > 0 &&
                isPositiveDecimal(amount) &&
                transactionDate.trim().length > 0);
        },
        [
            title,
            categoryName,
            directCategoryName,
            amount,
            transactionDate,
            isDirectCategoryInput,
        ]
    );

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit || isSubmitting || receipt.isAnalyzingReceipt) {
            return;
        }
        const finalStoreName = isDirectStoreInput
            ? directStoreName.trim()
            : storeName.trim();
        const finalCategoryName = isDirectCategoryInput
            ? directCategoryName.trim()
            : categoryName.trim();
        try {
            setIsSubmitting(true);
            await onSubmit(
                {
                    type,
                    title: title.trim(),
                    storeName: finalStoreName || undefined,
                    categoryName: finalCategoryName,
                    amount: amount.trim(),
                    transactionDate,
                    memo: memo.trim() || undefined,
                },
                transaction?.id
            );
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        categoryNames,
        categoryOptionsStatus,
        onRetryCategories,
        storeNames,
        inputMode,
        setInputMode,
        type,
        setType,
        title,
        setTitle,
        storeName,
        setStoreName,
        directStoreName,
        setDirectStoreName,
        categoryName,
        setCategoryName,
        directCategoryName,
        setDirectCategoryName,
        amount,
        setAmount,
        transactionDate,
        setTransactionDate,
        memo,
        setMemo,
        ...receipt,
        isCreateMode,
        isEditMode,
        isDirectStoreInput,
        isDirectCategoryInput,
        isSubmitting,
        canSubmit,
        handleSubmit,
    };
}

export type TransactionFormController = ReturnType<typeof useTransactionFormModal>;
