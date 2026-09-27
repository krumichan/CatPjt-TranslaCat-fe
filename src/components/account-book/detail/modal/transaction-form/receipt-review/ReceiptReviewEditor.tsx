import { useTranslations } from "next-intl";
import ReceiptReviewModal from "../ReceiptReviewModal";
import ReceiptReviewCard from "../ReceiptReviewCard";
import type { ReceiptReviewContentProps, ReceiptReviewListProps } from "./types";

type Props = ReceiptReviewContentProps & Pick<
    ReceiptReviewListProps, "categoryStatus" | "onRetryCategories" | "sourcePreviews"
>;

export default function ReceiptReviewEditor({
    review,
    controller,
    categoryStatus,
    onRetryCategories,
    sourcePreviews,
}: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const {
        activeDraft,
        conflicted,
        modalConflict,
        categoryOptions,
        returnFocusRef
    } = controller;
    if (!activeDraft)
        return null;
    const index = review.items.findIndex((item) => item.clientId === activeDraft.item.clientId);
    const source = sourcePreviews.find((item) => item.sourceImageId === activeDraft.item.sourceImageId);

    return (
        <ReceiptReviewModal
            title={t("receipt.review.editTitle", { index: index + 1 })}
            returnFocusRef={returnFocusRef}
            onClose={controller.closeEditor}
        >
            {(conflicted || modalConflict) && (
                <p
                    role="alert"
                    className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300"
                >
                    {t("receipt.review.revisionConflict")}
                </p>
            )}
            <ReceiptReviewCard
                item={activeDraft.item}
                index={index}
                categoryOptions={categoryOptions}
                categoryStatus={categoryStatus}
                disabled={review.isBusy}
                sourcePreviewUrl={source?.previewUrl}
                previewing={review.previewingId === activeDraft.item.clientId}
                validation={review.validate(activeDraft.item)}
                onChange={controller.changeDraft}
                onPreview={controller.previewDraft}
                onApply={controller.applyDraft}
                onCancel={controller.closeEditor}
                onRetryCategories={onRetryCategories}
                applyDisabled={conflicted || modalConflict}
            />
        </ReceiptReviewModal>
    );
}
