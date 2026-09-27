import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type {
    AccountBookReceiptAnalysisResponse,
    ReceiptCategoryOption,
    ReceiptCategorySource
} from "@/types/accountBook";
import {
    applyReceiptConversion,
    applyReceiptInlineAmountCorrection,
    buildReceiptBatch,
    completeReceiptReview,
    createManualReceiptReview,
    createReceiptReview,
    editReceiptCategorySelection,
    editReceiptReview,
    editReceiptPayment,
    hasValidReceiptSource,
    receiptSourceKey,
    selectReceiptReview,
    getOrCreateReceiptBatchAttempt,
    selectRegisterableReceiptReviews,
    summarizeReceiptSelection,
    validateReceiptForRegistration,
    toReceiptCandidate,
    type ReceiptEditableField,
    type ReceiptReviewItem,
} from "@/utils/account-book/receiptReview";
import type { TransactionFormModalProps } from "@/types/accountBookTransactionForm";

type Props = Pick<TransactionFormModalProps, "onPreviewReceiptConversion" | "onSubmitReceiptBatch" | "onClose"> & {
    accountBookCurrencyCode: string;
};

export function useReceiptReview(
    {
        onPreviewReceiptConversion,
        onSubmitReceiptBatch,
        onClose,
        accountBookCurrencyCode
    }: Props,
    analysisPending = false
) {
    const t = useTranslations("AccountBook.detail.transactionModal.receipt.review");
    const [items, setItems] = useState<ReceiptReviewItem[]>([]);
    const itemsRef = useRef<ReceiptReviewItem[]>([]);
    const commitItems = (update: (current: ReceiptReviewItem[]) => ReceiptReviewItem[]) => setItems((current) => {
        const next = update(current);
        itemsRef.current = next;
        return next;
    });
    const [categoryOptions, setCategoryOptions] = useState<ReceiptCategoryOption[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [previewingId, setPreviewingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const batchAttempt = useRef<ReturnType<typeof getOrCreateReceiptBatchAttempt> | null>(null);
    const amountRequestVersions = useRef(new Map<string, number>());
    const reviewAssisted = process.env.NEXT_PUBLIC_RECEIPT_REVIEW_ASSISTED === "true";
    const selectionSummary = useMemo(() => summarizeReceiptSelection(items), [items]);
    const canSubmit = !analysisPending && !!onSubmitReceiptBatch
        && selectionSummary.selectedCount > 0 && selectionSummary.blockedCount === 0;
    const isBusy = isSubmitting || previewingId !== null;

    function applyAnalysis(
        response: AccountBookReceiptAnalysisResponse,
        sourceImageId = "legacy-source",
        analysisRevision = 1,
        sourceFileName = "receipt"
    ) {
        const analyzedItems = createReceiptReview(
            response,
            sourceImageId,
            analysisRevision,
            sourceFileName,
            reviewAssisted
        );
        commitItems((current) => [
            ...current.filter((item) => item.sourceImageId !== sourceImageId),
            ...analyzedItems,
        ]);
        setWarnings((current) => [...new Set([...current, ...(response.warnings ?? [])])]);
        setCategoryOptions((current) => {
            const options = new Map(current.map((option) => [option.name.toLocaleLowerCase(), option]));
            for (const option of response.categoryOptions ?? [])
                options.set(option.name.toLocaleLowerCase(), option);
            for (const item of analyzedItems) {
                const name = item.categoryName.trim();
                const key = name.toLocaleLowerCase();
                if (name && !options.has(key))
                    options.set(key, { name, source: item.categorySource });
            }
            return [...options.values()];
        });
        setError(null);
        batchAttempt.current = null;
    }

    function addManualCandidate(
        sourceImageId: string,
        analysisRevision: number,
        sourceFileName: string,
        sourceRegion: number[]
    ) {
        if (!reviewAssisted || isBusy)
            return;
        const item = createManualReceiptReview(
            sourceImageId,
            analysisRevision,
            sourceFileName,
            sourceRegion,
            accountBookCurrencyCode
        );
        commitItems((current) => [...current, item]);
        batchAttempt.current = null;
    }

    function completeReview(clientId: string) {
        if (!reviewAssisted || isBusy)
            return;
        commitItems((current) => current.map((item) => item.clientId === clientId
            ? completeReceiptReview(item) : item));
        batchAttempt.current = null;
    }

    function removeSource(sourceImageId: string) {
        commitItems((current) => current.filter((item) => item.sourceImageId !== sourceImageId));
        batchAttempt.current = null;
    }

    function reset() {
        commitItems(() => []);
        setCategoryOptions([]);
        setWarnings([]);
        setError(null);
        batchAttempt.current = null;
    }

    function edit(clientId: string, field: ReceiptEditableField, value: string) {
        if (isSubmitting)
            return;
        commitItems((current) => current.map((item) => item.clientId === clientId
            ? {
                ...editReceiptReview(item, field, value),
                draftRevision: item.draftRevision + 1
            } : item));
        setError(null);
    }

    function select(clientId: string, selected: boolean) {
        if (isBusy)
            return;
        commitItems((current) => selectReceiptReview(current, clientId, selected));
    }

    function editPayment(clientId: string, index: number, amount: string) {
        if (isSubmitting)
            return;
        commitItems((current) => current.map((item) => item.clientId === clientId
            ? {
                ...editReceiptPayment(item, index, amount),
                draftRevision: item.draftRevision + 1
            } : item));
        setError(null);
    }

    function applyDraft(clientId: string, draft: ReceiptReviewItem, baseRevision = draft.draftRevision): boolean {
        if (isSubmitting || draft.clientId !== clientId)
            return false;
        const currentItem = itemsRef.current.find((item) => item.clientId === clientId);
        if (!currentItem || currentItem.draftRevision !== baseRevision
            || currentItem.analysisRevision !== draft.analysisRevision)
            return false;
        const nextRevision = currentItem.draftRevision + 1;
        commitItems((current) => current.map((item) => item.clientId === clientId
            ? {
                ...draft,
                selected: item.selected,
                draftRevision: nextRevision,
                reviewedRevision: draft.reviewedRevision === baseRevision ? nextRevision : null,
            } : item));
        setError(null);
        batchAttempt.current = null;
        return true;
    }

    function updateCategory(clientId: string, value: string, source: ReceiptCategorySource) {
        if (isSubmitting)
            return;
        commitItems((current) => current.map((item) => item.clientId === clientId
            ? {
                ...editReceiptCategorySelection(item, value, source),
                draftRevision: item.draftRevision + 1
            }
            : item));
        setError(null);
        batchAttempt.current = null;
    }

    function selectRegisterable() {
        if (isBusy)
            return;
        commitItems((current) => selectRegisterableReceiptReviews(current));
        batchAttempt.current = null;
    }

    async function preview(clientId: string) {
        const item = items.find((candidate) => candidate.clientId === clientId);
        if (!item || !hasValidReceiptSource(item) || !onPreviewReceiptConversion || isBusy)
            return;
        const sourceKey = receiptSourceKey(item);
        setPreviewingId(clientId);
        setError(null);
        try {
            const conversion = await onPreviewReceiptConversion(toReceiptCandidate(item));
            commitItems((current) => current.map((candidate) => candidate.clientId === clientId
                ? applyReceiptConversion(candidate, sourceKey, conversion) : candidate));
            return true;
        } catch {
            setError(t("previewFailed"));
            return false;
        } finally {
            setPreviewingId(null);
        }
    }

    function cancelAmountRecalculation(clientId: string) {
        amountRequestVersions.current.set(clientId, (amountRequestVersions.current.get(clientId) ?? 0) + 1);
        setPreviewingId((current) => current === clientId ? null : current);
    }

    async function recalculateAmount(clientId: string, value: string): Promise<"APPLIED" | "INVALID" | "FAILED" | "CANCELLED" | "DETAILS_REQUIRED"> {
        const item = itemsRef.current.find((candidate) => candidate.clientId === clientId);
        if (!item || isBusy || !onPreviewReceiptConversion)
            return "FAILED";
        const corrected = applyReceiptInlineAmountCorrection(item, value);
        if (!corrected)
            return "DETAILS_REQUIRED";
        const changed = { ...corrected, draftRevision: item.draftRevision + 1 };
        batchAttempt.current = null;
        if (!hasValidReceiptSource(changed))
            return "INVALID";
        const previousSourceKey = receiptSourceKey(item);
        const sourceKey = receiptSourceKey(changed);
        const requestVersion = (amountRequestVersions.current.get(clientId) ?? 0) + 1;
        amountRequestVersions.current.set(clientId, requestVersion);
        setPreviewingId(clientId);
        setError(null);
        try {
            const conversion = await onPreviewReceiptConversion(toReceiptCandidate(changed));
            if (amountRequestVersions.current.get(clientId) !== requestVersion)
                return "CANCELLED";
            const currentItem = itemsRef.current.find((candidate) => candidate.clientId === clientId);
            if (!currentItem || currentItem.draftRevision !== item.draftRevision
                || receiptSourceKey(currentItem) !== previousSourceKey)
                return "FAILED";
            const converted = applyReceiptConversion({ ...changed, selected: currentItem.selected }, sourceKey, conversion);
            commitItems((current) => current.map((candidate) => {
                if (candidate.clientId !== clientId
                    || candidate.draftRevision !== item.draftRevision
                    || receiptSourceKey(candidate) !== previousSourceKey)
                    return candidate;

                return { ...converted, selected: candidate.selected };
            }));
            return "APPLIED";
        } catch {
            setError(t("previewFailed"));
            return "FAILED";
        } finally {
            if (amountRequestVersions.current.get(clientId) === requestVersion)
                setPreviewingId((current) => current === clientId ? null : current);
        }
    }

    async function previewDraft(item: ReceiptReviewItem): Promise<ReceiptReviewItem> {
        if (!hasValidReceiptSource(item) || !onPreviewReceiptConversion || isBusy)
            return item;
        const sourceKey = receiptSourceKey(item);
        setPreviewingId(item.clientId);
        setError(null);
        try {
            const conversion = await onPreviewReceiptConversion(toReceiptCandidate(item));
            return applyReceiptConversion(item, sourceKey, conversion);
        } catch {
            setError(t("previewFailed"));
            return item;
        } finally {
            setPreviewingId(null);
        }
    }

    async function submit() {
        if (!canSubmit || !onSubmitReceiptBatch || isBusy || analysisPending)
            return;
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

    return {
        items,
        warnings,
        categoryOptions,
        error,
        previewingId,
        isSubmitting,
        isBusy,
        selectedCount: selectionSummary.selectedCount,
        selectionSummary,
        canSubmit,
        reviewAssisted,
        applyAnalysis,
        addManualCandidate,
        completeReview,
        removeSource,
        reset,
        edit,
        editPayment,
        applyDraft,
        updateCategory,
        recalculateAmount,
        cancelAmountRecalculation,
        select,
        selectRegisterable,
        preview,
        previewDraft,
        submit,
        validate: validateReceiptForRegistration
    };
}

export type ReceiptReviewController = ReturnType<typeof useReceiptReview>;
