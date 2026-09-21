import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AccountBookReceiptAnalysisResponse } from "@/types/accountBook";
import {
    applyReceiptConversion, buildReceiptBatch, canRegisterReceipt, createReceiptReview,
    editReceiptReview, hasValidReceiptSource, receiptSourceKey, selectReceiptReview,
    toReceiptCandidate,
    type ReceiptEditableField, type ReceiptReviewItem,
} from "@/utils/account-book/receiptReview";
import type { TransactionFormModalProps } from "./types";

type Props = Pick<TransactionFormModalProps, "onPreviewReceiptConversion" | "onSubmitReceiptBatch" | "onClose">;

export function useReceiptReview({ onPreviewReceiptConversion, onSubmitReceiptBatch, onClose }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal.receipt.review");
    const [items, setItems] = useState<ReceiptReviewItem[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [previewingId, setPreviewingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedItems = items.filter((item) => item.selected);
    const canSubmit = !!onSubmitReceiptBatch && selectedItems.length > 0 && selectedItems.every(canRegisterReceipt);
    const isBusy = isSubmitting || previewingId !== null;

    function applyAnalysis(response: AccountBookReceiptAnalysisResponse) {
        setItems(createReceiptReview(response));
        setWarnings(response.warnings ?? []);
        setError(null);
    }

    function reset() {
        setItems([]);
        setWarnings([]);
        setError(null);
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
        if (!canSubmit || !onSubmitReceiptBatch || isBusy) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmitReceiptBatch(buildReceiptBatch(items));
            onClose();
        } catch {
            // Keep every candidate and selection so the user can correct or retry.
            setError(t("registrationFailed"));
        } finally {
            setIsSubmitting(false);
        }
    }

    return { items, warnings, error, previewingId, isSubmitting, isBusy, selectedCount: selectedItems.length,
        canSubmit, applyAnalysis, reset, edit, select, preview, submit };
}
