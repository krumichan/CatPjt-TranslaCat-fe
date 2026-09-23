import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReceiptAnalysisMode } from "@/types/accountBook";
import type { ReceiptQueueItem } from "@/types/accountBookReceiptReview";
import type { TransactionFormModalProps } from "@/types/accountBookTransactionForm";
import { useReceiptReview } from "./useReceiptReview";

type UseReceiptWorkflowParams = Pick<TransactionFormModalProps, "onAnalyzeReceipt"
    | "onPreviewReceiptConversion"
    | "onSubmitReceiptBatch"
    | "onClose"> & {
        accountBookCurrencyCode: string;
    };
/** Owns receipt uploads, bounded parallel requests and their review results. */

export function useReceiptWorkflow({
    onAnalyzeReceipt,
    onPreviewReceiptConversion,
    onSubmitReceiptBatch,
    onClose,
    accountBookCurrencyCode,
}: UseReceiptWorkflowParams) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const [receiptQueue, setReceiptQueueState] = useState<ReceiptQueueItem[]>([]);
    const receiptQueueRef = useRef<ReceiptQueueItem[]>([]);
    const receiptAnalysisControllers = useRef(new Map<string, AbortController>());

    const replaceQueue = (next: ReceiptQueueItem[]) => {
        receiptQueueRef.current = next;
        setReceiptQueueState(next);
    };

    const updateQueue = (update: (current: ReceiptQueueItem[]) => ReceiptQueueItem[]) => replaceQueue(update(receiptQueueRef.current));
    const [receiptAnalysisMode, setReceiptAnalysisMode] = useState<ReceiptAnalysisMode>("VISION_ONLY");
    useEffect(
        () => () => {
            for (const controller of receiptAnalysisControllers.current.values()) {
                controller.abort();
            }
            receiptAnalysisControllers.current.clear();
        },
        []
    );
    const [receiptAnalysisMessage, setReceiptAnalysisMessage] = useState<string | null>(null);
    const analysisPending = receiptQueue.some((item) => ["queued", "analyzing"].includes(item.status));
    const isAnalyzingReceipt = receiptQueue.some((item) => item.status === "analyzing");
    const receiptReview = useReceiptReview(
        {
            onPreviewReceiptConversion,
            onSubmitReceiptBatch,
            onClose,
            accountBookCurrencyCode
        },
        analysisPending
    );

    const analyzeTargets = async (targets: ReceiptQueueItem[]) => {
        if (!onAnalyzeReceipt || !targets.length || receiptReview.isBusy)
            return;
        let cursor = 0;
        let completed = 0;

        const worker = async () => {
            while (cursor < targets.length) {
                const target = targets[cursor++];
                const live = receiptQueueRef.current.find((item) => item.sourceImageId === target.sourceImageId && item.revision === target.revision);
                if (!live || live.status !== "queued")
                    continue;
                updateQueue((current) => current.map((item) => item.sourceImageId === target.sourceImageId
                    && item.revision === target.revision ? {
                    ...item,
                    status: "analyzing",
                    error: null
                } : item));
                const controller = new AbortController();
                receiptAnalysisControllers.current.set(target.sourceImageId, controller);
                try {
                    const result = await onAnalyzeReceipt(target.file, receiptAnalysisMode, controller.signal);
                    const current = receiptQueueRef.current.find((item) => item.sourceImageId === target.sourceImageId && item.revision === target.revision);
                    if (!current || current.status !== "analyzing")
                        continue;
                    receiptReview.applyAnalysis(
                        result,
                        target.sourceImageId,
                        target.revision,
                        target.file.name
                    );
                    const partial = result.receipts.length === 0
                        || result.receipts.some((receipt) => receipt.status !== "READY");
                    updateQueue((queue) => queue.map((item) => item.sourceImageId === target.sourceImageId
                        && item.revision === target.revision ? {
                        ...item,
                        status: partial ? "partial" : "success",
                        receiptCount: result.receipts.length,
                    } : item));
                    completed += result.receipts.length;
                } catch {
                    const current = receiptQueueRef.current.find((item) => item.sourceImageId === target.sourceImageId && item.revision === target.revision);
                    if (current?.status === "analyzing")
                        updateQueue((queue) => queue.map((item) => item.sourceImageId === target.sourceImageId && item.revision === target.revision
                            ? {
                                ...item,
                                status: "failure",
                                error: t("receipt.analysisFailed")
                            } : item));
                } finally {
                    if (receiptAnalysisControllers.current.get(target.sourceImageId) === controller) {
                        receiptAnalysisControllers.current.delete(target.sourceImageId);
                    }
                }
            }
        };

        setReceiptAnalysisMessage(null);
        await Promise.all(Array.from({ length: Math.min(3, targets.length) }, () => worker()));
        setReceiptAnalysisMessage(t("receipt.review.analysisCompleted", { count: completed }));
    };

    const handleAnalyzeReceipt = async () => {
        await analyzeTargets(receiptQueueRef.current.filter((item) => item.status === "queued"));
    };

    const addReceiptFiles = (files: File[]) => {
        const available = Math.max(0, 10 - receiptQueueRef.current.length);
        const accepted = files.slice(0, available).map((file): ReceiptQueueItem => ({
            sourceImageId: crypto.randomUUID(),
            file,
            previewUrl: typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(file) : "",
            revision: 1,
            status: "queued",
            receiptCount: 0,
            error: null,
        }));
        if (accepted.length)
            updateQueue((current) => [...current, ...accepted]);
        if (files.length > accepted.length)
            setReceiptAnalysisMessage(t("receipt.queueLimit", { count: 10 }));
    };

    const removeReceiptFile = (sourceImageId: string) => {
        receiptAnalysisControllers.current.get(sourceImageId)?.abort();
        receiptAnalysisControllers.current.delete(sourceImageId);
        const target = receiptQueueRef.current.find((item) => item.sourceImageId === sourceImageId);
        if (target?.previewUrl)
            URL.revokeObjectURL(target.previewUrl);
        updateQueue((current) => current.filter((item) => item.sourceImageId !== sourceImageId));
        receiptReview.removeSource(sourceImageId);
    };

    const cancelReceiptAnalysis = (sourceImageId: string) => {
        receiptAnalysisControllers.current.get(sourceImageId)?.abort();
        receiptAnalysisControllers.current.delete(sourceImageId);
        updateQueue((current) => current.map((item) => item.sourceImageId === sourceImageId
            && item.status === "analyzing" ? { ...item, status: "canceled" } : item));
        receiptReview.removeSource(sourceImageId);
    };

    const retryReceiptAnalysis = async (sourceImageId: string) => {
        const target = receiptQueueRef.current.find((item) => item.sourceImageId === sourceImageId && item.status === "failure");
        if (!target)
            return;
        const retry = {
            ...target,
            revision: target.revision + 1,
            status: "queued" as const,
            error: null
        };
        receiptReview.removeSource(sourceImageId);
        updateQueue((current) => current.map((item) => item.sourceImageId === sourceImageId ? retry : item));
        await analyzeTargets([retry]);
    };

    return {
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
        handleAnalyzeReceipt,
    };
}
