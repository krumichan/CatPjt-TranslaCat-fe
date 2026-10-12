import { useTranslations } from "next-intl";
import type { ReceiptReviewItem } from "@/utils/account-book/receiptReview";
import type { ReceiptReviewContentProps } from "./types";

type Props = ReceiptReviewContentProps & { item: ReceiptReviewItem; index: number };

export default function ReceiptReviewCheckbox({ item, index, review, controller }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal.receipt.review");
    return (
        // 시각적 크기는 16px, 연결된 label의 누르는 영역은 32px로 유지한다.
        <label className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-white/50 dark:hover:bg-black/20">
            <input type="checkbox" checked={item.selected}
                disabled={review.isBusy || controller.hasInlineEdit}
                aria-label={t("selectReceipt", { index: index + 1 })}
                onChange={(event) => review.select(item.clientId, event.target.checked)}
                className="h-4 w-4 cursor-pointer rounded accent-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed" />
        </label>
    );
}
