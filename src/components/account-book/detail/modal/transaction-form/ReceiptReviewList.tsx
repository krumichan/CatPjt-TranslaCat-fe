import { useTranslations } from "next-intl";
import ReceiptReviewHeader from "./receipt-review/ReceiptReviewHeader";
import ReceiptReviewTable from "./receipt-review/ReceiptReviewTable";
import ReceiptReviewCompactList from "./receipt-review/ReceiptReviewCompactList";
import ReceiptReviewSelectionIssues from "./receipt-review/ReceiptReviewSelectionIssues";
import ReceiptReviewFooter from "./receipt-review/ReceiptReviewFooter";
import ReceiptReviewEditor from "./receipt-review/ReceiptReviewEditor";
import type { ReceiptReviewContentProps, ReceiptReviewListProps } from "./receipt-review/types";

type Props = ReceiptReviewListProps & ReceiptReviewContentProps;

/** Presentation only; editing and request orchestration live in the controller. */
export default function ReceiptReviewList({
    review,
    controller,
    categoryStatus,
    onRetryCategories,
    onClose,
    sourcePreviews,
}: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");

    return (
        <section
            id="receipt-review-list"
            tabIndex={-1}
            className="flex min-h-0 min-w-0 flex-1 flex-col"
            aria-label={t("receipt.review.title")}
            data-testid="receipt-review-list"
        >
            <ReceiptReviewHeader
                review={review}
                controller={controller}
            />
            <div
                className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain py-4 pr-1"
                data-testid="receipt-review-scroll-body"
            >
                {controller.viewMode === "TABLE" ? (
                    <ReceiptReviewTable
                        review={review}
                        controller={controller}
                    />
                ) : (
                    <ReceiptReviewCompactList
                        review={review}
                        controller={controller}
                    />
                )}
                <ReceiptReviewSelectionIssues
                    review={review}
                    controller={controller}
                />
                {review.error && (
                    <p
                        role="alert"
                        className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
                    >
                        {review.error}
                    </p>
                )}
            </div>
            <ReceiptReviewFooter
                review={review}
                controller={controller}
                onClose={onClose}
            />
            <ReceiptReviewEditor
                review={review}
                controller={controller}
                categoryStatus={categoryStatus}
                onRetryCategories={onRetryCategories}
                sourcePreviews={sourcePreviews}
            />
        </section>
    );
}
