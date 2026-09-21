import { SyntheticEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
    ReceiptAnalysisMode,
    TransactionType,
} from "@/types/accountBook";
import { DIRECT_INPUT_VALUE } from "./constants";
import { TransactionFormModalProps } from "./types";
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
} from "./utils";
import { useReceiptReview } from "./useReceiptReview";
import { isPositiveDecimal } from "@/utils/account-book/decimalInput";

type UseTransactionFormModalParams = Pick<
    TransactionFormModalProps,
    | "mode"
    | "transaction"
    | "categoryOptions"
    | "storeOptions"
    | "onSubmit"
    | "onClose"
    | "onAnalyzeReceipt"
    | "onPreviewReceiptConversion"
    | "onSubmitReceiptBatch"
>;

export function useTransactionFormModal({
    mode,
    transaction,
    categoryOptions,
    storeOptions,
    onSubmit,
    onClose,
    onAnalyzeReceipt,
    onPreviewReceiptConversion,
    onSubmitReceiptBatch,
}: UseTransactionFormModalParams) {
    const t = useTranslations("AccountBook.detail.transactionModal");

    const categoryNames = useMemo(
        () => toCategoryNames(categoryOptions),
        [categoryOptions]
    );

    const storeNames = useMemo(
        () => toStoreNames(storeOptions),
        [storeOptions]
    );

    const [inputMode, setInputMode] = useState<"MANUAL" | "RECEIPT">("MANUAL");
    const [type, setType] = useState<TransactionType>(() =>
        getInitialType(mode, transaction)
    );
    const [title, setTitle] = useState(() =>
        getInitialTitle(mode, transaction)
    );
    const [storeName, setStoreName] = useState(() =>
        getInitialStoreValue(transaction, storeNames)
    );
    const [directStoreName, setDirectStoreName] = useState(() =>
        getInitialDirectStoreName(transaction, storeNames)
    );
    const [categoryName, setCategoryName] = useState(() =>
        getInitialCategoryValue(mode, transaction, categoryNames)
    );
    const [directCategoryName, setDirectCategoryName] = useState(() =>
        getInitialDirectCategoryName(mode, transaction, categoryNames)
    );
    const [amount, setAmount] = useState(() =>
        getInitialAmount(mode, transaction)
    );
    const [transactionDate, setTransactionDate] = useState(() =>
        getInitialTransactionDate(mode, transaction)
    );
    const [memo, setMemo] = useState(() =>
        getInitialMemo(mode, transaction)
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [receiptFile, setReceiptFile] = useState<File | null>(null);

    const [receiptAnalysisMode, setReceiptAnalysisMode] =
        useState<ReceiptAnalysisMode>("VISION_FIRST");

    const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);

    const [receiptAnalysisMessage, setReceiptAnalysisMessage] =
        useState<string | null>(null);

    const receiptReview = useReceiptReview({ onPreviewReceiptConversion, onSubmitReceiptBatch, onClose });

    const isCreateMode = mode === "CREATE";
    const isEditMode = mode === "EDIT";
    const isDirectStoreInput = storeName === DIRECT_INPUT_VALUE;
    const isDirectCategoryInput = categoryName === DIRECT_INPUT_VALUE;

    const canSubmit = useMemo(() => {
        const finalCategoryName = isDirectCategoryInput
            ? directCategoryName.trim()
            : categoryName.trim();

        return (
            title.trim().length > 0 &&
            finalCategoryName.length > 0 &&
            isPositiveDecimal(amount) &&
            transactionDate.trim().length > 0
        );
    }, [
        title,
        categoryName,
        directCategoryName,
        amount,
        transactionDate,
        isDirectCategoryInput,
    ]);

    const handleAnalyzeReceipt = async () => {
        if (!receiptFile || !onAnalyzeReceipt || isAnalyzingReceipt || receiptReview.isBusy) {
            return;
        }

        try {
            setIsAnalyzingReceipt(true);
            setReceiptAnalysisMessage(null);
            receiptReview.reset();

            const result = await onAnalyzeReceipt(receiptFile, receiptAnalysisMode);

            receiptReview.applyAnalysis(result);
            setReceiptAnalysisMessage(t("receipt.review.analysisCompleted", { count: result.receipts.length }));
        } catch {
            setReceiptAnalysisMessage(t("receipt.analysisFailed"));
        } finally {
            setIsAnalyzingReceipt(false);
        }
    };

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!canSubmit || isSubmitting || isAnalyzingReceipt) {
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

        receiptFile,
        setReceiptFile: (file: File | null) => {
            setReceiptFile(file);
            receiptReview.reset();
        },
        receiptReview,

        receiptAnalysisMode,
        setReceiptAnalysisMode,

        receiptAnalysisMessage,
        setReceiptAnalysisMessage,

        isAnalyzingReceipt,

        isCreateMode,
        isEditMode,

        isDirectStoreInput,
        isDirectCategoryInput,

        isSubmitting,
        canSubmit,

        handleAnalyzeReceipt,
        handleSubmit,
    };
}
