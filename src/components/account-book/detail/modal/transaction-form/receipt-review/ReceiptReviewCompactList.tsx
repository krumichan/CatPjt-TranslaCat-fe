import { useTranslations } from "next-intl";
import { receiptRowClassName } from "@/utils/account-book/receiptReviewPresentation";
import ReceiptReviewCheckbox from "./ReceiptReviewCheckbox";
import ReceiptReviewStatusIcon from "./ReceiptReviewStatusIcon";
import ReceiptInlineTitle from "./ReceiptInlineTitle";
import ReceiptInlineCategory from "./ReceiptInlineCategory";
import { ReceiptInlineAmount } from "./ReceiptInlineAmountCell";
import type { ReceiptReviewContentProps } from "./types";

export default function ReceiptReviewCompactList({ review, controller }: ReceiptReviewContentProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const { hasInlineEdit, openEditor } = controller;

    return (
        <div className="space-y-2" data-testid="receipt-review-compact-list">
            {review.items.map((item, index) => {
                const state = controller.getRowState(item);
                const status = t(state === "PENDING" ? "receipt.review.statusRecalculating"
                    : state === "READY" ? "receipt.review.statusReady" : "receipt.review.statusNeedsReview");
                return (
                    <article key={item.clientId} data-testid="receipt-review-card"
                        className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-1 rounded-xl border border-slate-200 p-2.5 transition dark:border-white/10 ${receiptRowClassName(state)}`}>
                        <ReceiptReviewCheckbox item={item} index={index} review={review} controller={controller} />
                        <div className="min-w-0">
                            <div className="flex min-w-0 items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500">
                                    <span className="shrink-0">{item.transactionDate || "—"}</span>
                                    <span className="min-w-0 truncate" title={item.sourceFileName}>{item.sourceFileName} · r{item.analysisRevision}</span>
                                </div>
                                <button type="button" onClick={(event) => openEditor(item, event.currentTarget)}
                                    disabled={review.isBusy || hasInlineEdit}
                                    className="min-h-6 shrink-0 rounded-md px-1 text-[11px] font-semibold text-orange-700 hover:bg-white/60 dark:text-orange-300 dark:hover:bg-black/20">
                                    {t("receipt.review.reviewEdit")} <span aria-hidden="true">›</span>
                                </button>
                            </div>
                            <ReceiptInlineTitle item={item} index={index} review={review} controller={controller} />
                            {/* 입력 전에는 한 줄 요약, 편집 중에는 해당 필드에 가로 공간을 준다. */}
                            <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2">
                                <div className={controller.amountEdit?.clientId === item.clientId ? "w-full min-w-0" : "min-w-0 max-w-[45%]"}>
                                    <div className="flex min-w-0 items-center gap-1.5">
                                        <span className="shrink-0" title={status}>
                                            <ReceiptReviewStatusIcon state={state} /><span className="sr-only">{status}</span>
                                        </span>
                                        <ReceiptInlineCategory compact item={item} index={index} review={review} controller={controller} />
                                    </div>
                                </div>
                                <div className={controller.amountEdit?.clientId === item.clientId ? "w-full min-w-0" : "min-w-0 max-w-full text-right"}>
                                    <ReceiptInlineAmount compact item={item} index={index} review={review} controller={controller} />
                                </div>
                            </div>

                        </div>
                    </article>
                );
            })}
        </div>
    );
}
