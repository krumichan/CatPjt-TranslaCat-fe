import {
    useCallback,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type MouseEvent
} from "react";
import { useTranslations } from "next-intl";
import {
    buildReceiptCategoryOptions,
    classifyReceiptInlineAmountEdit,
    type ReceiptBlockingField,
    type ReceiptReviewItem,
} from "@/utils/account-book/receiptReview";
import { receiptFieldId } from "@/utils/account-book/receiptReviewPresentation";
import type { ReceiptRowState } from "@/types/accountBookReceiptReview";
import type { ReceiptReviewController } from "./useReceiptReview";

type EditorDraft = {
    item: ReceiptReviewItem;
    baseRevision: number;
};

export type ReceiptAmountEdit = {
    clientId: string;
    value: string;
    error: string | null;
};

type Params = {
    review: ReceiptReviewController;
    categoryNames: string[];
};
/** Owns draft editing, source-revision conflicts and inline conversion requests. */

export function useReceiptReviewListController({ review, categoryNames }: Params) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const [viewMode, setViewMode] = useState<"LIST" | "TABLE">(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "LIST" : "TABLE");
    const [draft, setDraft] = useState<EditorDraft | null>(null);
    const [modalConflict, setModalConflict] = useState(false);
    const [amountEdit, setAmountEdit] = useState<ReceiptAmountEdit | null>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);
    const modalRequestToken = useRef(0);
    const validations = new Map(review.items.map((item) => [item.clientId, review.validate(item)]));
    const categoryOptions = useMemo(
        () => buildReceiptCategoryOptions(categoryNames, review.categoryOptions, review.items),
        [categoryNames, review.categoryOptions, review.items]
    );
    const activeCurrent = draft ? review.items.find((item) => item.clientId === draft.item.clientId) : null;
    const activeDraft = activeCurrent ? draft : null;
    const conflicted = Boolean(activeDraft && (activeCurrent?.draftRevision !== activeDraft.baseRevision
        || activeCurrent?.analysisRevision !== activeDraft.item.analysisRevision));
    const hasAmountEdit = Boolean(amountEdit && review.items.some((item) => item.clientId === amountEdit.clientId));
    const closeEditor = useCallback(
        () => {
            modalRequestToken.current += 1;
            setDraft(null);
            setModalConflict(false);
        },
        []
    );

    const openEditor = (item: ReceiptReviewItem, trigger: HTMLElement, field?: ReceiptBlockingField) => {
        returnFocusRef.current = trigger;
        modalRequestToken.current += 1;
        setModalConflict(false);
        setDraft({
            baseRevision: item.draftRevision,
            item: {
                ...item,
                paymentBreakdown: item.paymentBreakdown.map((payment) => ({ ...payment })),
                conversion: { ...item.conversion, warnings: [...item.conversion.warnings] },
                analysisWarnings: [...item.analysisWarnings],
            },
        });
        if (field)
            window.setTimeout(() => document.getElementById(receiptFieldId(item.clientId, field))?.focus(), 50);
    };

    const getRowState = (item: ReceiptReviewItem): ReceiptRowState => {
        if (review.previewingId === item.clientId || amountEdit?.clientId === item.clientId) {
            return "PENDING";
        }
        return validations.get(item.clientId)?.registrable ? "READY" : "NEEDS_REVIEW";
    };

    const beginAmountEdit = (item: ReceiptReviewItem, event: MouseEvent<HTMLElement>) => {
        returnFocusRef.current = event.currentTarget;
        if (classifyReceiptInlineAmountEdit(item).mode === "DETAILS_REQUIRED") {
            openEditor(item, event.currentTarget, "paymentBreakdown");
            return;
        }
        setAmountEdit({
            clientId: item.clientId,
            value: item.originalAmount,
            error: null
        });
    };

    const cancelAmountEdit = () => {
        if (amountEdit)
            review.cancelAmountRecalculation(amountEdit.clientId);
        setAmountEdit(null);
    };

    const applyAmountEdit = async () => {
        if (!amountEdit)
            return;
        const result = await review.recalculateAmount(amountEdit.clientId, amountEdit.value);
        if (result === "APPLIED" || result === "CANCELLED")
            setAmountEdit(null);
        else
            setAmountEdit((current) => current ? {
                ...current,
                error: t(result === "INVALID" ? "receipt.review.inlineAmountInvalid" : "receipt.review.inlineAmountFailed"),
            } : current);
    };

    const amountKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            void applyAmountEdit();
        }
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            cancelAmountEdit();
        }
    };

    const changeAmountEdit = (value: string) => {
        if (amountEdit)
            setAmountEdit({
                ...amountEdit,
                value,
                error: null
            });
    };

    const changeDraft = (item: ReceiptReviewItem) => {
        setDraft((current) => current ? { ...current, item } : current);
    };

    const previewDraft = async (item: ReceiptReviewItem) => {
        const token = ++modalRequestToken.current;
        const next = await review.previewDraft(item);
        if (modalRequestToken.current === token) {
            setDraft((current) => current?.item.clientId === next.clientId
                ? { ...current, item: next } : current);
        }
    };

    const applyDraft = () => {
        if (!activeDraft)
            return;
        if (conflicted || !review.applyDraft(activeDraft.item.clientId, activeDraft.item, activeDraft.baseRevision)) {
            setModalConflict(true);
            return;
        }
        closeEditor();
    };

    return {
        viewMode,
        setViewMode,
        validations,
        categoryOptions,
        activeDraft,
        conflicted,
        modalConflict,
        returnFocusRef,
        amountEdit,
        hasAmountEdit,
        getRowState,
        openEditor,
        closeEditor,
        beginAmountEdit,
        cancelAmountEdit,
        applyAmountEdit,
        amountKeyDown,
        changeAmountEdit,
        changeDraft,
        previewDraft,
        applyDraft,
    };
}

export type ReceiptReviewListController = ReturnType<typeof useReceiptReviewListController>;
