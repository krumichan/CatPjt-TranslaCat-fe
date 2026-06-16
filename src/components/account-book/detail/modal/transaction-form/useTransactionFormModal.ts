import { SyntheticEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
    AccountBookReceiptAnalysisResponse,
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
import {normalizeCandidateName} from "@/utils/text/normalizeText";

type UseTransactionFormModalParams = Pick<
    TransactionFormModalProps,
    | "mode"
    | "transaction"
    | "categoryOptions"
    | "storeOptions"
    | "onSubmit"
    | "onClose"
    | "onAnalyzeReceipt"
>;

export function useTransactionFormModal({
    mode,
    transaction,
    categoryOptions,
    storeOptions,
    onSubmit,
    onClose,
    onAnalyzeReceipt,
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
        useState<ReceiptAnalysisMode>("VISION_ONLY");

    const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);

    const [receiptAnalysisMessage, setReceiptAnalysisMessage] =
        useState<string | null>(null);

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
            Number(amount) > 0 &&
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

    function findMatchedName(candidate: string, options: string[]) {
        const normalizedCandidate = normalizeCandidateName(candidate);

        return options.find(
            (option) => normalizeCandidateName(option) === normalizedCandidate
        );
    }

    const applyStoreCandidate = (candidate?: string | null) => {
        const value = candidate?.trim();

        if (!value) {
            return;
        }

        const matchedStoreName = findMatchedName(value, storeNames);

        if (matchedStoreName) {
            setStoreName(matchedStoreName);
            setDirectStoreName("");
            return;
        }

        setStoreName(DIRECT_INPUT_VALUE);
        setDirectStoreName(value);
    };

    const applyCategoryCandidate = (candidate?: string | null) => {
        const value = candidate?.trim();

        if (!value) {
            return;
        }

        const matchedCategoryName = findMatchedName(value, categoryNames);

        if (matchedCategoryName) {
            setCategoryName(matchedCategoryName);
            setDirectCategoryName("");
            return;
        }

        setCategoryName(DIRECT_INPUT_VALUE);
        setDirectCategoryName(value);
    };

    const applyReceiptAnalysisResult = (
        result: AccountBookReceiptAnalysisResponse
    ) => {
        setType("EXPENSE");

        const nextTitle = result.title?.trim() || result.storeName?.trim();

        if (nextTitle) {
            setTitle(nextTitle);
        }

        applyStoreCandidate(result.storeName);
        applyCategoryCandidate(result.categoryName);

        if (result.amount !== null && result.amount !== undefined) {
            setAmount(String(result.amount));
        }

        if (result.transactionDate) {
            setTransactionDate(result.transactionDate);
        }

        if (result.memo) {
            setMemo(result.memo);
        }
    };

    const handleAnalyzeReceipt = async () => {
        if (!receiptFile || !onAnalyzeReceipt || isAnalyzingReceipt) {
            return;
        }

        try {
            setIsAnalyzingReceipt(true);
            setReceiptAnalysisMessage(null);

            const result = await onAnalyzeReceipt(receiptFile, receiptAnalysisMode);

            applyReceiptAnalysisResult(result);

            const confidenceText =
                result.confidence !== null && result.confidence !== undefined
                    ? `${Math.round(result.confidence * 100)}%`
                    : null;

            setReceiptAnalysisMessage(
                confidenceText
                    ? t("receipt.analysisCompletedWithConfidence", {
                        confidence: confidenceText,
                    })
                    : t("receipt.analysisCompleted")
            );
        } catch (error) {
            console.error(error);
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
                    amount: Number(amount),
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
        setReceiptFile,

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