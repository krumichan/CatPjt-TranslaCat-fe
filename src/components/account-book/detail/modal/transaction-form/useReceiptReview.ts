import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { AccountBookReceiptAnalysisResponse } from "@/types/accountBook";
import {
    applyReceiptConversion, buildReceiptBatch, canRegisterReceipt, createReceiptReview,
    editReceiptReview, editReceiptPayment, hasValidReceiptSource, receiptSourceKey, selectReceiptReview,
    getOrCreateReceiptBatchAttempt,
    toReceiptCandidate,
    type ReceiptEditableField, type ReceiptReviewItem,
} from "@/utils/account-book/receiptReview";
import type { TransactionFormModalProps } from "./types";

type Props = Pick<TransactionFormModalProps, "onPreviewReceiptConversion" | "onSubmitReceiptBatch" | "onClose">;

export function useReceiptReview(
    { onPreviewReceiptConversion, onSubmitReceiptBatch, onClose }: Props,
    analysisPending = false,
) {
    const t = useTranslations("AccountBook.detail.transactionModal.receipt.review");
    const [items, setItems] = useState<ReceiptReviewItem[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [previewingId, setPreviewingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const batchAttempt = useRef<ReturnType<typeof getOrCreateReceiptBatchAttempt> | null>(null);

    const selectedItems = items.filter((item) => item.selected);
    const canSubmit = !analysisPending && !!onSubmitReceiptBatch && selectedItems.length > 0 && selectedItems.every(canRegisterReceipt);
    const isBusy = isSubmitting || previewingId !== null;

    function applyAnalysis(
        response: AccountBookReceiptAnalysisResponse,
        sourceImageId = "legacy-source",
        analysisRevision = 1,
        sourceFileName = "receipt",
    ) {
        setItems((current) => [
            ...current.filter((item) => item.sourceImageId !== sourceImageId),
            ...createReceiptReview(response, sourceImageId, analysisRevision, sourceFileName),
        ]);
        setWarnings((current) => [...new Set([...current, ...(response.warnings ?? [])])]);
        setError(null);
        batchAttempt.current = null;
    }

    function removeSource(sourceImageId: string) {
        setItems((current) => current.filter((item) => item.sourceImageId !== sourceImageId));
        batchAttempt.current = null;
    }

    function reset() {
        setItems([]);
        setWarnings([]);
        setError(null);
        batchAttempt.current = null;
    }

    function edit(clientId: string, field: ReceiptEditableField, value: string) {
        if (isSubmitting) return;
        setItems((current) => current.map((item) => item.clientId === clientId ? editReceiptReview(item, field, value) : item));
        setError(null);
    }

    function select(clientId: string, selected: boolean) {
        if (isBusy) return;
        setItems((current) => selectReceiptReview(current, clientId, selected));
    }

    function editPayment(clientId: string, index: number, amount: string) {
        if (isSubmitting) return;
        setItems((current) => current.map((item) => item.clientId === clientId
            ? editReceiptPayment(item, index, amount) : item));
        setError(null);
    }

    async function preview(clientId: string) {
        const item = items.find((candidate) => candidate.clientId === clientId);
        if (!item || !hasValidReceiptSource(item) || !onPreviewReceiptConversion || isBusy) return;
        const sourceKey = receiptSourceKey(item);
        setPreviewingId(clientId);
        setError(null);
        try {
            const conversion = await onPreviewReceiptConversion(toReceiptCandidate(item));
            setItems((current) => current.map((candidate) => candidate.clientId === clientId
                ? applyReceiptConversion(candidate, sourceKey, conversion) : candidate));
        } catch {
            setError(t("previewFailed"));
        } finally {
            setPreviewingId(null);
        }
    }

    async function submit() {
        if (!canSubmit || !onSubmitReceiptBatch || isBusy || analysisPending) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const request = buildReceiptBatch(items);
            batchAttempt.current = getOrCreateReceiptBatchAttempt(batchAttempt.current, request);
            await onSubmitReceiptBatch(request, batchAttempt.current.idempotencyKey);
            batchAttempt.current = null;
            onClose();
        } catch {
            // Keep every candidate and selection so the user can correct or retry.
            setError(t("registrationFailed"));
        } finally {
            setIsSubmitting(false);
        }
    }

    return { items, warnings, error, previewingId, isSubmitting, isBusy, selectedCount: selectedItems.length,
        canSubmit, applyAnalysis, removeSource, reset, edit, editPayment, select, preview, submit };
}
