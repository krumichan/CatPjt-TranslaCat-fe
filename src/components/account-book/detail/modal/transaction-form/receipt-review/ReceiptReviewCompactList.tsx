import { useTranslations } from "next-intl";
import type { ReceiptReviewItem } from "@/utils/account-book/receiptReview";
import { receiptRowClassName } from "@/utils/account-book/receiptReviewPresentation";
import ReceiptReviewStatusIcon from "./ReceiptReviewStatusIcon";
import type { ReceiptReviewContentProps } from "./types";

export default function ReceiptReviewCompactList({ review, controller }: ReceiptReviewContentProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const { hasAmountEdit, openEditor } = controller;

    const renderStatus = (item: ReceiptReviewItem) => {
        const state = controller.getRowState(item);
        return t(state === "PENDING" ? "receipt.review.statusRecalculating"
            : state === "READY" ? "receipt.review.statusReady" : "receipt.review.statusNeedsReview");
    };

    return (
        <div
            className="space-y-2"
            data-testid="receipt-review-compact-list"
        >
            {review.items.map((item, index) => (
                <article
                    key={item.clientId}
                    data-testid="receipt-review-card"
                    className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:brightness-[0.98] dark:border-white/10 dark:hover:brightness-110 ${receiptRowClassName(controller.getRowState(item))}`}
                >
                    <input
                        type="checkbox"
                        checked={item.selected}
                        disabled={review.isBusy || hasAmountEdit}
                        aria-label={t("receipt.review.selectReceipt", { index: index + 1 })}
                        onChange={(event) => review.select(item.clientId, event.target.checked)}
                        className="mt-1 h-5 w-5 accent-orange-500"
                    />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                            {item.title || "—"}
                        </p>
                        <p className="truncate text-xs text-slate-500">{item.sourceFileName} · r{item.analysisRevision} · {item.transactionDate || "—"} · {item.categoryName || t("receipt.review.unselected")}</p>
                        <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-700 dark:text-slate-200"><ReceiptReviewStatusIcon state={controller.getRowState(item)} />{item.conversion.convertedAmount ?? "—"} {item.conversion.accountBookCurrencyCode} · {renderStatus(item)}</p>
                    </div>
                    <button
                        type="button"
                        onClick={(event) => openEditor(item, event.currentTarget)}
                        className="rounded-lg border border-orange-300 px-2.5 py-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300"
                    >
                        {t("receipt.review.reviewEdit")}
                    </button>
                </article>
            ))}
        </div>
    );
}
