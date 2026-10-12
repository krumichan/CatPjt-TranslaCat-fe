import { useTranslations } from "next-intl";
import type { ReceiptReviewItem } from "@/utils/account-book/receiptReview";
import { receiptRowClassName } from "@/utils/account-book/receiptReviewPresentation";
import ReceiptInlineTitle from "./ReceiptInlineTitle";
import ReceiptInlineCategory from "./ReceiptInlineCategory";
import { ReceiptInlineAmount } from "./ReceiptInlineAmountCell";
import ReceiptReviewStatusIcon from "./ReceiptReviewStatusIcon";
import ReceiptReviewCheckbox from "./ReceiptReviewCheckbox";
import ReceiptRowActionMenu from "./ReceiptRowActionMenu";
import type { ReceiptReviewContentProps } from "./types";

type Props = ReceiptReviewContentProps & { item: ReceiptReviewItem; index: number };

export default function ReceiptReviewTableRow({ item, index, review, controller }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal.receipt.review");
    const state = controller.getRowState(item);
    const status = t(state === "PENDING" ? "statusRecalculating" : state === "READY" ? "statusReady" : "statusNeedsReview");
    return (
        <tr data-testid="receipt-review-card"
            className={`${receiptRowClassName(state)} transition hover:brightness-[0.98] dark:hover:brightness-110`}>
            <td className="px-1 py-3">
                <ReceiptReviewCheckbox item={item} index={index} review={review} controller={controller} />
            </td>
            <td className="min-w-0 px-3 py-3">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    {item.transactionDate || "—"}
                    <span title={status} className="inline-flex"><ReceiptReviewStatusIcon state={state} /><span className="sr-only">{status}</span></span>
                </span>
                <ReceiptInlineTitle item={item} index={index} review={review} controller={controller} />
                <span className="block truncate text-[10px] text-slate-500" title={item.sourceFileName}>{item.sourceFileName} · r{item.analysisRevision}</span>
            </td>
            <td className="px-2 py-3">
                <ReceiptInlineCategory item={item} index={index} review={review} controller={controller} />
            </td>
            {/* 상태/작업 전용 열 없이 기본정보의 상태 아이콘과 금액 옆 점 메뉴로 표시한다. */}
            <td className="px-2 py-3 text-right">
                <div className="flex min-w-0 items-center justify-end gap-1">
                    <div className="min-w-0 flex-1"><ReceiptInlineAmount item={item} index={index} review={review} controller={controller} /></div>
                    <ReceiptRowActionMenu index={index} disabled={review.isBusy || controller.hasInlineEdit}
                        onEdit={(trigger) => controller.openEditor(item, trigger)} />
                </div>
            </td>
        </tr>
    );
}
