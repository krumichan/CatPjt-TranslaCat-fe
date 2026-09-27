import type { ReceiptReviewController } from "@/hooks/account-book/detail/receipt/useReceiptReview";
import type { ReceiptReviewListController } from "@/hooks/account-book/detail/receipt/useReceiptReviewListController";
import type { CategoryOptionsStatus, ReceiptSourcePreviewItem } from "@/types/accountBookReceiptReview";

export type ReceiptReviewListProps = {
    review: ReceiptReviewController;
    categoryNames: string[];
    categoryStatus: CategoryOptionsStatus;
    onRetryCategories?: () => void;
    onClose: () => void;
    sourcePreviews: ReceiptSourcePreviewItem[];
};

export type ReceiptReviewContentProps = {
    review: ReceiptReviewController;
    controller: ReceiptReviewListController;
};
