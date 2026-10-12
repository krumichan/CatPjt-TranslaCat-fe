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

type ReceiptTitleEdit = ReceiptAmountEdit & {
    originalTitle: string;
    analysisRevision: number;
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
    const [titleEdit, setTitleEdit] = useState<ReceiptTitleEdit | null>(null);
    const amountEditToken = useRef(0);
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
    const hasTitleEdit = Boolean(titleEdit && review.items.some((item) => item.clientId === titleEdit.clientId));
    const hasInlineEdit = hasAmountEdit || hasTitleEdit;
    const closeEditor = useCallback(
        () => {
            modalRequestToken.current += 1;
            setDraft(null);
            setModalConflict(false);
        },
        []
    );

    const openEditor = (item: ReceiptReviewItem, trigger: HTMLElement, field?: ReceiptBlockingField) => {
        review.clearError();
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
            window.setTimeout(() => {
                const target = document.getElementById(receiptFieldId(item.clientId, field));
                const details = target?.closest("details");
                if (details) details.open = true;
                target?.focus();
            }, 50);
    };

    const getRowState = (item: ReceiptReviewItem): ReceiptRowState => {
        if (review.previewingId === item.clientId || amountEdit?.clientId === item.clientId || titleEdit?.clientId === item.clientId) {
            return "PENDING";
        }
        return validations.get(item.clientId)?.registrable ? "READY" : "NEEDS_REVIEW";
    };

    // 이름만 수정한다. 동일 항목의 새 분석/다른 이름 변경을 덮어쓰지 않는다.
    const beginTitleEdit = (item: ReceiptReviewItem) => {
        if (review.isBusy || hasInlineEdit)
            return;
        setTitleEdit({ clientId: item.clientId, value: item.title, originalTitle: item.title,
            analysisRevision: item.analysisRevision, error: null });
    };

    const cancelTitleEdit = () => setTitleEdit(null);
    const changeTitleEdit = (value: string) => setTitleEdit((current) => current ? { ...current, value, error: null } : current);
    const applyTitleEdit = () => {
        if (!titleEdit || review.isBusy)
            return;
        const current = review.items.find((item) => item.clientId === titleEdit.clientId);
        if (!current || current.analysisRevision !== titleEdit.analysisRevision || current.title !== titleEdit.originalTitle) {
            setTitleEdit({ ...titleEdit, error: t("receipt.review.inlineTitleConflict") });
            return;
        }
        const value = titleEdit.value.trim();
        const issue = review.validate({ ...current, title: value }).blockingIssues.find((candidate) => candidate.field === "title");
        if (issue) {
            setTitleEdit({ ...titleEdit, error: t(`receipt.review.blockingIssues.${issue.code}`) });
            return;
        }
        // 필드 단위 변경으로 최신 카테고리·메모·환율 quote를 보존한다.
        if (value !== current.title)
            review.edit(current.clientId, "title", value);
        setTitleEdit(null);
    };

    const titleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229)
            return;
        if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (event.key === "Enter")
                applyTitleEdit();
            else
                cancelTitleEdit();
        }
    };

    const beginAmountEdit = (item: ReceiptReviewItem, event: MouseEvent<HTMLElement>) => {
        if (review.isBusy || hasInlineEdit)
            return;
        amountEditToken.current += 1;
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
        amountEditToken.current += 1;
        if (amountEdit)
            review.cancelAmountRecalculation(amountEdit.clientId);
        setAmountEdit(null);
    };

    const applyAmountEdit = async () => {
        if (!amountEdit || review.isBusy)
            return;
        const token = amountEditToken.current;
        const result = await review.recalculateAmount(amountEdit.clientId, amountEdit.value);
        // 취소 후 다른 편집을 시작했다면 이전 응답이 그 입력을 닫지 않게 한다.
        if (token !== amountEditToken.current)
            return;
        if (result === "APPLIED" || result === "CANCELLED")
            setAmountEdit(null);
        else
            setAmountEdit((current) => current ? {
                ...current,
                error: t(result === "INVALID" ? "receipt.review.inlineAmountInvalid" : "receipt.review.inlineAmountFailed"),
            } : current);
    };

    const amountKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229)
            return;
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
        const next = await review.previewDraft(item, () => modalRequestToken.current === token);
        if (modalRequestToken.current === token) {
            setDraft((current) => current?.item.clientId === next.clientId
                ? { ...current, item: next } : current);
        }
    };

    const applyDraft = () => {
        if (!activeDraft || review.isBusy
            || review.validate(activeDraft.item).blockingIssues.some((issue) => issue.field === "conversion"))
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
        hasTitleEdit,
        hasInlineEdit,
        titleEdit,
        beginTitleEdit,
        changeTitleEdit,
        applyTitleEdit,
        cancelTitleEdit,
        titleKeyDown,
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
