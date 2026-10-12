import { useTranslations } from "next-intl";
import ReceiptReviewTableRow from "./ReceiptReviewTableRow";
import type { ReceiptReviewContentProps } from "./types";

export default function ReceiptReviewTable({ review, controller }: ReceiptReviewContentProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    return (
        <div
            className="max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 dark:border-white/10"
            data-testid="receipt-review-table-scroll"
        >
            <table className="min-w-160 w-full table-fixed border-collapse text-sm">
                <thead className="bg-slate-100 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    <tr>
                        <th className="w-10 px-1 py-2 text-left">
                            <span className="sr-only">{t("receipt.review.columns.select")}</span>
                        </th>
                        <th className="px-3 py-2 text-left">
                            {t("receipt.review.columns.basicInfo")}
                        </th>
                        <th className="w-36 px-2 py-2 text-left">
                            {t("receipt.review.columns.category")}
                        </th>
                        <th className="w-60 px-2 py-2 text-right">
                            {t("receipt.review.columns.amount")}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                    {review.items.map((item, index) => (
                        <ReceiptReviewTableRow
                            key={item.clientId}
                            item={item}
                            index={index}
                            review={review}
                            controller={controller}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
