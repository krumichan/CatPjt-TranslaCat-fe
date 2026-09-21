import { SyntheticEvent, useMemo, useRef, useState } from "react";
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

    type QueueStatus = "queued" | "analyzing" | "success" | "partial" | "failure" | "canceled";
    type ReceiptQueueItem = {
        sourceImageId: string; file: File; previewUrl: string; revision: number;
        status: QueueStatus; receiptCount: number; error: string | null;
    };
    const [receiptQueue, setReceiptQueueState] = useState<ReceiptQueueItem[]>([]);
    const receiptQueueRef = useRef<ReceiptQueueItem[]>([]);
    const replaceQueue = (next: ReceiptQueueItem[]) => {
        receiptQueueRef.current = next;
        setReceiptQueueState(next);
    };
    const updateQueue = (update: (current: ReceiptQueueItem[]) => ReceiptQueueItem[]) =>
        replaceQueue(update(receiptQueueRef.current));

    const [receiptAnalysisMode, setReceiptAnalysisMode] =
        useState<ReceiptAnalysisMode>("VISION_FIRST");

    const [receiptAnalysisMessage, setReceiptAnalysisMessage] =
        useState<string | null>(null);

    const analysisPending = receiptQueue.some((item) => ["queued", "analyzing"].includes(item.status));
    const isAnalyzingReceipt = receiptQueue.some((item) => item.status === "analyzing");
    const receiptReview = useReceiptReview(
        { onPreviewReceiptConversion, onSubmitReceiptBatch, onClose }, analysisPending,
    );

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

    const analyzeTargets = async (targets: ReceiptQueueItem[]) => {
        if (!onAnalyzeReceipt || !targets.length || receiptReview.isBusy) return;
        let cursor = 0;
        let completed = 0;
        const worker = async () => {
            while (cursor < targets.length) {
                const target = targets[cursor++];
                const live = receiptQueueRef.current.find((item) =>
                    item.sourceImageId === target.sourceImageId && item.revision === target.revision);
                if (!live || live.status !== "queued") continue;
                updateQueue((current) => current.map((item) => item.sourceImageId === target.sourceImageId
                    && item.revision === target.revision ? { ...item, status: "analyzing", error: null } : item));
                try {
                    const result = await onAnalyzeReceipt(target.file, receiptAnalysisMode);
                    const current = receiptQueueRef.current.find((item) =>
                        item.sourceImageId === target.sourceImageId && item.revision === target.revision);
                    if (!current || current.status !== "analyzing") continue;
                    receiptReview.applyAnalysis(result, target.sourceImageId, target.revision, target.file.name);
                    const partial = result.receipts.length === 0
                        || result.receipts.some((receipt) => receipt.status !== "READY");
                    updateQueue((queue) => queue.map((item) => item.sourceImageId === target.sourceImageId
                        && item.revision === target.revision ? {
                            ...item, status: partial ? "partial" : "success",
                            receiptCount: result.receipts.length,
                        } : item));
                    completed += result.receipts.length;
                } catch {
                    const current = receiptQueueRef.current.find((item) =>
                        item.sourceImageId === target.sourceImageId && item.revision === target.revision);
                    if (current?.status === "analyzing") updateQueue((queue) => queue.map((item) =>
                        item.sourceImageId === target.sourceImageId && item.revision === target.revision
                            ? { ...item, status: "failure", error: t("receipt.analysisFailed") } : item));
                }
            }
        };
        setReceiptAnalysisMessage(null);
        await Promise.all(Array.from({ length: Math.min(2, targets.length) }, () => worker()));
        setReceiptAnalysisMessage(t("receipt.review.analysisCompleted", { count: completed }));
    };

    const handleAnalyzeReceipt = async () => {
        await analyzeTargets(receiptQueueRef.current.filter((item) => item.status === "queued"));
    };

    const addReceiptFiles = (files: File[]) => {
        const available = Math.max(0, 10 - receiptQueueRef.current.length);
        const accepted = files.slice(0, available).map((file): ReceiptQueueItem => ({
            sourceImageId: crypto.randomUUID(), file,
            previewUrl: typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(file) : "",
            revision: 1, status: "queued", receiptCount: 0, error: null,
        }));
        if (accepted.length) updateQueue((current) => [...current, ...accepted]);
        if (files.length > accepted.length) setReceiptAnalysisMessage(t("receipt.queueLimit", { count: 10 }));
    };

    const removeReceiptFile = (sourceImageId: string) => {
        const target = receiptQueueRef.current.find((item) => item.sourceImageId === sourceImageId);
        if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
        updateQueue((current) => current.filter((item) => item.sourceImageId !== sourceImageId));
        receiptReview.removeSource(sourceImageId);
    };

    const cancelReceiptAnalysis = (sourceImageId: string) => {
        updateQueue((current) => current.map((item) => item.sourceImageId === sourceImageId
            && item.status === "analyzing" ? { ...item, status: "canceled" } : item));
        receiptReview.removeSource(sourceImageId);
    };

    const retryReceiptAnalysis = async (sourceImageId: string) => {
        const target = receiptQueueRef.current.find((item) =>
            item.sourceImageId === sourceImageId && item.status === "failure");
        if (!target) return;
        const retry = { ...target, revision: target.revision + 1, status: "queued" as const, error: null };
        receiptReview.removeSource(sourceImageId);
        updateQueue((current) => current.map((item) => item.sourceImageId === sourceImageId ? retry : item));
        await analyzeTargets([retry]);
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

        receiptQueue,
        addReceiptFiles,
        removeReceiptFile,
        cancelReceiptAnalysis,
        retryReceiptAnalysis,
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
